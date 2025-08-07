const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

/**
 * POST /feedback
 * Submit user feedback
 * 
 * Request body:
 * {
 *   type: string,      // 'BUG', 'FEATURE', 'GENERAL'
 *   message: string,   // User feedback message
 *   rating: number,    // Optional: User rating (1-5)
 *   email: string,     // Optional: User email for follow-up
 *   metadata: object   // Optional: Additional metadata (e.g., browser, device)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { type, message, rating, email, metadata } = req.body;

    // Validate required fields
    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required fields' });
    }

    // Validate type value
    const validTypes = ['BUG', 'FEATURE', 'GENERAL'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    // Generate a unique ID for the feedback
    // Use a consistent ID format with timestamp for sorting in GSI
    const timestamp = Date.now();
    const feedbackId = `FEEDBACK#${timestamp}`;
    
    // Create feedback item for DynamoDB
    const feedbackItem = {
      PK: feedbackId,
      SK: feedbackId,  // Same as PK for direct item lookup
      GSI1PK: 'FEEDBACK',  // For querying all feedback items
      GSI1SK: timestamp.toString(),  // For sorting by timestamp (newest first)
      entityType: 'FEEDBACK',  // Works with existing entityType-PK-index
      type,  // GENERAL, FEATURE, BUG
      message,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'NEW' // Status can be 'NEW', 'IN_REVIEW', 'RESOLVED'
    };

    // Add optional fields if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      feedbackItem.rating = rating;
    }

    if (email) {
      feedbackItem.email = email;
    }

    if (metadata) {
      feedbackItem.metadata = metadata;
    }

    // Add user information if authenticated
    if (req.user) {
      feedbackItem.userId = req.user.username;
    }

    // Save to DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: feedbackItem
    };

    await docClient.send(new PutCommand(params));

    // Return success response
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Could not process feedback submission' });
  }
});

/**
 * GET /feedback
 * Get all feedback items (Admin only)
 * Pagination supported
 */
router.get('/', async (req, res) => {
  try {
    // This endpoint should be protected by admin authorization middleware
    // For now, we'll implement the basic functionality
    
    const { lastEvaluatedKey } = req.query;

    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'FEEDBACK'
      },
      Limit: 50,
      ScanIndexForward: false // Sort by PK in descending order (newest first)
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    res.json({
      items: Items,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null
    });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({ error: 'Could not retrieve feedback items' });
  }
});

/**
 * GET /feedback/:id
 * Get a specific feedback item by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: id,
        SK: id
      }
    };

    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(Item);
  } catch (error) {
    console.error(`Error retrieving feedback ${req.params.id}:`, error);
    res.status(500).json({ error: 'Could not retrieve feedback' });
  }
});

module.exports = router;
