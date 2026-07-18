const Article = require('../models/Article');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');

const ARTICLE_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'author', select: 'name avatar' },
];

const SIDE_NEWS_COUNT = 4;
const LATEST_NEWS_HOME_COUNT = 6;
const TOP_STORIES_HOME_COUNT = 6;
const TOP_STORIES_TABS = 5; // how many top-level categories get a Top Stories tab

// @desc    Get all published articles (public)
// @route   GET /api/articles
exports.getArticles = async (req, res, next) => {
  try {
    const { category, tag, search, limit = 10, page = 1, featured, breaking } = req.query;
    const query = { status: 'published' };

    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag.toLowerCase()] };
    if (featured) query.isFeatured = true;
    if (breaking) query.isBreaking = true;
    // NOTE: was `query.$text = { $search: search }` — that requires a MongoDB
    // text index which was never defined on this schema, so every search
    // request threw and was swallowed by the frontend's .catch(), always
    // showing "No results found". Regex match across title/excerpt/tags
    // needs no index setup and matches the pattern used in getAdminArticles.
    if (search) {
      const re = { $regex: search, $options: 'i' };
      query.$or = [{ title: re }, { excerpt: re }, { tags: re }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Article.countDocuments(query);
    const articles = await Article.find(query)
      .populate(ARTICLE_POPULATE)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: articles.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: articles,
    });
  } catch (error) { next(error); }
};

// -----------------------------------------------------------------------
// Home page rotation, ported from the sports site's structure:
//
//   Hero (1) -> Side news (4) -> Latest news (6) -> Top Stories (6/tab)
//
// One backend call computes all four sections against a single shared
// exclusion list, so no article can ever appear twice on the homepage.
// Manual pins (isHero / sideNewsOrder / isTopStory) are an override layer
// on top of this, not a replacement for it: a pin always wins its slot,
// and anything left unpinned is filled in by recency.
// -----------------------------------------------------------------------

// @desc    Home page news layout: hero, side news, latest news, and
//          per-category Top Stories tabs
// @route   GET /api/articles/feed/home
exports.getHomeFeed = async (req, res, next) => {
  try {
    const { limit = LATEST_NEWS_HOME_COUNT, page = 1 } = req.query;

    // Hero: whichever article is manually flagged, falling back to the most
    // recent published article if none is flagged yet.
    let hero = await Article.findOne({ status: 'published', isHero: true })
      .sort({ publishedAt: -1 })
      .populate(ARTICLE_POPULATE);
    if (!hero) {
      hero = await Article.findOne({ status: 'published' })
        .sort({ publishedAt: -1 })
        .populate(ARTICLE_POPULATE);
    }

    const excludeIds = hero ? [hero._id] : [];

    // Side news: manually pinned slots (1-4) first, in slot order. Backfill
    // any unfilled slots with the most recent remaining published articles
    // so the layout never shows a gap.
    const pinnedSide = await Article.find({ status: 'published', sideNewsOrder: { $in: [1, 2, 3, 4] }, _id: { $nin: excludeIds } })
      .sort({ sideNewsOrder: 1 })
      .populate(ARTICLE_POPULATE);

    let sideNews = pinnedSide;
    if (sideNews.length < SIDE_NEWS_COUNT) {
      const fillIds = [...excludeIds, ...sideNews.map(a => a._id)];
      const backfill = await Article.find({ status: 'published', _id: { $nin: fillIds } })
        .sort({ publishedAt: -1 })
        .limit(SIDE_NEWS_COUNT - sideNews.length)
        .populate(ARTICLE_POPULATE);
      sideNews = [...sideNews, ...backfill];
    }

    excludeIds.push(...sideNews.map(a => a._id));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const latestQuery = { status: 'published', _id: { $nin: excludeIds } };
    const totalLatest = await Article.countDocuments(latestQuery);
    const latestNews = await Article.find(latestQuery)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate(ARTICLE_POPULATE);

    // Only the first page of latest news actually claims articles out of
    // the rotation — later pages ("load more") are just deeper into the
    // same already-excluded pool, so Top Stories shouldn't also exclude
    // articles that are merely on page 2+ of latest news.
    if (parseInt(page) === 1) excludeIds.push(...latestNews.map(a => a._id));

    // Top Stories: one tab per top-level category, pulling whatever's next
    // in that category's recency order that hasn't already been claimed.
    const allTopLevel = await Category.find({ $or: [{ parent: null }, { parent: '' }, { parent: { $exists: false } }] }).sort({ order: 1, name: 1 });
    const topCategories = allTopLevel.slice(0, TOP_STORIES_TABS);

    const topStoriesByCategory = [];
    for (const cat of topCategories) {
      const catQuery = { status: 'published', category: cat._id, _id: { $nin: excludeIds } };

      const pinned = await Article.find({ ...catQuery, isTopStory: true })
        .sort({ publishedAt: -1 })
        .limit(TOP_STORIES_HOME_COUNT)
        .populate(ARTICLE_POPULATE);

      let articles = pinned;
      if (articles.length < TOP_STORIES_HOME_COUNT) {
        const fillIds = [...excludeIds, ...articles.map(a => a._id)];
        const backfill = await Article.find({ status: 'published', category: cat._id, _id: { $nin: fillIds } })
          .sort({ publishedAt: -1 })
          .limit(TOP_STORIES_HOME_COUNT - articles.length)
          .populate(ARTICLE_POPULATE);
        articles = [...articles, ...backfill];
      }

      excludeIds.push(...articles.map(a => a._id));
      topStoriesByCategory.push({ category: { _id: cat._id, name: cat.name, slug: cat.slug }, articles });
    }

    res.json({
      success: true,
      data: {
        hero,
        sideNews,
        latestNews,
        latestNewsPagination: {
          total: totalLatest,
          pages: Math.ceil(totalLatest / parseInt(limit)),
          currentPage: parseInt(page),
        },
        topStoriesByCategory,
      },
    });
  } catch (error) { next(error); }
};

