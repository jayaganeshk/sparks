const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
require("dotenv").config();

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

const photosRouter = require('./routes/photos');
const usersRouter = require('./routes/users');
const meRouter = require('./routes/me');
const personsRouter = require('./routes/persons');
const uploadRouter = require('./routes/upload');
const eventsRouter = require('./routes/events');
const livestreamRouter = require('./routes/livestream');
const organizersRouter = require('./routes/organizers');

app.use('/photos', photosRouter);
app.use('/users', usersRouter);
app.use('/me', meRouter);
app.use('/persons', personsRouter);
app.use('/upload', uploadRouter);
app.use('/events', eventsRouter);
app.use('/livestream', livestreamRouter);
app.use('/organizers', organizersRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Sparks API is running!' });
});

// Export the app for local development
module.exports.app = app;

// Export the handler for Lambda
module.exports.handler = serverless(app);
