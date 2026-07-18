// Populates the PageSection collection with the site's current About/Contact
// copy so the admin's Pages editor has real content to show/edit on first
// run instead of an empty list. Safe to re-run — it upserts by page+sectionKey.
require('dotenv').config();
const connectDB = require('./config/db');
const PageSection = require('./models/PageSection');

const sections = [
  // --- About page ---
  { page: 'about', sectionKey: 'hero_title', label: 'Hero Title', group: 'Hero', type: 'text',
    content: 'About Tave News', order: 0 },
  { page: 'about', sectionKey: 'hero_subtitle', label: 'Hero Subtitle', group: 'Hero', type: 'text',
    content: 'Breaking news and stories that matter — from Nigeria, Africa and the world.', order: 1 },
  { page: 'about', sectionKey: 'who_we_are', label: 'Who We Are', group: 'Body', type: 'richtext',
    content: 'Tave News is a digital media platform delivering fast, accurate and engaging news coverage across Nigeria, Africa and the world. We believe in journalism that informs, challenges and empowers — covering politics, business, entertainment, tech and lifestyle with integrity.', order: 2 },
  { page: 'about', sectionKey: 'write_for_us_title', label: 'Write For Us Title', group: 'Call To Action', type: 'text',
    content: 'Write For Us', order: 3 },
  { page: 'about', sectionKey: 'write_for_us_body', label: 'Write For Us Body', group: 'Call To Action', type: 'text',
    content: "Are you a journalist, writer or expert in your field? We'd love to hear from you.", order: 4 },

  // --- Contact page ---
  { page: 'contact', sectionKey: 'hero_title', label: 'Hero Title', group: 'Hero', type: 'text',
    content: 'Contact Us', order: 0 },
  { page: 'contact', sectionKey: 'hero_subtitle', label: 'Hero Subtitle', group: 'Hero', type: 'text',
    content: "Have a story tip, feedback, or question? We'd love to hear from you.", order: 1 },
  { page: 'contact', sectionKey: 'email', label: 'Contact Email', group: 'Details', type: 'text',
    content: 'hello@tavenews.com', order: 2 },

  // --- Home page ---
  { page: 'home', sectionKey: 'breaking_ticker_enabled', label: 'Show Breaking Ticker', group: 'General', type: 'boolean',
    content: true, order: 0 },

  // --- Monetization ---
  // Master switch is off and no publisher ID is set by default, so ads stay
  // fully inert (no script loads, no network calls) until someone in the
  // admin turns this on deliberately. Every AdBanner on the site renders
  // its dashed "Advertisement" placeholder until its slot below is filled
  // in, so pages never look broken in the meantime.
  { page: 'monetization', sectionKey: 'ads_enabled', label: 'Ads Enabled (master switch)', group: 'Global', type: 'boolean',
    content: false, order: 1 },
  { page: 'monetization', sectionKey: 'adsense_client_id', label: 'AdSense Publisher ID (ca-pub-...)', group: 'Global', type: 'text',
    content: '', order: 2 },
  { page: 'monetization', sectionKey: 'slot_home_leaderboard', label: 'Home — Leaderboard Slot', group: 'Slots', type: 'json',
    content: { type: 'empty' }, order: 3 },
  { page: 'monetization', sectionKey: 'slot_category_leaderboard', label: 'Category Page — Leaderboard Slot', group: 'Slots', type: 'json',
    content: { type: 'empty' }, order: 4 },
  { page: 'monetization', sectionKey: 'slot_category_sidebar_rectangle', label: 'Category Page — Sidebar Rectangle Slot', group: 'Slots', type: 'json',
    content: { type: 'empty' }, order: 5 },
  { page: 'monetization', sectionKey: 'slot_article_incontent', label: 'Article Page — In-body Leaderboard Slot', group: 'Slots', type: 'json',
    content: { type: 'empty' }, order: 6 },
  { page: 'monetization', sectionKey: 'slot_article_sidebar_rectangle', label: 'Article Page — Sidebar Rectangle Slot', group: 'Slots', type: 'json',
    content: { type: 'empty' }, order: 7 },
  { page: 'monetization', sectionKey: 'slot_article_sidebar_square', label: 'Article Page — Sidebar Square Slot', group: 'Slots', type: 'json',
    content: { type: 'empty' }, order: 8 },
];

(async () => {
  await connectDB();
  for (const s of sections) {
    await PageSection.findOneAndUpdate(
      { page: s.page, sectionKey: s.sectionKey },
      { $set: s },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Seeded ${sections.length} page sections.`);
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
