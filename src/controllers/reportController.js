const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Contract = require('../models/Contract');
const Company = require('../models/Company');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { formatProjectImages } = require('./projectController');
const fs = require('fs');
const path = require('path');
const puppeteer = require("puppeteer");
const ejs = require("ejs");

const formatDate = (date) => {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-EG');
};

const formatMoney = (amount, currency = 'EGP') => {
  const value = Number(amount) || 0;
  return `${value.toLocaleString('ar-EG')} ${currency}`;
};


// Export Excel: All Projects Export
exports.exportProjectsExcel = catchAsync(async (req, res, next) => {
  const projects = await Project.find()
    .populate('sectorId', 'name')
    .populate('companyId', 'name');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('المشاريع');

  // إعداد الأعمدة بالعربية
  worksheet.columns = [
    { header: 'اسم المشروع', key: 'title', width: 30 },
    { header: 'القطاع', key: 'sector', width: 20 },
    { header: 'الشركة المنفذة', key: 'company', width: 25 },
    { header: 'الحالة', key: 'status', width: 15 },
    { header: 'إجمالي الميزانية', key: 'totalBudget', width: 20 },
    { header: 'الميزانية المخصصة', key: 'allocatedBudget', width: 20 },
    { header: 'موعد/تاريخ المشروع', key: 'projectDate', width: 25 },
    { header: 'الموقع', key: 'projectLocation', width: 25 }
  ];

  // تحسين المظهر
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { horizontal: 'center' };

  const arabicStatus = {
    OnTrack: 'منتظم',
    Delayed: 'متأخر',
    Completed: 'مكتمل'
  };

  projects.forEach((proj) => {
    worksheet.addRow({
      title: proj.title,
      sector: proj.sectorId ? proj.sectorId.name : 'غير محدد',
      company: proj.companyId ? proj.companyId.name : 'غير محدد',
      status: arabicStatus[proj.status] || proj.status,
      totalBudget: proj.totalBudget,
      allocatedBudget: proj.allocatedBudget,
      projectDate: proj.projectDate || '',
      projectLocation: proj.projectLocation || ''
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=projects-report.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

// Export PDF: Single Project Detailed Report




exports.exportProjectPDF = catchAsync(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId)
    .populate('sectorId')
    .populate('createdBy', 'name')
    .populate('companyId')
    .populate({
      path: 'funding',
      populate: { path: 'transactions' }
    })
    .populate('contracts');

  if (!project) {
    return next(new AppError('No project found with that ID', 404));
  }

  // جلب كافة النفقات (كل الحالات)
  const allExpenses = await Expense.find({ projectId: project._id });
  const contracts = await Contract.find({ projectId: project._id });

  // =====================
  // Calculations
  // =====================
  // Calculate totalSpent from actual approved expenses (no longer from budgetBreakdown)
  const totalSpent = allExpenses
    .filter(e => e.status === 'معتمد')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
    
  const pendingSpent = allExpenses
    .filter(e => e.status === 'قيد الانتظار')
    .reduce((a, b) => a + b.amount, 0);

  const remaining = (project.budgets?.get?.('EGP') || project.totalBudget || 0) - totalSpent;
  const budgetBase = project.budgets?.get?.('EGP') || project.totalBudget || 0;
  const spendingPercentage = budgetBase > 0 ? ((totalSpent / budgetBase) * 100).toFixed(1) : 0;

  // توزيع النفقات حسب الفئة من خلال المصروفات الفعلية
  const categoryMap = {};
  allExpenses.filter(e => e.status === 'معتمد').forEach(e => {
    const cat = e.category || 'أخرى';
    categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
  });
  const categoryLabels = Object.keys(categoryMap);
  const categoryData = Object.values(categoryMap);
  
  let highestCategory = { _id: 'لا يوجد', total: 0 };
  const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) highestCategory = { _id: sortedCats[0][0], total: sortedCats[0][1] };

  // For the budget vs actual chart: use budgets Map (multi-currency)
  const breakdownLabels = [];
  const breakdownData = [];
  if (project.budgets && project.budgets instanceof Map) {
    project.budgets.forEach((value, key) => {
      breakdownLabels.push(key);
      breakdownData.push(value);
    });
  } else {
    // Legacy fallback
    (project.budgetBreakdown || []).forEach(b => {
      breakdownLabels.push(b.category);
      breakdownData.push(b.plannedAmount || 0);
    });
  }

  // توزيع النفقات حسب الحالة
  const statusCounts = {
    Approved: allExpenses.filter(e => e.status === 'معتمد').length,
    Pending: allExpenses.filter(e => e.status === 'قيد الانتظار').length,
    Rejected: allExpenses.filter(e => e.status === 'مرفوض').length
  };

  const contractNames = contracts.map(c => c.contractorName);
  const contractValues = contracts.map(c => c.contractValue);

  const host = `${req.protocol}://${req.get('host')}`;
  const projectData = formatProjectImages(project, host);

  const budgetsList = [];
  if (projectData.budgets && typeof projectData.budgets === 'object') {
    Object.entries(projectData.budgets).forEach(([currency, amount]) => {
      budgetsList.push({ currency, amount: Number(amount) || 0 });
    });
  }

  const totalFundingCommitted = (projectData.funding || []).reduce(
    (sum, f) => sum + (f.committedAmount || 0),
    0
  );
  const totalFundingReceived = (projectData.funding || []).reduce(
    (sum, f) => sum + (f.receivedAmount || 0),
    0
  );

  const formattedContracts = contracts.map((contract) => {
    const cObj = contract.toObject ? contract.toObject({ flattenMaps: true }) : contract;
    if (cObj.images && Array.isArray(cObj.images)) {
      cObj.images = cObj.images.map((img) => (img.startsWith('http') ? img : `${host}${img}`));
    }
    return cObj;
  });

  // Load logo
  const logoPath = path.join(__dirname, "../public/NSPO-Logo5.png");
  let logoBase64 = "";
  if (fs.existsSync(logoPath)) {
    logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
  }

  // =====================
  // Render HTML
  // =====================
  const html = await ejs.renderFile(
    path.join(__dirname, "../templates/projectReport.ejs"),
    {
      logo: logoBase64,
      project: projectData,
      totalSpent,
      pendingSpent,
      remaining,
      spendingPercentage,
      allExpenses,
      contracts: formattedContracts,
      categoryLabels,
      categoryData,
      highestCategory,
      breakdownLabels,
      breakdownData,
      statusCounts,
      contractNames,
      contractValues,
      budgetsList,
      totalFundingCommitted,
      totalFundingReceived,
      formatDate,
      formatMoney
    }
  );

  // =====================
  // Puppeteer
  // =====================
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  // مهم جدا للـ charts - انتظار التحميل
  await new Promise(resolve => setTimeout(resolve, 2000));

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=project-${project._id}.pdf`
  );

  res.send(pdf);
});

// Export PDF: Company Detailed Report
exports.exportCompanyPDF = catchAsync(async (req, res, next) => {
  const company = await Company.findById(req.params.companyId);

  if (!company) {
    return next(new AppError('No company found with that ID', 404));
  }

  // جلب كافة المشاريع للشركة
  const projects = await Project.find({ companyId: company._id })
    .populate("sectorId createdBy", "name name_ar");

  const projectIds = projects.map(p => p._id);

  // جلب كافة النفقات والعقود لتلك المشاريع
  const allExpenses = await Expense.find({ projectId: { $in: projectIds } });
  const contracts = await Contract.find({ projectId: { $in: projectIds } });

  // =====================
  // Calculations
  // =====================
  const totalBudget = projects.reduce((a, b) => a + (b.totalBudget || 0), 0);
  const totalAllocated = projects.reduce((a, b) => a + (b.allocatedBudget || 0), 0);
  
  const totalSpent = projects.reduce((sum, p) => 
    sum + (p.budgetBreakdown || []).reduce((s, b) => s + (b.actualAmount || 0), 0)
  , 0);
    
  const pendingSpent = allExpenses
    .filter(e => e.status === "Pending")
    .reduce((a, b) => a + b.amount, 0);

  const remaining = totalBudget - totalSpent;
  const spendingPercentage = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

  // توزيع النفقات حسب الفئة من خلال خطة الميزانية لكل المشاريع
  const companyCategoryMap = {};
  projects.forEach(p => {
    (p.budgetBreakdown || []).forEach(b => {
      companyCategoryMap[b.category] = (companyCategoryMap[b.category] || 0) + (b.actualAmount || 0);
    });
  });

  const categoryLabels = Object.keys(companyCategoryMap);
  const categoryData = Object.values(companyCategoryMap);
  
  let highestCategory = { _id: 'لا يوجد', total: 0 };
  const sortedCategories = Object.entries(companyCategoryMap).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    highestCategory = { _id: sortedCategories[0][0], total: sortedCategories[0][1] };
  }

  // توزيع النفقات حسب الحالة
  const statusCounts = {
    Approved: allExpenses.filter(e => e.status === "Approved").length,
    Pending: allExpenses.filter(e => e.status === "Pending").length,
    Rejected: allExpenses.filter(e => e.status === "Rejected").length
  };

  const contractNames = contracts.map(c => c.contractorName);
  const contractValues = contracts.map(c => c.contractValue);

  // توزيع حالة المشاريع
  const projectStatusCounts = {
    Completed: projects.filter(p => p.status === "مكتمل").length,
    Delayed: projects.filter(p => p.status === "متأخر").length,
    OnTrack: projects.filter(p => p.status === "منتظم").length,
  };

  // Load logo
  const logoPath = path.join(__dirname, "../public/NSPO-Logo5.png");
  let logoBase64 = "";
  if (fs.existsSync(logoPath)) {
    logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
  }

  // =====================
  // Render HTML
  // =====================
  const html = await ejs.renderFile(
    path.join(__dirname, "../templates/companyReport.ejs"),
    {
      logo: logoBase64,
      company,
      projects,
      totalBudget,
      totalAllocated,
      totalSpent,
      pendingSpent,
      remaining,
      spendingPercentage,
      allExpenses,
      contracts,
      categoryLabels,
      categoryData,
      highestCategory,
      statusCounts,
      contractNames,
      contractValues,
      projectStatusCounts
    }
  );

  // =====================
  // Puppeteer
  // =====================
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  // مهم جدا للـ charts - انتظار التحميل
  await new Promise(resolve => setTimeout(resolve, 2000));

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=company-${company._id}.pdf`
  );

  res.send(pdf);
});