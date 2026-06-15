const Project = require('../models/Project');
const Expense = require('../models/Expense');
const ProjectFunding = require('../models/ProjectFunding');
const catchAsync = require('../utils/catchAsync');

// ─── Supported currencies list ──────────────────────────────────────────────
const SUPPORTED_CURRENCIES = ['EGP', 'USD', 'EUR', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'];

// Arabic DB status → dashboard response key (includes legacy aliases)
const PROJECT_STATUS_MAP = {
  'مخطط له': 'planned',
  'قيد التنفيذ': 'onTrack',
  'منتظم': 'onTrack',
  OnTrack: 'onTrack',
  'مكتمل': 'completed',
  Completed: 'completed',
  'متوقف': 'suspended',
  'متأخر': 'delayed',
  Delayed: 'delayed'
};

const buildProjectsStatus = (statusStats, totalProjects) => {
  const counts = {
    planned: 0,
    onTrack: 0,
    completed: 0,
    suspended: 0,
    delayed: 0
  };

  statusStats.forEach(({ _id, count }) => {
    const key = PROJECT_STATUS_MAP[_id];
    if (key) counts[key] += count;
  });

  const toEntry = (count) => ({
    count,
    percentage: parseFloat(
      (totalProjects > 0 ? (count / totalProjects) * 100 : 0).toFixed(2)
    )
  });

  return {
    planned: toEntry(counts.planned),
    onTrack: toEntry(counts.onTrack),
    completed: toEntry(counts.completed),
    suspended: toEntry(counts.suspended),
    delayed: toEntry(counts.delayed)
  };
};

/**
 * GET /api/analytics/dashboard?currency=USD
 * 
 * If currency=all (or not provided) → returns cross-currency comparison table
 * If currency=USD (specific code)   → returns per-currency KPIs for that currency
 */
exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  const requestedCurrency = req.query.currency || 'all';

  // ── 1. Project status stats (currency-agnostic counts) ──────────────────
  const projectStatusStats = await Project.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const totalProjects = await Project.countDocuments();
  const projectsStatus = buildProjectsStatus(projectStatusStats, totalProjects);

  // ── 2. Sector distribution (project count + currency-isolated financials) ─
  const allProjects = await Project.find({}).populate('sectorId', 'name');

  // ── 3. External funding stats ─────────────────────────────────────────────
  const externalFundingStats = await ProjectFunding.aggregate([
    {
      $group: {
        _id: null,
        totalCommitted: { $sum: '$committedAmount' },
        totalReceived: { $sum: '$receivedAmount' }
      }
    }
  ]);

  // ── 4. Per-currency logic ──────────────────────────────────────────────────
  if (requestedCurrency !== 'all') {
    // ── SINGLE CURRENCY MODE ─────────────────────────────────────────────────
    const currency = requestedCurrency.toUpperCase();

    // Sum budgets for this currency across all projects
    let totalBudget = 0;
    allProjects.forEach(p => {
      if (p.budgets && p.budgets instanceof Map) {
        totalBudget += p.budgets.get(currency) || 0;
      } else if (currency === 'EGP' && p.totalBudget) {
        totalBudget += p.totalBudget;
      }
    });

    // Sum approved expenses for this currency
    const expenseAgg = await Expense.aggregate([
      { $match: { status: 'معتمد', currency: currency } },
      { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
    ]);
    const totalSpent = expenseAgg[0]?.totalSpent || 0;
    const remainingBudget = totalBudget - totalSpent;
    const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Monthly spending trend for this currency (current year)
    const currentYear = new Date().getFullYear();
    const rawMonthly = await Expense.aggregate([
      {
        $match: {
          status: 'معتمد',
          currency: currency,
          date: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
          }
        }
      },
      { $group: { _id: { month: { $month: '$date' } }, spent: { $sum: '$amount' } } },
      { $sort: { '_id.month': 1 } }
    ]);

    const monthlySpending = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, spent: 0 }));
    rawMonthly.forEach(item => {
      if (item._id?.month) monthlySpending[item._id.month - 1].spent = item.spent;
    });

    // Sector distribution for this currency
    const sectorMap = {};
    for (const p of allProjects) {
      const sectorName = p.sectorId?.name || 'غير محدد';
      if (!sectorMap[sectorName]) sectorMap[sectorName] = { sectorName, count: 0, totalBudget: 0, totalSpent: 0 };
      sectorMap[sectorName].count++;

      // Budget for this currency
      let pBudget = 0;
      if (p.budgets instanceof Map) pBudget = p.budgets.get(currency) || 0;
      else if (currency === 'EGP') pBudget = p.totalBudget || 0;
      sectorMap[sectorName].totalBudget += pBudget;
    }

    // Expenses per sector for this currency
    const sectorExpenses = await Expense.aggregate([
      { $match: { status: 'معتمد', currency: currency } },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'sectors',
          localField: 'project.sectorId',
          foreignField: '_id',
          as: 'sector'
        }
      },
      { $unwind: { path: '$sector', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$sector.name', 'غير محدد'] },
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    sectorExpenses.forEach(se => {
      if (sectorMap[se._id]) sectorMap[se._id].totalSpent = se.totalSpent;
    });
    return res.status(200).json({
      status: 'success',
      data: {
        currency,
        totalProjects,
        projectsStatus,
        budgetSummary: {
          totalBudget,
          totalSpent,
          remainingBudget: remainingBudget < 0 ? 0 : remainingBudget,
          spentPercentage: parseFloat(spentPercentage.toFixed(2)),
          remainingPercentage: parseFloat((100 - spentPercentage).toFixed(2))
        },
        sectorDistribution: Object.values(sectorMap),
        monthlySpending,
        externalFunding: {
          totalCommitted: externalFundingStats[0]?.totalCommitted || 0,
          totalReceived: externalFundingStats[0]?.totalReceived || 0,
          totalRemaining: (externalFundingStats[0]?.totalCommitted || 0) - (externalFundingStats[0]?.totalReceived || 0)
        }
      }
    });
  }

  // ── ALL CURRENCIES MODE: cross-currency comparison table ─────────────────
  const currencyComparison = [];

  for (const currency of SUPPORTED_CURRENCIES) {
    // Budget sum for this currency
    let totalBudget = 0;
    allProjects.forEach(p => {
      if (p.budgets instanceof Map) {
        totalBudget += p.budgets.get(currency) || 0;
      } else if (currency === 'EGP') {
        totalBudget += p.totalBudget || 0;
      }
    });

    if (totalBudget === 0) continue; // skip currencies with no budgets

    // Expenses for this currency
    const expAgg = await Expense.aggregate([
      { $match: { status: 'معتمد', currency } },
      { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
    ]);
    const totalSpent = expAgg[0]?.totalSpent || 0;

    currencyComparison.push({
      currency,
      totalBudget,
      totalSpent,
      remainingBudget: Math.max(0, totalBudget - totalSpent),
      utilizationPercentage: totalBudget > 0 ? parseFloat(((totalSpent / totalBudget) * 100).toFixed(2)) : 0
    });
  }

  // ── Sector distribution (EGP-based for general overview) ─────────────────
  const sectorDistribution = await Project.aggregate([
    {
      $lookup: {
        from: 'expenses',
        localField: '_id',
        foreignField: 'projectId',
        as: 'projectExpenses'
      }
    },
    {
      $addFields: {
        spentOnProject: {
          $sum: {
            $map: {
              input: { $filter: { input: '$projectExpenses', as: 'exp', cond: { $eq: ['$$exp.status', 'معتمد'] } } },
              as: 'approvedExp',
              in: '$$approvedExp.amount'
            }
          }
        }
      }
    },
    { $group: { _id: '$sectorId', count: { $sum: 1 }, totalBudget: { $sum: '$totalBudget' }, totalSpent: { $sum: '$spentOnProject' } } },
    { $lookup: { from: 'sectors', localField: '_id', foreignField: '_id', as: 'sector' } },
    { $unwind: '$sector' },
    { $project: { sectorName: '$sector.name', count: 1, totalBudget: 1, totalSpent: 1 } }
  ]);

  // ── Monthly spending (EGP default for overview) ───────────────────────────
  const currentYear = new Date().getFullYear();
  const rawMonthlyEGP = await Expense.aggregate([
    {
      $match: {
        status: 'معتمد',
        currency: 'EGP',
        date: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
        }
      }
    },
    { $group: { _id: { month: { $month: '$date' } }, spent: { $sum: '$amount' } } },
    { $sort: { '_id.month': 1 } }
  ]);

  const monthlySpending = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, spent: 0 }));
  rawMonthlyEGP.forEach(item => {
    if (item._id?.month) monthlySpending[item._id.month - 1].spent = item.spent;
  });

  // Summary totals for EGP (backward compat for existing dashboard cards)
  const egpRow = currencyComparison.find(r => r.currency === 'EGP') || { totalBudget: 0, totalSpent: 0, remainingBudget: 0, utilizationPercentage: 0 };

  res.status(200).json({
    status: 'success',
    data: {
      currency: 'all',
      totalProjects,
      projectsStatus,
      // Backward-compat budget summary (EGP only, for existing dashboard cards)
      budgetSummary: {
        totalBudget: egpRow.totalBudget,
        totalAllocated: 0,
        totalSpent: egpRow.totalSpent,
        remainingBudget: egpRow.remainingBudget,
        spentPercentage: egpRow.utilizationPercentage,
        remainingPercentage: parseFloat((100 - egpRow.utilizationPercentage).toFixed(2))
      },
      // Cross-currency comparison table
      currencyComparison,
      sectorDistribution,
      monthlySpending,
      externalFunding: {
        totalCommitted: externalFundingStats[0]?.totalCommitted || 0,
        totalReceived: externalFundingStats[0]?.totalReceived || 0,
        totalRemaining: (externalFundingStats[0]?.totalCommitted || 0) - (externalFundingStats[0]?.totalReceived || 0)
      }
    }
  });
});

