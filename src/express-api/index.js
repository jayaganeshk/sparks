const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

app.use(cors());
app.use(express.json());

const photosRouter = require('./routes/photos');
const usersRouter = require('./routes/users');
const meRouter = require('./routes/me');
const personsRouter = require('./routes/persons');
const uploadRouter = require('./routes/upload');
const eventsRouter = require('./routes/events');
const livestreamRouter = require('./routes/livestream');

app.use('/photos', photosRouter);
app.use('/users', usersRouter);
app.use('/me', meRouter);
app.use('/persons', personsRouter);
app.use('/upload-url', uploadRouter);
app.use('/events', eventsRouter);
app.use('/livestream', livestreamRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Sparks API is running!' });
});

// Export the app for local development
module.exports.app = app;

// Export the handler for Lambda
module.exports.handler = serverless(app);
