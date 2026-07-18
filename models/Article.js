const mongoose = require('mongoose');
const slugify = require('slugify');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  slug: { type: String, unique: true },
  excerpt: { type: String, required: [true, 'Excerpt is required'], maxlength: 300 },
  content: { type: String, required: [true, 'Content is required'] },
  featuredImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
    // A licensed embed (e.g. "Embed from Getty Images") takes priority
    // over url/publicId when set -- mutually exclusive with an upload,
    // enforced in the admin UI, not the schema.
    embedHtml: { type: String, default: '' },
    // Getty's own embed can't be cropped into a small card/list thumbnail,
    // so this is a separate, optional smaller image (uploaded or its own
    // responsive embed, e.g. SmartFrame) used anywhere the article shows
    // up as a card rather than the full featured image.
    thumbnailUrl: { type: String, default: '' },
    thumbnailPublicId: { type: String, default: '' },
    thumbnailEmbedHtml: { type: String, default: '' },
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tags: [{ type: String, lowercase: true }],
  source: { type: String, trim: true, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  isFeatured: { type: Boolean, default: false },
  isBreaking: { type: Boolean, default: false },
  // Only ONE article site-wide should have isHero: true. Enforced in the
  // controller (not a DB constraint) so the previous hero can be demoted
  // atomically in the same request.
  isHero: { type: Boolean, default: false },
  // Manual pin into one of the 4 homepage "side news" slots. null = not
  // pinned; unpinned slots are backfilled by recency so the layout never
  // shows a gap. Exclusivity per-slot enforced in the controller.
  sideNewsOrder: { type: Number, default: null, min: 1, max: 4 },
  // Manual pin for a category's "Top Stories" tab; backfilled by recency
  // the same way.
  isTopStory: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  publishedAt: { type: Date, default: null },
  scheduledAt: { type: Date, default: null },
  seo: {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: [{ type: String }],
  },
  embeddedVideo: { type: String, default: '' }, // YouTube embed URL
}, { timestamps: true });

// Auto generate slug from title
articleSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Increment views
articleSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// Helpful indexes for the news-routing queries (hero/side/latest/top-stories)
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, isHero: 1 });
articleSchema.index({ status: 1, sideNewsOrder: 1 });
articleSchema.index({ status: 1, isTopStory: 1 });

module.exports = mongoose.model('Article', articleSchema);
