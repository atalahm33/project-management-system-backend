const mongoose = require('mongoose');
const Sector = require('./src/models/Sector');
const dotenv = require('dotenv');

dotenv.config();

const sectors = [
  { name: 'قطاع مشروعات البترول والغاز والتعدين', description: 'يشمل كافة مشروعات استخراج وتكرير البترول والغاز وأعمال التعدين.' },
  { name: 'قطاع التجارة الداخلية والخارجية', description: 'يشمل التبادل التجاري وتطوير الأسواق الداخلية وعمليات التصدير والاستيراد.' },
  { name: 'قطاع المقاولات والخدمات المتخصصة', description: 'يشمل أعمال الإنشاءات والمقاولات والخدمات الفنية المتخصصة.' },
  { name: 'قطاع مشروعات الأمن الغذائي', description: 'يشمل مشروعات الزراعة والإنتاج الحيواني والداجني والتصنيع الغذائي.' },
  { name: 'قطاع الصناعات الثقيلة والمتخصصة', description: 'يشمل الصناعات الكبرى والمتخصصة والمجمعات الصناعية.' }
];

const seedSectors = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/national-projects');
    console.log('Connected to DB for seeding sectors...');

    for (const s of sectors) {
      await Sector.findOneAndUpdate(
        { name: s.name },
        s,
        { upsert: true, new: true }
      );
    }

    console.log('Sectors seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('Error seeding sectors:', err);
    process.exit(1);
  }
};

seedSectors();
