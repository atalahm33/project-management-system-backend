const mongoose = require('mongoose');

const factoryProductSchema = new mongoose.Schema({
  product_ar: String,
  product_en: String,
  product_fr: String,
  product_image: String,
  capacity: Number,
  unit_ar: String,
  unit_en: String,
  unit_fr: String
}, { _id: false });

const factorySchema = new mongoose.Schema({
  factory_ar: String,
  factory_en: String,
  factory_fr: String,
  products: [factoryProductSchema]
}, { _id: false });

const locationSchema = new mongoose.Schema({
  location_ar: String,
  location_en: String,
  location_fr: String,
  governorate_ar: String,
  governorate_en: String,
  governorate_fr: String,
  formation_ar: String,
  formation_en: String,
  formation_fr: String,
  factories: [factorySchema]
}, { _id: false });

const galleryItemSchema = new mongoose.Schema({
  id: Number,
  url: String,
  title: String,
  description: String
}, { _id: false });

const unitSchema = new mongoose.Schema({
  unit_name_ar: String,
  unit_name_en: String,
  unit_name_fr: String,
  location_ar: String,
  location_en: String,
  location_fr: String,
  governorate_ar: String,
  governorate_en: String,
  governorate_fr: String
}, { _id: false });

const investmentOpportunitySchema = new mongoose.Schema({
  id: Number,
  title_ar: String,
  title_en: String,
  title_fr: String,
  summary_ar: String,
  summary_en: String,
  summary_fr: String,
  description_ar: String,
  description_en: String,
  description_fr: String,
  investment_type_ar: String,
  investment_type_en: String,
  investment_type_fr: String,
  estimated_investment: Number,
  currency: String,
  expected_roi: Number,
  project_duration_months: Number,
  status_ar: String,
  status_en: String,
  status_fr: String,
  location_ar: String,
  location_en: String,
  location_fr: String,
  governorate_ar: String,
  governorate_en: String,
  governorate_fr: String,
  benefits_ar: [String],
  benefits_en: [String],
  benefits_fr: [String],
  requirements_ar: [String],
  requirements_en: [String],
  requirements_fr: [String],
  images: [{
    url: String,
    title_ar: String,
    title_en: String,
    title_fr: String,
    is_main: Boolean
  }],
  contact_person_ar: String,
  contact_person_en: String,
  contact_person_fr: String,
  contact_email: String,
  contact_phone: String,
  is_featured: Boolean,
  expiry_date: Date
}, { _id: false });

const companySchema = new mongoose.Schema({
  name_ar: { type: String, required: true },
  name_en: { type: String, required: true },
  name_fr: { type: String, required: true },
  
  // Legacy name field (unique identifier)
  name: { type: String, unique: true },
  
  sector_ar: String,
  sector_en: String,
  sector_fr: String,
  gradient: String,
  logo: String,
  number_of_factories: { type: Number, default: 0 },

  details: {
    Gallary: [galleryItemSchema],
    website: String,
    establishment_year: String,
    description_ar: String,
    description_en: String,
    description_fr: String,
    products_ar: [String],
    products_en: [String],
    products_fr: [String],
    contact: {
      address_ar: String,
      address_en: String,
      address_fr: String,
      phone: String,
      fax: String,
      email: String
    },
    locations: [locationSchema],
    headquarter: {
      address_ar: String,
      address_en: String,
      address_fr: String,
      governorate_ar: String,
      governorate_en: String,
      governorate_fr: String
    },
    units: [unitSchema]
  },
  
  investment_opportunities: [investmentOpportunitySchema],

  activeProjectsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Company = mongoose.model('Company', companySchema);
module.exports = Company;