// @desc    Admin view of the home layout — same shape as getHomeFeed, but
//          also usable for management (shows which article holds which
//          slot so the admin UI can offer "change"/"remove" actions).
// @route   GET /api/articles/admin/home-layout
exports.getAdminHomeLayout = async (req, res, next) => {
  try {
    const hero = await Article.findOne({ isHero: true }).populate(ARTICLE_POPULATE);

    const sideSlots = await Article.find({ sideNewsOrder: { $in: [1, 2, 3, 4] } })
      .sort({ sideNewsOrder: 1 })
      .populate(ARTICLE_POPULATE);

    const sideNews = [1, 2, 3, 4].map(slot => sideSlots.find(a => a.sideNewsOrder === slot) || null);

    const { page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const excludeIds = [hero?._id, ...sideSlots.map(a => a._id)].filter(Boolean);
    const latestQuery = { status: 'published', _id: { $nin: excludeIds } };
    const total = await Article.countDocuments(latestQuery);
    const latestNews = await Article.find(latestQuery)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate(ARTICLE_POPULATE);

    res.json({
      success: true,
      data: {
        hero,
        sideNews,
        latestNews,
        latestNewsPagination: { total, pages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) },
      },
    });
  } catch (error) { next(error); }
};

// @desc    Assign/remove an article's homepage position (hero / one of the
//          4 side-news slots / none). Handles exclusivity: setting an
//          article as hero demotes whichever article held it before;
//          assigning a side slot bumps out whichever article held that
//          slot before. An article can only hold one position at a time.
// @route   PUT /api/articles/:id/home-position
// @body    { position: 'hero' | 'side' | 'none', slot?: 1 | 2 | 3 | 4 }
exports.setHomePosition = async (req, res, next) => {
  try {
    const { position, slot } = req.body;
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    if (position === 'hero') {
      await Article.updateMany({ _id: { $ne: article._id }, isHero: true }, { $set: { isHero: false } });
      article.isHero = true;
      article.sideNewsOrder = null;
    } else if (position === 'side') {
      if (![1, 2, 3, 4].includes(slot)) {
        return res.status(400).json({ success: false, message: 'A valid "slot" (1-4) is required for position "side"' });
      }
      await Article.updateMany({ _id: { $ne: article._id }, sideNewsOrder: slot }, { $set: { sideNewsOrder: null } });
      article.isHero = false;
      article.sideNewsOrder = slot;
    } else if (position === 'none') {
      article.isHero = false;
      article.sideNewsOrder = null;
    } else {
      return res.status(400).json({ success: false, message: 'position must be "hero", "side", or "none"' });
    }

    await article.save();
    const populated = await article.populate(ARTICLE_POPULATE);
    res.json({ success: true, data: populated });
  } catch (error) { next(error); }
};

// @desc    Get single article by slug (public)
// @route   GET /api/articles/:slug
exports.getArticle = async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, status: 'published' })
      .populate('category', 'name slug')
      .populate('author', 'name avatar');
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    await article.incrementViews();
    res.json({ success: true, data: article });
  } catch (error) { next(error); }
};

// @desc    Get all articles for admin (all statuses)
// @route   GET /api/articles/admin/all
exports.getAdminArticles = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    // Writers can only see their own articles
    if (req.user.role === 'writer') query.author = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Article.countDocuments(query);
    const articles = await Article.find(query)
      .populate('category', 'name')
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, count: articles.length, total, pages: Math.ceil(total / parseInt(limit)), data: articles });
  } catch (error) { next(error); }
};

// @desc    Create article
// @route   POST /api/articles
exports.createArticle = async (req, res, next) => {
  try {
    req.body.author = req.user._id;
    const article = await Article.create(req.body);
    res.status(201).json({ success: true, data: article });
  } catch (error) { next(error); }
};

// @desc    Update article
// @route   PUT /api/articles/:id
exports.updateArticle = async (req, res, next) => {
  try {
    let article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    // Writers can only edit their own
    if (req.user.role === 'writer' && article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this article' });
    }
    article = await Article.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: article });
  } catch (error) { next(error); }
};

// @desc    Delete article
// @route   DELETE /api/articles/:id
exports.deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    // Delete image from cloudinary
    if (article.featuredImage.publicId) {
      await cloudinary.uploader.destroy(article.featuredImage.publicId);
    }
    await article.deleteOne();
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) { next(error); }
};

// @desc    Get related articles
// @route   GET /api/articles/:id/related
exports.getRelated = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    const related = await Article.find({
      _id: { $ne: article._id },
      category: article.category,
      status: 'published',
    }).limit(4).populate('category', 'name slug').populate('author', 'name');
    res.json({ success: true, data: related });
  } catch (error) { next(error); }
};