exports.getFundingSourcesStats = catchAsync(async (req, res, next) => {
  const fundingStats = await ProjectFunding.aggregate([
    {
      $group: {
        _id: '$sourceName',
        projectsCount: { $addToSet: '$projectId' },
        totalCommitted: { $sum: '$committedAmount' },
        totalReceived: { $sum: '$receivedAmount' },
      }
    },
    {
      $project: {
        sourceName: '$_id',
        projectsCount: { $size: '$projectsCount' },
        totalCommitted: 1,
        totalReceived: 1,
        totalRemaining: { $subtract: ['$totalCommitted', '$totalReceived'] }
      }
    },
    { $sort: { totalCommitted: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { fundingStats }
  });
});

exports.getBudgetAnalytics = catchAsync(async (req, res, next) => {
  const requestedCurrency = (req.query.currency || 'all').toUpperCase();
  const currency = requestedCurrency === 'ALL' ? 'EGP' : requestedCurrency;

  // 1. Project level budgets and expenses for the specific currency
  const projects = await Project.find({}).select('title budgets totalBudget');
  const expenses = await Expense.aggregate([
    { $match: { status: 'معتمد', currency } },
    { $group: { _id: '$projectId', totalSpent: { $sum: '$amount' } } }
  ]);

  const expenseMap = {};
  expenses.forEach(e => {
    expenseMap[e._id.toString()] = e.totalSpent;
  });

  const projectBudgets = projects.map(p => {
    let pBudget = 0;
    if (p.budgets && p.budgets instanceof Map) {
      pBudget = p.budgets.get(currency) || 0;
    } else if (currency === 'EGP') {
      pBudget = p.totalBudget || 0;
    }
    const spent = expenseMap[p._id.toString()] || 0;
    return {
      projectName: p.title,
      budget: pBudget,
      spent: spent,
      remaining: Math.max(0, pBudget - spent)
    };
  }).filter(p => p.budget > 0 || p.spent > 0); // Only include relevant projects

  // 2. Expenses by category
  const expensesByCategory = await Expense.aggregate([
    { $match: { status: 'معتمد', currency } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $project: { category: '$_id', total: 1, _id: 0 } },
    { $sort: { total: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      currency,
      projectBudgets,
      expensesByCategory
    }
  });
});

