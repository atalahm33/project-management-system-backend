const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true
  }
});

// ─── Supported Currencies ─────────────────────────────────────────
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'];


const riskSchema = new mongoose.Schema({
  description: { type: String },
  severity: {
    type: String,
    enum: {
      values: ['منخفض', 'متوسط', 'عالي', 'حرج'],
      message: 'درجة الخطورة غير صحيحة'
    },
    required: [true, 'يجب تحديد درجة الخطورة'],
    default: 'متوسط'
  },
  mitigationPlan: String,
  status: {
    type: String,
    enum: {
      values: ['نشط', 'تم التخفيف', 'مغلق'],
      message: 'حالة الخطر غير صحيحة'
    },
    required: [true, 'يجب تحديد حالة الخطر'],
    default: 'نشط'
  }
});

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A project must have a title']
  },
  description: String,
  beneficiaryEntity: {
    type: String,
    default: ''
  },
  sectorId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Sector',
    required: [true, 'A project must belong to a sector']
  },
  status: {
    type: String,
    enum: {
      values: ['قيد التنفيذ', 'متأخر', 'مكتمل','متوقف','مخطط له'],
      message: 'حالة المشروع غير صحيحة'
    },
    required: [true, 'يجب تحديد حالة المشروع'],
    default: 'قيد التنفيذ'
  },
  location: {
    type: pointSchema
  },
  projectLocation: {
    type: String,
    required: [true, 'يجب تحديد موقع المشروع']
  },
  projectDate: {
    type: String,
    required: [true, 'يجب تحديد موعد أو تاريخ المشروع']
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  // Multi-currency budgets: { USD: 10000, EGP: 200000, ... }
  budgets: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  // Legacy field — kept for backward compatibility & EGP-only projects
  totalBudget: {
    type: Number,
    default: 0
  },
  allocatedBudget: {
    type: Number,
    default: 0
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  executionDetails: {
    type: String,
    default: ''
  },
  // Legacy budgetBreakdown kept read-only for old data — not modified by new logic
  budgetBreakdown: { type: mongoose.Schema.Types.Mixed, default: [] },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A project must belong to a user']
  },
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: [true, 'A project must belong to a company']
  },
  risks: [riskSchema],
  images: {
    type: [String],
    default: []
  },
  // ─── Self-Review & Approval ────────────────────────────────────────
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved'],
    default: 'pending'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, flattenMaps: true },
  toObject: { virtuals: true, flattenMaps: true }
});

// Middleware: auto-complete / auto-late status + backward compatibility for budgets
projectSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  const $set = update.$set || update;
  const progress = Number($set.completionPercentage);

  if (!Number.isNaN(progress)) {
    if (progress >= 100) {
      $set.completionPercentage = 100;
      $set.status = 'مكتمل';
    } else if (progress <= 90 && $set.status === undefined) {
      $set.status = 'قيد التنفيذ';
    }

    if (update.$set) {
      update.$set = $set;
    } else {
      this.setUpdate($set);
    }
  }
});

projectSchema.pre('save', function() {
  // 1. Mark project as completed when progress reaches 100%
  if (this.completionPercentage >= 100) {
    this.completionPercentage = 100;
    this.status = 'مكتمل';
  }

  // 2. Mark project as late if overdue (skip completed projects)
  if (this.endDate && this.endDate < new Date() && this.status !== 'مكتمل') {
    this.status = 'متأخر';
  }

  // 3. Backward compatibility: if budgets map is empty but totalBudget exists,
  //    seed the EGP budget from totalBudget
  if (this.totalBudget > 0 && (!this.budgets || this.budgets.size === 0)) {
    if (!this.budgets) this.budgets = new Map();
    this.budgets.set('EGP', this.totalBudget);
  }

  // 4. Keep totalBudget synced with EGP budget for legacy dashboard queries
  if (this.budgets && this.budgets.size > 0) {
    this.totalBudget = this.budgets.get('EGP') || 0;
  }
});

// For GIS Queries
projectSchema.index({ location: '2dsphere' });

// Virtual for spent amount logic can be populated later
// progress fields can also be virtuals if not stored
projectSchema.virtual('contracts', {
  ref: 'Contract',
  foreignField: 'projectId',
  localField: '_id'
});

projectSchema.virtual('funding', {
  ref: 'ProjectFunding',
  foreignField: 'projectId',
  localField: '_id'
});
projectSchema.set('toJSON', { virtuals: true, flattenMaps: true });
projectSchema.set('toObject', { virtuals: true, flattenMaps: true });
const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
