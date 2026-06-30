const ContractSubmission = require('../models/ContractSubmission');
const ExpenseSubmission = require('../models/ExpenseSubmission');
const FundingSubmission = require('../models/FundingSubmission');
const ProgressSubmission = require('../models/ProgressSubmission');
const TransactionSubmission = require('../models/TransactionSubmission');
const Contract = require('../models/Contract');
const Expense = require('../models/Expense');
const ProjectFunding = require('../models/ProjectFunding');
const Project = require('../models/Project');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'];

const normalizeCurrency = (currency) => {
  const normalized = String(currency || '').trim().toUpperCase();
  if (normalized === 'EGY') return 'EGP';
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : 'EGP';
};

const projectHasCurrencyBudget = (project, currency) => {
  if (!project.budgets || project.budgets.size === 0) {
    return currency === 'EGP' && Number(project.totalBudget) > 0;
  }
  return project.budgets.has(currency) && Number(project.budgets.get(currency)) > 0;
};

const models = {
  contract: ContractSubmission,
  expense: ExpenseSubmission,
  funding: FundingSubmission,
  progress: ProgressSubmission,
  transaction: TransactionSubmission
};

const normalizeCategory = (cat) => {
  if (!cat) return cat;
  const mapping = {
    'مواد خام': 'مواد خام وتوريدات',
    'عمالة': 'أجور وعمالة فنية',
    'أجور وعمالة': 'أجور وعمالة فنية',
    'معدات': 'إيجار/شراء معدات',
    'مقاولين باطن': 'مستخلصات مقاولي باطن',
    'إنشاءات': 'مستخلصات مقاولي باطن',
    'إداريات': 'مصاريف إدارية أخرى',
    'أخرى': 'مصاريف إدارية أخرى'
  };
  return mapping[cat] || cat;
};

exports.createSubmission = catchAsync(async (req, res, next) => {
  const { type } = req.params;
  const Model = models[type];
  if (!Model) return next(new AppError('Invalid submission type', 400));

  const submissionData = { ...req.body };

  // Parse JSON values if sent via FormData
  if (typeof submissionData.values === 'string') {
    try { submissionData.values = JSON.parse(submissionData.values); } catch (e) {}
  }
  if (typeof submissionData.paidAmounts === 'string') {
    try { submissionData.paidAmounts = JSON.parse(submissionData.paidAmounts); } catch (e) {}
  }

  // Handle file uploads (images/pdfs)
  if (req.files && req.files.length > 0) {
    submissionData.images = req.files.map(file => `/uploads/contracts/${file.filename}`);
  }

  const newSubmission = await Model.create({
    ...submissionData,
    createdBy: req.user._id,
    submissionStatus: 'pending_review'
  });

  res.status(201).json({
    status: 'success',
    data: newSubmission
  });
});

exports.getPendingSubmissions = catchAsync(async (req, res, next) => {
  const contracts = await ContractSubmission.find({ submissionStatus: 'pending_review' }).populate('projectId').populate('createdBy', 'name');
  const expenses = await ExpenseSubmission.find({ submissionStatus: 'pending_review' }).populate('projectId').populate('createdBy', 'name');
  const fundings = await FundingSubmission.find({ submissionStatus: 'pending_review' }).populate('projectId').populate('createdBy', 'name');
  const progress = await ProgressSubmission.find({ submissionStatus: 'pending_review' }).populate('projectId').populate('createdBy', 'name');
  const transactions = await TransactionSubmission.find({ submissionStatus: 'pending_review' }).populate('projectId').populate('fundingSourceId').populate('createdBy', 'name');

  res.status(200).json({
    status: 'success',
    data: { contracts, expenses, fundings, progress, transactions }
  });
});

exports.getMySubmissions = catchAsync(async (req, res, next) => {
  const contracts = await ContractSubmission.find({ createdBy: req.user._id }).populate('projectId');
  const expenses = await ExpenseSubmission.find({ createdBy: req.user._id }).populate('projectId');
  const fundings = await FundingSubmission.find({ createdBy: req.user._id }).populate('projectId');
  const progress = await ProgressSubmission.find({ createdBy: req.user._id }).populate('projectId');
  const transactions = await TransactionSubmission.find({ createdBy: req.user._id }).populate('projectId').populate('fundingSourceId');

  res.status(200).json({
    status: 'success',
    data: { contracts, expenses, fundings, progress, transactions }
  });
});

