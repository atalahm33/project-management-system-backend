const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
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
  "إنشاءات",
  "أعمال مدنية",
  "أعمال معمارية",
  "أعمال كهرباء",
  "أعمال ميكانيكا",

  "مواد خام",
  "مواد خام وتوريدات",
  "معدات",
  "قطع غيار",
  "أدوات ومستلزمات تشغيل",

  "عمالة",
  "أجور وعمالة فنية",
  "رواتب إدارية",
  "خدمات فنية واستشارية",
  "خدمات مقاولين باطن",

  "إيجار معدات",
  "شراء معدات",
  "تشغيل وصيانة معدات",

  "مستخلصات مقاولي باطن",
  "عقود مقاولات خارجية",

  "خدمات",
  "مصاريف تشغيلية",
  "مصاريف إدارية",
  "مصاريف إدارية أخرى",

  "إداريات",
  "أخرى"
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
  status: {
    type: String,
  enum: ['قيد الانتظار', 'معتمد', 'مرفوض'],
    default: 'معتمد'
  }
}, {
  timestamps: true
});

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
