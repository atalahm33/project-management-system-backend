const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sector must have a name'],
    unique: true,
    enum: {
      values: [
        'قطاع مشروعات البترول والغاز والتعدين',
        'قطاع التجارة الداخلية والخارجية',
        'قطاع المقاولات والخدمات المتخصصة',
        'قطاع مشروعات الأمن الغذائي',
        'قطاع الصناعات الثقيلة والمتخصصة'
      ],
      message: 'اسم القطاع غير صحيح، يجب أن يكون أحد القطاعات المعتمدة'
    }
  },
  description: String
}, {
  timestamps: true
});

const Sector = mongoose.model('Sector', sectorSchema);
module.exports = Sector;
