const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const KSUID = require('ksuid');

// Import PowerTools utilities
const { 
  logger, 
  tracer, 
  createRouteSegment, 
  addCustomMetric, 
  MetricUnit 
} = require('../utils/powertools');

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
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
  const subsegment = createRouteSegment('events', 'logEvent');
  
  try {
    const email = getUserEmailFromToken(req);
    const { eventType, eventData } = req.body;
    
    logger.info('Logging web event', {
      operation: 'logEvent',
      userEmail: email,
      eventType: eventType,
      hasEventData: !!eventData
    });

    if (!eventType) {
      logger.warn('Missing event type in request', {
        userEmail: email,
        providedEventType: eventType
      });
      addCustomMetric('EventValidationErrors', 1, MetricUnit.Count);
      return res.status(400).json({ error: 'Event type is required' });
    }

    const timestamp = new Date().toISOString();
    const eventId = KSUID.randomSync().string;

    logger.info('Generated event details', {
      eventId,
      eventType,
      userEmail: email,
      timestamp
    });

    const params = {
      TableName: TABLE_NAME,
      Item: {
        PK: `EVENT#${eventId}`,
        SK: `EVENT#${timestamp}`,
        entityType: 'EVENT',
        eventType: eventType,
        eventData: eventData || {},
        email: email,
        createdAt: timestamp,
        lastModified: timestamp
      }
    };

    // Add metadata to tracer
    tracer.addMetadata('event_logging', {
      eventId,
      eventType,
      userEmail: email,
      timestamp,
      eventDataKeys: eventData ? Object.keys(eventData) : []
    });

    // Add DynamoDB operation metadata
    tracer.addMetadata('dynamodb_write', {
      tableName: TABLE_NAME,
      operation: 'put_event',
      eventId,
      eventType
    });

    const command = new PutCommand(params);
    await docClient.send(command);

    logger.info('Event logged successfully', {
      eventId,
      eventType,
      userEmail: email
    });

    // Add metrics
    addCustomMetric('EventsLogged', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBWrites', 1, MetricUnit.Count, { operation: 'logEvent' });
    addCustomMetric(`${eventType}Events`, 1, MetricUnit.Count);

    // Track event data complexity
    if (eventData) {
      const eventDataSize = JSON.stringify(eventData).length;
      addCustomMetric('EventDataSize', eventDataSize, MetricUnit.Bytes);
      addCustomMetric('EventsWithData', 1, MetricUnit.Count);
    }
    
    res.status(201).json({
      eventId: eventId,
      timestamp: timestamp,
      eventType: eventType
    });

  } catch (err) {
    logger.error('Error logging event', {
      error: err.message,
      stack: err.stack,
      userEmail: getUserEmailFromToken(req),
      eventType: req.body?.eventType,
      operation: 'logEvent'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('EventLoggingErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not log event' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
