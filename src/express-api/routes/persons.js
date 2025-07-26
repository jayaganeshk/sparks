const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// GET /persons - Get all unique people detected across photos
router.get('/', async (req, res) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'PERSON',
    }
  };

  try {
    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);
    
    res.json({
      items: Items.map(person => ({
        personId: person.personId,
        name: person.name || 'Unknown',
        faceCount: person.faceCount || 0,
        thumbnailUrl: person.thumbnailUrl
      }))
    });
  } catch (err) {
    console.error("Error querying DynamoDB for persons:", err);
    res.status(500).json({ error: 'Could not retrieve persons' });
  }
});

// GET /persons/:personId/photos - Get photos that a specific person is tagged in
router.get('/:personId/photos', async (req, res) => {
  const { personId } = req.params;
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
    IndexName: 'personId-PK-index',
    KeyConditionExpression: 'personId = :personId',
    ExpressionAttributeValues: {
      ':personId': personId,
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
    console.error(`Error querying DynamoDB for photos with person ${personId}:`, err);
    res.status(500).json({ error: 'Could not retrieve photos for this person' });
  }
});

module.exports = router;
