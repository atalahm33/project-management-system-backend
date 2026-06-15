const mongoose = require('mongoose');

const fundingSubmissionSchema = new mongoose.Schema({
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
    required: [true, 'Currency is required'],
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
  fundingDate: {
    type: Date,
    default: Date.now
  },
  description: String,

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

fundingSubmissionSchema.pre('save', function() {
  const committed = this.committedAmount || 0;
  const received = this.receivedAmount || 0;
  this.remainingAmount = committed - received;
});

module.exports = mongoose.model('FundingSubmission', fundingSubmissionSchema);
