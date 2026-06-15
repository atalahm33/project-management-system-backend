const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./src/models/Project');

const dbUrl = process.env.DATABASE_URL || process.env.MONGO_URI || process.env.DATABASE;
console.log('Connecting to DB...');

mongoose.connect(dbUrl).then(async () => {
  const result = await Project.updateMany(
    { approvalStatus: { $exists: false } },
    { $set: { approvalStatus: 'approved' } }
  );
  console.log('✓ Migrated', result.modifiedCount, 'existing projects => approvalStatus: approved');
  process.exit(0);
}).catch(e => {
  console.error('DB Error:', e.message);
  process.exit(1);
});
