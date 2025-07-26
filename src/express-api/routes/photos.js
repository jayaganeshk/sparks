const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// GET /photos - Fetches all photos, with pagination
router.get('/', async (req, res) => {
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
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'IMAGE',
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
    console.error("Error querying DynamoDB for photos:", err);
    res.status(500).json({ error: 'Could not retrieve photos' });
  }
});

module.exports = router;
