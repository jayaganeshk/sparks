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

// Simple health check route
app.get('/', (req, res) => {
  console.log('Health check endpoint hit');
  res.json({ 
    message: 'Sparks API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0-debug'
  });
});

// Simple test route
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Export the app for local development
module.exports.app = app;

// Simple serverless handler without PowerTools
const handler = serverless(app);

module.exports.handler = handler;
