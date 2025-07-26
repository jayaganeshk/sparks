const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  UpdateCommand 
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// Helper function to get the current user's email from the Cognito JWT token
function getUserEmailFromToken(req) {
  // In a real implementation, this would extract the email from the JWT token
  // For now, we'll use the 'x-user-email' header for testing
  return req.headers['x-user-email'] || 'unknown@example.com';
}

// GET /me/limit - Get the current user's upload limit
router.get('/limit', async (req, res) => {
  const email = getUserEmailFromToken(req);
  
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: `USER#${email}`
    }
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    
    if (!Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      uploadLimit: Item.uploadLimit || 100
    });
  } catch (err) {
    console.error(`Error getting upload limit for user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve upload limit' });
  }
});

// PUT /me/limit - Set the current user's upload limit (admin only)
router.put('/limit', async (req, res) => {
  const email = getUserEmailFromToken(req);
  const { limit } = req.body;
  
  if (!limit || typeof limit !== 'number' || limit < 0) {
    return res.status(400).json({ error: 'Invalid limit value' });
  }

  // In a real implementation, check if the user is an admin
  // For now, we'll allow any user to update their limit

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: `USER#${email}`
    },
    UpdateExpression: 'SET uploadLimit = :limit',
    ExpressionAttributeValues: {
      ':limit': limit
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);
    
    res.json({
      uploadLimit: Attributes.uploadLimit
    });
  } catch (err) {
    console.error(`Error updating upload limit for user ${email}:`, err);
    res.status(500).json({ error: 'Could not update upload limit' });
  }
});

// PUT /me/profile - Update the current user's display name
router.put('/profile', async (req, res) => {
  const email = getUserEmailFromToken(req);
  const { displayName } = req.body;
  
  if (!displayName || typeof displayName !== 'string') {
    return res.status(400).json({ error: 'Invalid display name' });
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: `USER#${email}`
    },
    UpdateExpression: 'SET displayName = :displayName',
    ExpressionAttributeValues: {
      ':displayName': displayName
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);
    
    res.json({
      email: Attributes.email,
      displayName: Attributes.displayName
    });
  } catch (err) {
    console.error(`Error updating profile for user ${email}:`, err);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

module.exports = router;
