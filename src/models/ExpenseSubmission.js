const mongoose = require('mongoose');

const expenseSubmissionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: [true, 'Expense must belong to a project']
  },
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company'
  },
  amount: {
    type: Number,
    required: [true, 'Expense must have an amount']
  },
  currency: {
    type: String,
    required: [true, 'Expense must have a currency'],
    enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'],
    default: 'EGP'
  },
  category: {
    type: String,
    enum: [
      // أعمال إنشائية
      'إنشاءات',
      'أعمال مدنية',
      'أعمال معمارية',
      'أعمال كهرباء',
      'أعمال ميكانيكا',
      // مواد ومشتريات
      'مواد خام',
      'مواد خام وتوريدات',
      'معدات',
      'قطع غيار',
      'أدوات ومستلزمات تشغيل',
      // عمالة وخدمات
      'عمالة',
      'أجور وعمالة فنية',
      'رواتب إدارية',
      'خدمات فنية واستشارية',
      'خدمات مقاولين باطن',
      // معدات وتشغيل
      'إيجار معدات',
      'شراء معدات',
      'إيجار/شراء معدات',
      'تشغيل وصيانة معدات',
      // مقاولات
      'مستخلصات مقاولي باطن',
      'مستخلصات مقاولين باطن',
      'عقود مقاولات خارجية',
      // مصاريف تشغيلية
      'خدمات',
      'مصاريف تشغيلية',
      'مصاريف إدارية',
      'مصاريف إدارية أخرى',
      // عامة
      'إداريات',
      'أخرى'
    ],
    required: [true, 'Expense must belong to a category']
  },
  vendor: {
    type: String,
    required: [true, 'Expense must have a vendor']
  },
  description: String,
  date: {
    type: Date,
    default: Date.now
  },

  // Submission Base Fields
  submissionStatus: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'needs_changes', 'rejected_final'],
    default: 'pending_review'
  },
  rejectionReason: String,
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewHistory: [{
    status: String,
    comment: String,
    reviewedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    reviewedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('ExpenseSubmission', expenseSubmissionSchema);
