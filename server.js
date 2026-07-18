require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect to database
connectDB();

const app = express();

// Sit behind a reverse proxy on most hosts (Render, etc). Without this,
// express-rate-limit can't read the real client IP from X-Forwarded-For
// and ends up sharing one rate-limit bucket across all visitors.
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
// CLIENT_URL can be a single origin or a comma-separated list (e.g. the
// public news site AND the admin panel, which are two different Netlify
// deployments hitting the same API).
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/page-sections', require('./routes/pageSections'));
app.use('/api/nav-items', require('./routes/navItems'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Tave News API is running', status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Tave News API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});