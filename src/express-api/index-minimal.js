const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
require("dotenv").config();

const app = express();

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS || 'https://yourdomain.com'
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Add routes
const photosRouter = require('./routes/photos');
const usersRouter = require('./routes/users');
const meRouter = require('./routes/me');
const personsRouter = require('./routes/persons');
const uploadRouter = require('./routes/upload');
const eventsRouter = require('./routes/events');
const livestreamRouter = require('./routes/livestream');
const proxyRouter = require('./routes/proxy');

app.use('/photos', photosRouter);
app.use('/users', usersRouter);
app.use('/me', meRouter);
app.use('/persons', personsRouter);
app.use('/upload', uploadRouter);
app.use('/events', eventsRouter);
app.use('/livestream', livestreamRouter);
app.use('/proxy', proxyRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sparks API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0-minimal'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export the app for local development
module.exports.app = app;

// Simple handler without PowerTools for now
module.exports.handler = serverless(app);
