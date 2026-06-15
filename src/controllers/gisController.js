const Project = require('../models/Project');
const catchAsync = require('../utils/catchAsync');

exports.getProjectsOnMap = catchAsync(async (req, res, next) => {
  // Can filter by sector or status if query params are provided
  const queryObj = { ...req.query };
  const projects = await Project.find(queryObj).select('title location status sectorId');

  res.status(200).json({
    status: 'success',
    results: projects.length,
    data: {
      projects
    }
  });
});
