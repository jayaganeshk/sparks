const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

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

// GET /livestream - Check for and retrieve the current live stream configuration
router.get('/', async (req, res) => {
  const subsegment = createRouteSegment('livestream', 'getCurrentLivestream');
  
  try {
    logger.info('Checking for active livestream', {
      operation: 'getCurrentLivestream'
    });

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

    // Add DynamoDB query metadata to tracer
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'entityType-PK-index',
      operation: 'query_livestream',
      limit: 1
    });

    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);

    logger.info('DynamoDB query completed for livestream', {
      livestreamCount: Items?.length || 0
    });

    // Add metrics
    addCustomMetric('LivestreamQueries', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getCurrentLivestream' });
    
    if (Items && Items.length > 0) {
      const livestream = Items[0];
      
      logger.info('Found livestream record', {
        livestreamId: livestream.PK,
        title: livestream.title,
        startTime: livestream.startTime,
        endTime: livestream.endTime
      });

      // Check if the livestream is active (not expired)
      const now = new Date();
      const endTime = new Date(livestream.endTime);
      const isActive = endTime > now;
      
      logger.info('Livestream status checked', {
        livestreamId: livestream.PK,
        isActive,
        currentTime: now.toISOString(),
        endTime: livestream.endTime
      });

      // Add metadata to tracer
      tracer.addMetadata('livestream_check', {
        livestreamId: livestream.PK,
        title: livestream.title,
        isActive,
        currentTime: now.toISOString(),
        endTime: livestream.endTime,
        startTime: livestream.startTime
      });

      if (isActive) {
        logger.info('Active livestream found', {
          livestreamId: livestream.PK,
          title: livestream.title
        });

        // Add metrics for active livestream
        addCustomMetric('ActiveLivestreamsFound', 1, MetricUnit.Count);
        addCustomMetric('LivestreamViewRequests', 1, MetricUnit.Count);

        return res.json({
          active: true,
          streamUrl: livestream.streamUrl,
          title: livestream.title,
          description: livestream.description,
          startTime: livestream.startTime,
          endTime: livestream.endTime,
          livestreamId: livestream.PK
        });
      } else {
        logger.info('Livestream found but expired', {
          livestreamId: livestream.PK,
          endTime: livestream.endTime,
          currentTime: now.toISOString()
        });

        addCustomMetric('ExpiredLivestreamsFound', 1, MetricUnit.Count);
      }
    } else {
      logger.info('No livestream records found');
      addCustomMetric('NoLivestreamsFound', 1, MetricUnit.Count);
    }
    
    // No active livestream found
    logger.info('No active livestream available');
    addCustomMetric('InactiveLivestreamRequests', 1, MetricUnit.Count);

    res.json({
      active: false,
      message: 'No active livestream available'
    });

  } catch (err) {
    logger.error('Error querying DynamoDB for livestream', {
      error: err.message,
      stack: err.stack,
      operation: 'getCurrentLivestream'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('LivestreamQueryErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve livestream information' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
