require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// Import routes
const enrollRoutes = require('./routes/enroll');
const creditsRoutes = require('./routes/credits');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (frontend)
app.use(express.static('public'));

// Request logging middleware (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'credit-engine',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    service: 'Credit Engine API',
    description: 'Lightweight API that issues and tracks thank-you credits for ecosystem interactions',
    version: '1.0.0',
    endpoints: {
      enrollment: {
        'POST /api/enroll': 'Enroll user and award credits with optional referral bonus',
        'POST /api/enroll/batch': 'Batch enrollment for multiple users'
      },
      credits: {
        'GET /api/credits/:userId': 'Get user credit totals and summary',
        'GET /api/credits/:userId/events': 'Get paginated credit events for user',
        'GET /api/credits/:userId/referrals': 'Get referral bonus summary for user',
        'POST /api/credits': 'Award credits for various actions',
        'GET /api/credits/system/stats': 'Get system-wide statistics'
      },
      utility: {
        'GET /health': 'Health check endpoint',
        'GET /api': 'API information'
      }
    },
    actionTypes: [
      'enrollment',
      'referral_bonus', 
      'social_post',
      'tech_module',
      'spend_multiplier',
      'coffee_wall',
      'other'
    ]
  });
});

// API Routes
app.use('/api/enroll', enrollRoutes);
app.use('/api/credits', creditsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/enroll',
      'GET /api/credits/:userId'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // MongoDB duplicate key error
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry detected',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validationErrors
    });
  }

  // MongoDB cast error
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid data format',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // JSON parse error
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format in request body'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Credit Engine API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/`);
});

module.exports = app; 