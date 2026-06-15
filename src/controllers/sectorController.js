const Sector = require('../models/Sector');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllSectors = catchAsync(async (req, res, next) => {
  const sectors = await Sector.find();

  res.status(200).json({
    status: 'success',
    results: sectors.length,
    data: {
      sectors
    }
  });
});

exports.createSector = catchAsync(async (req, res, next) => {
  const newSector = await Sector.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      sector: newSector
    }
  });
});

exports.getSector = catchAsync(async (req, res, next) => {
  const sector = await Sector.findById(req.params.id);

  if (!sector) {
    return next(new AppError('No sector found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      sector
    }
  });
});

exports.updateSector = catchAsync(async (req, res, next) => {
  const sector = await Sector.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!sector) {
    return next(new AppError('No sector found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      sector
    }
  });
});

exports.deleteSector = catchAsync(async (req, res, next) => {
  const sector = await Sector.findByIdAndDelete(req.params.id);

  if (!sector) {
    return next(new AppError('No sector found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
