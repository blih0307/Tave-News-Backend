const mongoose = require('mongoose');

// A link in the header nav (e.g. "World", "Business"). Optional `subnav`
// lets an editor add a dropdown of related links under a top-level item
// without touching any code.
const subNavItemSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  to:    { type: String, required: true, trim: true }, // e.g. "/world/africa"
  order: { type: Number, default: 0 },
}, { _id: false });

const navItemSchema = new mongoose.Schema({
  label:    { type: String, required: true, trim: true },   // e.g. "World"
  to:       { type: String, required: true, trim: true },   // e.g. "/world"
  order:    { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }, // toggled off = hidden from the live nav without deleting it
  subnav:   [subNavItemSchema],
}, { timestamps: true });

navItemSchema.index({ order: 1 });

module.exports = mongoose.model('NavItem', navItemSchema);
