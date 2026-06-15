const Project = require('../models/Project');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'];

const normalizeCurrency = (currency) => {
  const normalized = String(currency || '').trim().toUpperCase();
  if (normalized === 'EGY') return 'EGP';
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : 'EGP';
};

const normalizeBudgets = (budgets, totalBudget = 0) => {
  const normalized = {};
  if (budgets && typeof budgets === 'object') {
    Object.entries(budgets).forEach(([currency, amount]) => {
      const value = Number(amount);
      if (value > 0) {
        const code = normalizeCurrency(currency);
        normalized[code] = (normalized[code] || 0) + value;
      }
    });
  }
  if (Object.keys(normalized).length === 0 && Number(totalBudget) > 0) {
    normalized.EGP = Number(totalBudget);
  }
  return normalized;
};

// Helper function to format image URLs with full host
const formatProjectImages = (project, host) => {
  const obj = project.toObject ? project.toObject({ flattenMaps: true }) : project;

  // 1) Project images
  if (obj.images && Array.isArray(obj.images)) {
    obj.images = obj.images.map(img => (img.startsWith('http') ? img : `${host}${img}`));
  }

  // 2) Populated Company logo
  if (obj.companyId && typeof obj.companyId === 'object' && obj.companyId.logo) {
    if (!obj.companyId.logo.startsWith('http')) {
      obj.companyId.logo = `${host}${obj.companyId.logo}`;
    }
  }

  // 3) Populated Contracts images
  if (obj.contracts && Array.isArray(obj.contracts)) {
    obj.contracts = obj.contracts.map(contract => {
      const cObj = contract.toObject ? contract.toObject({ flattenMaps: true }) : contract;
      if (cObj.images && Array.isArray(cObj.images)) {
        cObj.images = cObj.images.map(img => (img.startsWith('http') ? img : `${host}${img}`));
      }
      return cObj;
    });
  }

  return obj;
};

exports.getAllProjects = catchAsync(async (req, res, next) => {
  // مزامنة حالة المشاريع المكتملة (نسبة الإنجاز 100%)
  await Project.updateMany(
    { completionPercentage: { $gte: 100 }, status: { $ne: 'مكتمل' } },
    { $set: { status: 'مكتمل', completionPercentage: 100 } }
  );

  // تحديث المشاريع المتأخرة تلقائياً
  await Project.updateMany(
    {
      endDate: { $exists: true, $ne: null, $lt: new Date() },
      status: { $ne: 'مكتمل' },
      completionPercentage: { $lt: 100 }
    },
    {
      $set: { status: 'متأخر' }
    }
  );

  // نسخ الـ query params
  const queryObj = { ...req.query };

  // حذف الحقول الفاضية
  Object.keys(queryObj).forEach(key => {
    if (
      queryObj[key] === '' ||
      queryObj[key] === null ||
      queryObj[key] === undefined
    ) {
      delete queryObj[key];
    }
  });

  // حذف الحقول الخاصة بالـ pagination
  const excludedFields = ['page', 'sort', 'limit', 'fields'];

  excludedFields.forEach(el => delete queryObj[el]);

  // ── Only return approved projects for general listing
  // unless the requesting user is the creator (they see their own pending projects)
  const userId = req.user?._id?.toString();
  const isAdmin = ['Admin'].includes(req.user?.role);

  // Build approval filter: admins see all, others see approved + their own pending
  let approvalFilter;
  if (isAdmin) {
    approvalFilter = {}; // Admins see everything
  } else {
    approvalFilter = {
      $or: [
        { approvalStatus: 'approved' },
        { createdBy: req.user._id } // user sees their own pending too
      ]
    };
  }

  // Query
  const projects = await Project.find({ ...queryObj, ...approvalFilter })
    .populate('sectorId')
    .populate('createdBy', 'name')
    .populate('companyId')
    .populate({
      path: 'funding',
      populate: { path: 'transactions' }
    })
    .populate('contracts');

  const host = `${req.protocol}://${req.get('host')}`;
  const formattedProjects = projects.map(proj => formatProjectImages(proj, host));

  res.status(200).json({
    status: 'success',
    results: formattedProjects.length,
    data: {
      projects: formattedProjects
    }
  });
});