exports.reviewSubmission = catchAsync(async (req, res, next) => {
  const { type, id } = req.params;
  const { action, rejectionReason } = req.body;

  const Model = models[type];
  if (!Model) return next(new AppError('Invalid submission type', 400));

  const submission = await Model.findById(id);
  if (!submission) return next(new AppError('Submission not found', 404));

  if (submission.submissionStatus !== 'pending_review') {
    return next(new AppError('Submission is not pending review', 400));
  }

  if (action === 'reject' && !rejectionReason) {
    return next(new AppError('Rejection reason is required', 400));
  }

  submission.reviewHistory.push({
    status: action === 'approve' ? 'approved' : 'needs_changes',
    comment: rejectionReason,
    reviewedBy: req.user._id
  });

  submission.reviewedBy = req.user._id;
  submission.reviewedAt = Date.now();

  if (action === 'approve') {
    submission.submissionStatus = 'approved';

    // Apply to real project models
    if (type === 'contract') {
      // Convert Mongoose Maps to plain objects to ensure proper storage
      const valuesObj = {};
      if (submission.values) {
        (submission.values instanceof Map ? submission.values : new Map(Object.entries(submission.values)))
          .forEach((v, k) => { if (v != null) valuesObj[k] = Number(v); });
      }
      const paidObj = {};
      if (submission.paidAmounts) {
        (submission.paidAmounts instanceof Map ? submission.paidAmounts : new Map(Object.entries(submission.paidAmounts)))
          .forEach((v, k) => { if (v != null) paidObj[k] = Number(v); });
      }

      await Contract.create({
        projectId: submission.projectId,
        parentContractId: submission.parentContractId,
        contractorName: submission.contractorName,
        values: valuesObj,
        paidAmounts: paidObj,
        images: submission.images,
        status: submission.status || 'Approved',
        description: submission.description,
        startDate: submission.startDate,
        startDateDescription: submission.startDateDescription,
        endDate: submission.endDate,
        endDateDescription: submission.endDateDescription,
        createdBy: submission.createdBy
      });
    } else if (type === 'expense') {
      const normalizedCategory = normalizeCategory(submission.category);
      const expenseCurrency = normalizeCurrency(submission.currency);

      // ── Currency validation: check currency exists in project budget map ──
      const project = await Project.findById(submission.projectId);
      if (project) {
        if (!projectHasCurrencyBudget(project, expenseCurrency)) {
          return next(new AppError(
            `لا توجد ميزانية بالعملة ${expenseCurrency} في هذا المشروع. لا يمكن اعتماد هذا المصروف.`,
            400
          ));
        }
      }

      // ── Create the approved Expense with currency field ──
      await Expense.create({
        projectId: submission.projectId,
        companyId: submission.companyId,
        amount: submission.amount,
        currency: expenseCurrency,
        category: normalizedCategory,
        vendor: submission.vendor,
        description: submission.description,
        date: submission.date,
        status: 'معتمد'
      });

      // NOTE: No longer modifying budgetBreakdown or allocatedBudget.
      // Budget deduction is now tracked implicitly via currency-filtered Expense queries.

    } else if (type === 'funding') {
      const fundingCurrency = normalizeCurrency(submission.currency);
      const project = await Project.findById(submission.projectId);

      if (project && !projectHasCurrencyBudget(project, fundingCurrency)) {
        if (!project.budgets || !(project.budgets instanceof Map)) {
          project.budgets = new Map();
        }
        if (!project.budgets.has(fundingCurrency)) {
          project.budgets.set(fundingCurrency, 0);
          await project.save();
        }
      }

      await ProjectFunding.create({
        projectId: submission.projectId,
        sourceName: submission.sourceName,
        sourceType: submission.sourceType,
        committedAmount: submission.committedAmount,
        currency: fundingCurrency,
        receivedAmount: submission.receivedAmount,
        fundingDate: submission.fundingDate,
        description: submission.description
      });
    } else if (type === 'progress') {
      const projectId = submission.projectId?._id || submission.projectId;
      const progress = Number(submission.progressPercentage);
      const update = {
        completionPercentage: progress >= 100 ? 100 : progress
      };

      if (submission.executionDetails) {
        update.executionDetails = submission.executionDetails;
      }

      if (progress >= 100) {
        update.status = 'مكتمل';
      } else if (progress <= 90) {
        update.status = 'قيد التنفيذ';
      }

      await Project.findByIdAndUpdate(projectId, { $set: update });
    } else if (type === 'transaction') {
      const FundingTransaction = require('../models/FundingTransaction');
      await FundingTransaction.create({
        fundingSourceId: submission.fundingSourceId,
        projectId: submission.projectId,
        amount: submission.amount,
        transactionDate: submission.transactionDate,
        paymentMethod: submission.paymentMethod,
        referenceNumber: submission.referenceNumber
      });
    }

  } else if (action === 'reject' || action === 'needs_changes') {
    submission.submissionStatus = 'needs_changes';
    submission.rejectionReason = rejectionReason;
  } else {
    return next(new AppError('Invalid action', 400));
  }

  await submission.save();

  res.status(200).json({
    status: 'success',
    data: submission
  });
});

exports.updateSubmission = catchAsync(async (req, res, next) => {
  const { type, id } = req.params;
  const Model = models[type];
  if (!Model) return next(new AppError('Invalid submission type', 400));

  const submission = await Model.findOne({ _id: id, createdBy: req.user._id });
  if (!submission) return next(new AppError('Submission not found or you are not authorized', 404));

  if (submission.submissionStatus !== 'needs_changes') {
    return next(new AppError('You can only edit submissions that need changes', 400));
  }

  if (typeof req.body.values === 'string') {
    try { req.body.values = JSON.parse(req.body.values); } catch (e) { }
  }
  if (typeof req.body.paidAmounts === 'string') {
    try { req.body.paidAmounts = JSON.parse(req.body.paidAmounts); } catch (e) { }
  }

  // Handle file updates
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => `/uploads/contracts/${file.filename}`);
    submission.images = [...(submission.images || []), ...newImages];
  }

  Object.assign(submission, req.body);
  if (type === 'expense') {
    submission.currency = normalizeCurrency(req.body.currency || req.body.expenseCurrency || submission.currency);
  }
  submission.submissionStatus = 'pending_review';
  submission.updatedBy = req.user._id;

  await submission.save();

  res.status(200).json({
    status: 'success',
    data: submission
  });
});

exports.deleteSubmission = catchAsync(async (req, res, next) => {
  const { type, id } = req.params;
  const Model = models[type];
  if (!Model) return next(new AppError('Invalid submission type', 400));

  const submission = await Model.findById(id);
  if (!submission) return next(new AppError('Submission not found', 404));

  // Authorized: Creator of the submission or Admin
  if (submission.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
    return next(new AppError('You are not authorized to delete this submission', 403));
  }

  // Submissions can be deleted unless they are already approved
  if (submission.submissionStatus === 'approved') {
    return next(new AppError('Approved submissions cannot be deleted', 400));
  }

  await Model.findByIdAndDelete(id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
