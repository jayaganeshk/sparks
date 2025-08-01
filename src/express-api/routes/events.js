const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const KSUID = require('ksuid');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// Helper function to get the current user's email from the Cognito JWT token
function getUserEmailFromToken(req) {
  // In a real implementation, this would extract the email from the JWT token
  // For now, we'll use the 'x-user-email' header for testing
  return req.headers['x-user-email'] || 'unknown@example.com';
}

// POST /events - Log a web event
router.post('/', async (req, res) => {
  const email = getUserEmailFromToken(req);
  const { eventType, eventData } = req.body;
  
  if (!eventType) {
    return res.status(400).json({ error: 'Event type is required' });
  }

  const timestamp = new Date().toISOString();
  const eventId = KSUID.randomSync().string;

  const params = {
    TableName: TABLE_NAME,
    Item: {
      PK: `EVENT#${eventId}`,
      SK: `EVENT#${timestamp}`,
      entityType: 'EVENT',
      eventType: eventType,
      eventData: eventData || {},
      email: email,
      createdAt: timestamp
    }
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    
    res.status(201).json({
      eventId: eventId,
      timestamp: timestamp
    });
  } catch (err) {
    console.error(`Error logging event for user ${email}:`, err);
    res.status(500).json({ error: 'Could not log event' });
  }
});

module.exports = router;
