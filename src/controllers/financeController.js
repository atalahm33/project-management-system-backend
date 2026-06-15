const Expense = require('../models/Expense');
const Project = require('../models/Project');
const FundingSourceLookup = require('../models/FundingSource'); // Lookup table
const ProjectFunding = require('../models/ProjectFunding'); // Project specific allocation
const FundingTransaction = require('../models/FundingTransaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

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

exports.addExpense = catchAsync(async (req, res, next) => {
  // 1. جيب المشروع عشان نعرف الشركة المرتبطة بيه
  const project = await Project.findById(req.body.projectId);
  if (!project) {
    return next(new AppError('No project found with that ID', 404));
  }
  const currency = normalizeCurrency(req.body.currency || req.body.expenseCurrency);
  if (!projectHasCurrencyBudget(project, currency)) {
    return next(new AppError(`No ${currency} budget exists for this project`, 400));
  }

  const ExpenseSubmission = require('../models/ExpenseSubmission');

  // 2. إضافة طلب مصروف ليراجعه الـ Reviewer
  const expense = await ExpenseSubmission.create({
    projectId: req.body.projectId,
    companyId: project.companyId || null, 
    amount: req.body.amount,
    currency,
    category: req.body.category,
    vendor: req.body.vendor,
    description: req.body.description,
    date: req.body.date,
    createdBy: req.user._id,
    submissionStatus: 'pending_review'
  });

  res.status(201).json({
    status: 'success',
    data: {
      expense
    }
  });
});

exports.getProjectExpenses = catchAsync(async (req, res, next) => {
  const expenses = await Expense.find({ projectId: req.params.projectId });

  res.status(200).json({
    status: 'success',
    results: expenses.length,
    data: {
      expenses
    }
  });
});

exports.getAllFundingSources = catchAsync(async (req, res, next) => {
  const sources = await FundingSourceLookup.find();

  res.status(200).json({
    status: 'success',
    results: sources.length,
    data: {
      sources
    }
  });
});

exports.createFundingSourceLookup = catchAsync(async (req, res, next) => {
  const source = await FundingSourceLookup.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      source
    }
  });
});

exports.allocateFunding = catchAsync(async (req, res, next) => {
  console.log('Request Body:', req.body);
  const FundingSubmission = require('../models/FundingSubmission');
  const currency = normalizeCurrency(req.body.currency);
  
  const allocation = await FundingSubmission.create({
    ...req.body,
    currency,
    createdBy: req.user._id,
    submissionStatus: 'pending_review'
  });

  res.status(201).json({
    status: 'success',
    data: {
      allocation
    }
  });
});

exports.addFundingTransaction = catchAsync(async (req, res, next) => {
  console.log('--- DEBUG TRANSACTION ---');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  
  const body = req.body || {};
  const data = body.data ? body.data : body;

  if (!data || Object.keys(data).length === 0) {
    return next(new AppError('فشل السيرفر في قراءة البيانات. تأكد من إرسال الطلب بتنسيق JSON (Application/JSON)', 400));
  }

  const TransactionSubmission = require('../models/TransactionSubmission');
  
  const transaction = await TransactionSubmission.create({
    ...data,
    createdBy: req.user._id,
    submissionStatus: 'pending_review'
  });

  res.status(201).json({
    status: 'success',
    data: {
      transaction
    }
  });
});

exports.getProjectFunding = catchAsync(async (req, res, next) => {
  const funding = await ProjectFunding.find({ projectId: req.params.projectId });

  res.status(200).json({
    status: 'success',
    results: funding.length,
    data: {
      funding
    }
  });
});

exports.getFundingTransactions = catchAsync(async (req, res, next) => {
  const transactions = await FundingTransaction.find({ fundingSourceId: req.params.sourceId });

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: {
      transactions
    }
  });
});

exports.getAvailableCurrencies = catchAsync(async (req, res, next) => {
  const currenciesSet = new Set();
  
  // Always include the base currency EGP by default
  currenciesSet.add('EGP');

  // 1. Get from Project budgets Map
  const projects = await Project.find({}).select('budgets');
  projects.forEach(p => {
    if (p.budgets && p.budgets.size > 0) {
      for (const key of p.budgets.keys()) {
        currenciesSet.add(key);
      }
    }
  });

  // 2. Get from Expenses
  const expenseCurrencies = await Expense.distinct('currency');
  expenseCurrencies.forEach(c => currenciesSet.add(c));

  // 3. Get from ProjectFunding
  const fundingCurrencies = await ProjectFunding.distinct('currency');
  fundingCurrencies.forEach(c => currenciesSet.add(c));

  res.status(200).json({
    status: 'success',
    data: {
      currencies: Array.from(currenciesSet)
    }
  });
});