exports.createProject = catchAsync(async (req, res, next) => {
  if (!req.body.createdBy) req.body.createdBy = req.user.id;
  req.body.budgets = normalizeBudgets(req.body.budgets, req.body.totalBudget);
  // New projects always start as pending — user must self-approve
  req.body.approvalStatus = 'pending';
  
  const newProject = await Project.create(req.body);
  const host = `${req.protocol}://${req.get('host')}`;

  res.status(201).json({
    status: 'success',
    data: {
      project: formatProjectImages(newProject, host)
    }
  });
});

exports.getProject = catchAsync(async (req, res, next) => {
  await Project.findOneAndUpdate(
    {
      _id: req.params.id,
      completionPercentage: { $gte: 100 },
      status: { $ne: 'مكتمل' }
    },
    { $set: { status: 'مكتمل', completionPercentage: 100 } }
  );

  // Update status if overdue before fetching
  await Project.findOneAndUpdate(
    {
      _id: req.params.id,
      endDate: { $exists: true, $ne: null, $lt: new Date() },
      status: { $ne: 'مكتمل' },
      completionPercentage: { $lt: 100 }
    },
    { $set: { status: 'متأخر' } }
  );

  const project = await Project.findById(req.params.id)
    .populate('sectorId')
    .populate('createdBy', 'name')
    .populate('companyId')
    .populate({
      path: 'funding',
      populate: { path: 'transactions' }
    })
    .populate('contracts'); // 👈 ده الجديد

  if (!project) {
    return next(new AppError('No project found with that ID', 404));
  }

  const host = `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    status: 'success',
    data: {
      project: formatProjectImages(project, host)
    }
  });
});

exports.updateProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('No project found with that ID', 404));
  }

  // Object.assign updates the document with the new fields
  const updateData = { ...req.body };
  if (updateData.budgets || updateData.totalBudget) {
    updateData.budgets = normalizeBudgets(updateData.budgets, updateData.totalBudget || project.totalBudget);
  }
  Object.assign(project, updateData);
  await project.save();

  const host = `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    status: 'success',
    data: {
      project: formatProjectImages(project, host)
    }
  });
});

exports.deleteProject = catchAsync(async (req, res, next) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) {
    return next(new AppError('No project found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ─── Approve Project (self-review workflow) ───────────────────────────────────
// Only the creator of the project (or Admin) can approve it
exports.approveProject = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('لم يتم العثور على المشروع', 404));
  }

  // Only creator or Admin can approve
  const isAdmin = req.user.role === 'Admin';
  const isCreator = project.createdBy.toString() === req.user._id.toString();

  if (!isAdmin && !isCreator) {
    return next(new AppError('لا تملك صلاحية اعتماد هذا المشروع', 403));
  }

  project.approvalStatus = 'approved';
  project.approvedAt = new Date();
  await project.save();

  const host = `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    status: 'success',
    message: 'تم اعتماد المشروع بنجاح',
    data: {
      project: formatProjectImages(project, host)
    }
  });
});

// ─── Get My Pending Projects (for self-review tab) ───────────────────────────
exports.getMyPendingProjects = catchAsync(async (req, res, next) => {
  const projects = await Project.find({
    createdBy: req.user._id,
    approvalStatus: 'pending'
  })
    .populate('sectorId')
    .populate('createdBy', 'name')
    .populate('companyId');

  const host = `${req.protocol}://${req.get('host')}`;
  const formattedProjects = projects.map(proj => formatProjectImages(proj, host));

  res.status(200).json({
    status: 'success',
    results: formattedProjects.length,
    data: {
      projects: formattedProjects
    }
  });
});

exports.formatProjectImages = formatProjectImages;
