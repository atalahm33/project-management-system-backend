const mongoose = require('mongoose');
const ProjectFunding = require('./ProjectFunding');

const fundingTransactionSchema = new mongoose.Schema({
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
  currency: {
    type: String,
    required: [true, 'يجب تحديد العملة'],
    enum: ['USD', 'EUR', 'EGP', 'SAR', 'AED', 'GBP', 'KWD', 'QAR', 'BHD', 'OMR'],
    default: 'EGP'
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
  }
}, {
  timestamps: true
});

// Static method to update ProjectFunding totals
fundingTransactionSchema.statics.updateFundingTotals = async function(fundingSourceId) {
  const stats = await this.aggregate([
    {
      $match: { fundingSourceId }
    },
    {
      $group: {
        _id: '$fundingSourceId',
        totalReceived: { $sum: '$amount' }
      }
    }
  ]);

  const ProjectFundingModel = mongoose.model('ProjectFunding');
  const funding = await ProjectFundingModel.findById(fundingSourceId);

  if (funding) {
    if (stats.length > 0) {
      funding.receivedAmount = stats[0].totalReceived;
    } else {
      funding.receivedAmount = 0;
    }
    // حفظ التغييرات سيقوم بتشغيل منطق حساب المتبقي والحالة في ProjectFunding.js
    await funding.save();
  }
};

// Call updateFundingTotals after save
fundingTransactionSchema.post('save', function() {
  this.constructor.updateFundingTotals(this.fundingSourceId);
});

// Call updateFundingTotals before remove (for cleanup)
fundingTransactionSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  next();
});

fundingTransactionSchema.post(/^findOneAnd/, async function() {
  if (this.r) {
    await this.r.constructor.updateFundingTotals(this.r.fundingSourceId);
  }
});

const FundingTransaction = mongoose.model('FundingTransaction', fundingTransactionSchema);
module.exports = FundingTransaction;
