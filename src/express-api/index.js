require("dotenv").config();

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const authMiddleware = require('./middleware/auth');
const logger = require('./middleware/logger');

const app = express();

// Configure CORS with specific options for Sparks photo sharing platform
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS || 'https://yourdomain.com'
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: false
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());

// Apply structured JSON logging middleware to all requests
app.use(logger);

// Apply authentication middleware to all API routes
// Root path ('/') will remain accessible without authentication

const photosRouter = require('./routes/photos');
const usersRouter = require('./routes/users');
const meRouter = require('./routes/me');
const personsRouter = require('./routes/persons');
const uploadRouter = require('./routes/upload');
const eventsRouter = require('./routes/events');
const livestreamRouter = require('./routes/livestream');
const proxyRouter = require('./routes/proxy');
const feedbackRouter = require('./routes/feedback');

// Apply authentication and route handlers
app.use('/photos', authMiddleware, photosRouter);
app.use('/users', authMiddleware, usersRouter);
app.use('/me', authMiddleware, meRouter);
app.use('/persons', authMiddleware, personsRouter);
app.use('/upload', authMiddleware, uploadRouter);
app.use('/events', authMiddleware, eventsRouter);
app.use('/livestream', authMiddleware, livestreamRouter);
app.use('/proxy', authMiddleware, proxyRouter);
app.use('/feedback', authMiddleware, feedbackRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Sparks API is running!' });
});

// Export the app for local development
module.exports.app = app;

// Export the handler for Lambda
module.exports.handler = serverless(app);
