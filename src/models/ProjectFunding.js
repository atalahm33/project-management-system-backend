const mongoose = require('mongoose');

const projectFundingSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'يجب أن ينتمي مصدر التمويل لمشروع']
  },
  sourceName: {
    type: String,
    required: [true, 'يجب إدخال اسم جهة التمويل']
  },
  sourceType: {
    type: String,
    enum: ['حكومي', 'خاص', 'قرض', 'منحة'],
    required: [true, 'يجب تحديد نوع التمويل']
  },
  committedAmount: {
    type: Number,
    required: [true, 'يجب تحديد المبلغ المعتمد'],
    min: [0, 'المبلغ لا يمكن أن يكون سالباً']
  },
  currency: {
    type: String,
    required: [true, 'يجب تحديد العملة'],
    enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'],
    default: 'EGP'
  },
  receivedAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number
  },
  status: {
    type: String,
    enum: ['قيد الانتظار', 'تم استلام جزئيًا', 'تم استلام بالكامل'],
    default: 'قيد الانتظار'
  },
  fundingDate: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for transactions
projectFundingSchema.virtual('transactions', {
  ref: 'FundingTransaction',
  foreignField: 'fundingSourceId',
  localField: '_id'
});

// Logic for calculating remainingAmount and status
projectFundingSchema.pre('save', function() {
  // التأكد من أن القيم أرقام
  const committed = this.committedAmount || 0;
  const received = this.receivedAmount || 0;

  // المتبقي = المعتمد - المستلم
  this.remainingAmount = committed - received;

  // تحديث الحالة تلقائياً بناءً على المبلغ المستلم
  if (received === 0) {
    this.status = 'قيد الانتظار';
  } else if (received < committed) {
    this.status = 'تم استلام جزئيًا';
  } else {
    this.status = 'تم استلام بالكامل';
  }
});
const ProjectFunding = mongoose.model('ProjectFunding', projectFundingSchema);
module.exports = ProjectFunding;
