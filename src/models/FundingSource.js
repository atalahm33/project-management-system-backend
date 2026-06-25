const mongoose = require('mongoose');

const fundingSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Funding source must have a name'],
    unique: true
  },
  type: {
    type: String,
enum: ['تمويل ذاتي','حكومي', 'خاص', 'قرض', 'منحة'],
    required: [true, 'Funding source must have a type']
  }
}, {
  timestamps: true
});

const FundingSource = mongoose.model('FundingSource', fundingSourceSchema);
module.exports = FundingSource;
