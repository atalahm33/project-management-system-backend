const Company = require('../models/Company');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllCompanies = catchAsync(async (req, res, next) => {
  const companies = await Company.find();

  res.status(200).json({
    status: 'success',
    results: companies.length,
    data: {
      companies
    }
  });
});

exports.getCompany = catchAsync(async (req, res, next) => {
  const company = await Company.findById(req.params.id);

  if (!company) {
    return next(new AppError('No company found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      company
    }
  });
});

exports.createCompany = catchAsync(async (req, res, next) => {
  const newCompany = await Company.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      company: newCompany
    }
  });
});

exports.updateCompany = catchAsync(async (req, res, next) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!company) {
    return next(new AppError('No company found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      company
    }
  });
});

exports.deleteCompany = catchAsync(async (req, res, next) => {
  const company = await Company.findByIdAndDelete(req.params.id);

  if (!company) {
    return next(new AppError('No company found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
