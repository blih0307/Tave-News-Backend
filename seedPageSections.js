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

  // --- Privacy Policy / Terms of Use ---
  // Single long-form field each, matching the DEFAULT_CONTENT fallback
  // baked into src/pages/PrivacyPolicy.jsx and TermsOfUse.jsx on the
  // frontend -- this just gets that same starting draft into the admin so
  // it's editable from day one instead of needing "Add Field" first.
  // IMPORTANT: this is a starting draft, not reviewed legal advice --
  // have someone qualified review it (especially liability/governing law)
  // before treating it as final, and replace [DATE] with the real date.
  { page: 'privacy', sectionKey: 'content', label: 'Privacy Policy Text', group: 'Content', type: 'richtext',
    content: `Last updated: [DATE]

Tave News ("Tave News", "we", "us", or "our") operates this website (the "Site"). This Privacy Policy explains what information we collect, how we use it, and the choices you have.

## Information We Collect

We collect a very small amount of personal information:

Information you give us directly: if you sign up for our newsletter, we collect the email address you provide. If you contact us through the Contact page, we collect your name, email address and message.

Information collected automatically: like most websites, we use Google Analytics to understand how visitors use the Site. This collects standard usage data such as pages viewed, time on page, approximate location (derived from IP address), device and browser type, and referring website. We do not control what Google Analytics collects beyond its standard settings.

## Cookies and Advertising

This Site displays advertising through Google AdSense. Google and its partners may use cookies and similar technologies to serve ads based on your prior visits to this or other websites. You can review and adjust how Google personalizes ads for you at Google's Ads Settings (adssettings.google.com), and you can read Google's own policy on this at policies.google.com/technologies/ads.

Google Analytics also sets its own cookies to distinguish visitors and sessions.

Most browsers let you block or delete cookies through their settings. Blocking cookies may affect how parts of the Site work.

## How We Use Information

We use the information above to: operate and improve the Site; send the newsletter to people who sign up for it; understand traffic and readership through analytics; and respond to messages sent through the Contact page.

We do not sell your personal information.

## Third-Party Services

We use a small number of third-party services to run this Site: Google Analytics (site analytics), Google AdSense (advertising), and a cloud image-hosting provider (Cloudinary) for article images. Each of these providers processes data under their own privacy policies.

## Your Choices

You can unsubscribe from the newsletter at any time using the link in any newsletter email, or by contacting us directly. You can ask us to delete an email address from our newsletter list by contacting us at the address below. You can control cookies through your browser settings, and control Google's ad personalization through Google's Ads Settings linked above.

## Children's Privacy

This Site is not directed at children, and we do not knowingly collect personal information from children.

## Data Security

We take reasonable steps to protect the information we hold, but no method of storage or transmission over the internet is completely secure.

## International Visitors

This Site is accessible globally. Depending on where you're located, the third-party services above (Google, Cloudinary) may process your information on servers outside your country, including outside Nigeria.

## Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.

## Contact Us

Questions about this policy can be sent through our Contact page.`, order: 0 },

  { page: 'terms', sectionKey: 'content', label: 'Terms of Use Text', group: 'Content', type: 'richtext',
    content: `Last updated: [DATE]

Welcome to Tave News. By accessing or using this website (the "Site"), you agree to these Terms of Use. If you don't agree with them, please don't use the Site.

## Use of the Site

You may view, read and share individual articles for personal, non-commercial use. You may not republish, redistribute, scrape, or reproduce Site content in bulk, or use it for commercial purposes, without our prior written permission.

## Intellectual Property

Original articles, text, graphics, logos and the overall design of this Site are owned by Tave News, unless otherwise noted. All rights not expressly granted here are reserved.

Images on this Site come from a mix of sources: our own photography, wire/stock photos licensed from services like Getty Images or AP (embedded directly from their platform under their license terms, not hosted or owned by us), free-to-use stock photography from sites like Unsplash or Pexels (used under those platforms' own license terms), and, occasionally, social media posts embedded directly from the original platform. In each case, rights to that image remain with its original photographer, licensor, or the platform it was embedded from — we don't claim ownership over third-party images.

If you believe an image on this Site is being used incorrectly or without proper rights, please contact us and we'll review and correct it.

## Accounts and Conduct

Most of the Site is available without an account. You agree not to use the Site to violate any law, attempt to gain unauthorized access to our systems, interfere with the Site's normal operation, or upload anything harmful (such as malware).

## Advertising

This Site displays advertising, including through Google AdSense. Advertisements are provided by third parties, and we are not responsible for the content of ads or for the products or services they promote.

## Newsletter

Signing up for our newsletter is optional and requires only an email address. You can unsubscribe at any time.

## Third-Party Links

The Site may link to other websites we don't control. We aren't responsible for the content, accuracy, or practices of any third-party site.

## Accuracy of Content

We aim to report accurately, but news and information can change quickly and errors can occur. If you believe something we've published is inaccurate, please contact us and we'll review it. Content on the Site is provided "as is" without warranties of any kind.

## Limitation of Liability

To the fullest extent permitted by law, Tave News is not liable for any indirect, incidental, or consequential damages arising from your use of the Site.

## Changes to These Terms

We may update these Terms from time to time. Continued use of the Site after changes are posted means you accept the updated Terms.

## Governing Law

These Terms are governed by the laws of the Federal Republic of Nigeria.

## Contact Us

Questions about these Terms can be sent through our Contact page.`, order: 0 },
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