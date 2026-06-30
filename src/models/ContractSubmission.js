const mongoose = require('mongoose');

const contractSubmissionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: [true, 'Contract must belong to a project']
  },
  contractorName: {
    type: String,
    required: [true, 'Contract must have a contractor name']
  },
  contractValue: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number
  },
  values: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  paidAmounts: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  images: {
    type: [String],
    default: []
  },
  parentContractId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Contract',
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    default: null
  },
  startDateDescription: {
    type: String,
    default: ''
  },
  endDate: {
    type: Date,
    default: null
  },
  endDateDescription: {
    type: String,
    default: ''
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

contractSubmissionSchema.pre('save', function() {
  // Sync contractValue from values Map for backward compatibility
  if (this.values && this.values.size > 0) {
    const egpVal = this.values.get('EGP');
    const firstVal = Array.from(this.values.values())[0] || 0;
    this.contractValue = egpVal != null ? egpVal : firstVal;
  }
  // Sync paidAmount from paidAmounts Map for backward compatibility
  if (this.paidAmounts && this.paidAmounts.size > 0) {
    const egpPaid = this.paidAmounts.get('EGP');
    const firstPaid = Array.from(this.paidAmounts.values())[0] || 0;
    this.paidAmount = egpPaid != null ? egpPaid : firstPaid;
  }

  this.remainingAmount = this.contractValue - this.paidAmount;
});

module.exports = mongoose.model('ContractSubmission', contractSubmissionSchema);
