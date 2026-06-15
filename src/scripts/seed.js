require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Sector = require('../models/Sector');
const FundingSource = require('../models/FundingSource');
const connectDB = require('../config/db');

connectDB();

const seedDB = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Sector.deleteMany();
    await FundingSource.deleteMany();

    // Create Admin User
    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@nspo.gov',
      password: 'adminPassword123',
      role: 'Admin'
    });

   

    // Create Funding Sources
    await FundingSource.insertMany([
      { name: 'Federal Government Budget', type: 'government' },
      { name: 'World Bank Grant', type: 'grant' },
      { name: 'Private Investment Group A', type: 'private' },
      { name: 'International Monetary Fund Loan', type: 'loan' }
    ]);

    console.log('Database seeded successfully!');
    console.log(`Admin Email: admin@nspo.gov`);
    console.log(`Admin Password: adminPassword123`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();
