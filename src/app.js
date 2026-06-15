const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middlewares/errorHandler');

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true
}));



// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const authRouter = require('./routes/authRoutes');
const sectorRouter = require('./routes/sectorRoutes');
const projectRouter = require('./routes/projectRoutes');
const financeRouter = require('./routes/financeRoutes');
const gisRouter = require('./routes/gisRoutes');
const analyticsRouter = require('./routes/analyticsRoutes');
const reportRouter = require('./routes/reportRoutes');
const contractRouter = require('./routes/contractRoutes');
const companyRouter = require('./routes/companyRoutes');
const submissionRouter = require('./routes/submissionRoutes');
// 2) ROUTES
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRouter);
app.use('/api/sectors', sectorRouter);
app.use('/api/projects', projectRouter);
app.use('/api/finance', financeRouter);
app.use('/api/gis', gisRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/companies', companyRouter);
app.use('/api/submissions', submissionRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);

module.exports = app;
