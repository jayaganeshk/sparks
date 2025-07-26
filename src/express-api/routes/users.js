const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// GET /users - Get all users who have uploaded photos
router.get('/', async (req, res) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'USER',
    }
  };

  try {
    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);
    
    res.json({
      items: Items.map(user => ({
        email: user.email,
        displayName: user.displayName,
        uploadLimit: user.uploadLimit || 100,
        createdAt: user.createdAt
      }))
    });
  } catch (err) {
    console.error("Error querying DynamoDB for users:", err);
    res.status(500).json({ error: 'Could not retrieve users' });
  }
});

// GET /users/:email/photos - Get photos uploaded by a specific user
router.get('/:email/photos', async (req, res) => {
  const { email } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  let exclusiveStartKey = undefined;

  if (req.query.lastEvaluatedKey) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(req.query.lastEvaluatedKey, 'base64').toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid lastEvaluatedKey' });
    }
  }

  const params = {
    TableName: TABLE_NAME,
    IndexName: 'email-PK-index',
    KeyConditionExpression: 'email = :email AND begins_with(PK, :prefix)',
    ExpressionAttributeValues: {
      ':email': email,
      ':prefix': 'IMAGE#'
    },
    ScanIndexForward: false, // Sort by PK (timestamp) in descending order
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  };

  try {
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    const response = {
      items: Items,
      lastEvaluatedKey: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : null,
    };

    res.json(response);
  } catch (err) {
    console.error(`Error querying DynamoDB for photos by user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve photos for this user' });
  }
});

module.exports = router;
