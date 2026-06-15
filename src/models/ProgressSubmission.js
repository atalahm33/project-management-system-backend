const mongoose = require('mongoose');

const progressSubmissionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Project',
    required: [true, 'Submission must belong to a project']
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  executionDetails: String,
  reports: [String],

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

module.exports = mongoose.model('ProgressSubmission', progressSubmissionSchema);
