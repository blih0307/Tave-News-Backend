const mongoose = require('mongoose');

// Generic, page-agnostic "content block" so any page in the admin can be
// listed section-by-section and edited without a new backend model/route
// every time a new editable field is needed.
//
// Example rows for the Home page:
//   { page: 'home', sectionKey: 'hero_heading',    type: 'text',  content: 'Breaking News' }
//   { page: 'home', sectionKey: 'hero_subheading',  type: 'text',  content: 'Stay informed' }
//   { page: 'about', sectionKey: 'body',            type: 'richtext', content: '<p>...</p>' }
//
// `page` groups sections in the admin sidebar (Home / About / Contact / ...).
// `sectionKey` is the stable field name the frontend fetches by. Together
// they're unique.

const pageSectionSchema = new mongoose.Schema({
  page:       { type: String, required: true, trim: true, lowercase: true }, // e.g. 'home', 'about', 'contact'
  sectionKey: { type: String, required: true, trim: true },                  // e.g. 'hero_heading'
  label:      { type: String, required: true, trim: true },                  // human-readable name shown in the admin UI
  group:      { type: String, default: 'General', trim: true },              // sub-heading to cluster related fields in the admin UI
  type:       { type: String, enum: ['text', 'richtext', 'image', 'link', 'boolean', 'json'], default: 'text' },
  content:    { type: mongoose.Schema.Types.Mixed, default: '' },
  order:      { type: Number, default: 0 },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

pageSectionSchema.index({ page: 1, sectionKey: 1 }, { unique: true });
pageSectionSchema.index({ page: 1, order: 1 });

module.exports = mongoose.model('PageSection', pageSectionSchema);
