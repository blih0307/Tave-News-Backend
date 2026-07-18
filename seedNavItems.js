// Populates the NavItem collection with the site's current header links,
// so the admin's Nav Manager has something to show/edit on first run
// instead of an empty list. Safe to re-run — it upserts by `to`.
require('dotenv').config();
const connectDB = require('./config/db');
const NavItem = require('./models/NavItem');

const items = [
  { label: 'Home',          to: '/',              order: 0 },
  { label: 'Sports',        to: '/sports',         order: 1 },
  { label: 'Africa',        to: '/africa',         order: 2 },
  { label: 'World',         to: '/world',          order: 3 },
  { label: 'Entertainment', to: '/entertainment',  order: 4 },
  { label: 'Tech',          to: '/tech',           order: 5 },
  { label: 'Business',      to: '/business',       order: 6 },
  { label: 'Lifestyle',     to: '/lifestyle',      order: 7 },
  { label: 'Opinion',       to: '/opinion',        order: 8 },
];

(async () => {
  await connectDB();
  for (const item of items) {
    await NavItem.findOneAndUpdate(
      { to: item.to },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Seeded ${items.length} nav items.`);
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
