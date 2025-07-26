const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// GET /livestream - Check for and retrieve the current live stream configuration
router.get('/', async (req, res) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'LIVESTREAM',
    },
    ScanIndexForward: false, // Get the most recent livestream first
    Limit: 1
  };

  try {
    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);
    
    if (Items && Items.length > 0) {
      const livestream = Items[0];
      
      // Check if the livestream is active (not expired)
      const now = new Date();
      const endTime = new Date(livestream.endTime);
      
      if (endTime > now) {
        return res.json({
          active: true,
          streamUrl: livestream.streamUrl,
          title: livestream.title,
          description: livestream.description,
          startTime: livestream.startTime,
          endTime: livestream.endTime
        });
      }
    }
    
    // No active livestream found
    res.json({
      active: false
    });
  } catch (err) {
    console.error("Error querying DynamoDB for livestream:", err);
    res.status(500).json({ error: 'Could not retrieve livestream information' });
  }
});

module.exports = router;
