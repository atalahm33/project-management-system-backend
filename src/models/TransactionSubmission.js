const mongoose = require('mongoose');

const transactionSubmissionSchema = new mongoose.Schema({
  fundingSourceId: {
    type: mongoose.Schema.ObjectId,
    ref: 'ProjectFunding',
    required: [true, 'الدفع يجب أن يرتبط بمصدر تمويل']
  },
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: [true, 'الدفع يجب أن يرتبط بمشروع']
  },
  amount: {
    type: Number,
    required: [true, 'يجب تحديد مبلغ الدفعة'],
    min: [0.01, 'مبلغ الدفعة يجب أن يكون أكبر من صفر']
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['تحويل بنكي', 'شيك', 'نقدي', 'أخرى'],
    default: 'تحويل بنكي'
  },
  referenceNumber: {
    type: String,
    description: 'رقم التحويل أو الشيك'
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

module.exports = mongoose.model('TransactionSubmission', transactionSubmissionSchema);
