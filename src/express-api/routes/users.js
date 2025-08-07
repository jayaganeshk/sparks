const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { getSignedUrl } = require('../utils/cloudfront');

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
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// URL expiration time in seconds (24 hours)
const URL_EXPIRATION = 24 * 60 * 60;

// GET /users - Get all users with pagination
router.get('/', async (req, res) => {
  const subsegment = createRouteSegment('users', 'getAllUsers');
  
  try {
    const { lastEvaluatedKey } = req.query;

    logger.info('Fetching all users', {
      operation: 'getAllUsers',
      hasLastEvaluatedKey: !!lastEvaluatedKey,
      limit: 100
    });

    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'USER',
      },
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      logger.info('Using pagination', { lastEvaluatedKey });
    }

    // Add DynamoDB query metadata to tracer
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'entityType-PK-index',
      operation: 'query_users',
      limit: 100
    });

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    logger.info('DynamoDB query completed', {
      userCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    // Add metrics
    addCustomMetric('UsersQueried', Items?.length || 0, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getAllUsers' });

    logger.info('Users retrieved successfully', {
      totalUsers: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    res.json({
      items: Items,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });

  } catch (err) {
    logger.error('Error getting users', {
      error: err.message,
      stack: err.stack,
      operation: 'getAllUsers'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UsersQueryErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve users' });
  } finally {
    subsegment?.close();
  }
});

// GET /users/:email - Get user info
router.get('/:email', async (req, res) => {
  const subsegment = createRouteSegment('users', 'getUserByEmail');
  
  try {
    const { email } = req.params;

    logger.info('Fetching user by email', {
      operation: 'getUserByEmail',
      userEmail: email
    });

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: email,
        SK: email
      }
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      operation: 'get_user',
      userEmail: email
    });

    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      logger.warn('User not found', { userEmail: email });
      addCustomMetric('UserNotFound', 1, MetricUnit.Count);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User found', { 
      userEmail: email,
      username: Item.username 
    });

    // Add metrics
    addCustomMetric('UserRetrieved', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getUserByEmail' });

    res.json(Item);

  } catch (err) {
    logger.error('Error getting user info', {
      error: err.message,
      stack: err.stack,
      userEmail: req.params.email,
      operation: 'getUserByEmail'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UserRetrievalErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve user info' });
  } finally {
    subsegment?.close();
  }
});

// GET /users/:email/photos - Get photos uploaded by a specific user with pagination
router.get('/:email/photos', async (req, res) => {
  const subsegment = createRouteSegment('users', 'getUserPhotos');
  
  try {
    const { email } = req.params;
    const { lastEvaluatedKey } = req.query;

    logger.info('Fetching user photos', {
      operation: 'getUserPhotos',
      userEmail: email,
      hasLastEvaluatedKey: !!lastEvaluatedKey,
      limit: 100
    });

    const params = {
      TableName: TABLE_NAME,
      IndexName: 'uploadedBy-PK-index',
      KeyConditionExpression: 'uploadedBy = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      logger.info('Using pagination for user photos', { 
        userEmail: email, 
        lastEvaluatedKey 
      });
    }

    // Add DynamoDB query metadata to tracer
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'uploadedBy-PK-index',
      operation: 'query_user_photos',
      userEmail: email,
      limit: 100
    });

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    logger.info('DynamoDB query completed for user photos', {
      userEmail: email,
      photoCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    // Add metrics
    addCustomMetric('UserPhotosQueried', Items?.length || 0, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getUserPhotos' });

    // Generate signed URLs for all images
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrls');
    
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      // Generate signed URLs for main image and thumbnail
      const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
      const thumbnailUrl = item.thumbnailFileName ? CLOUDFRONT_DOMAIN + item.thumbnailFileName : null;
      
      const signedImageUrl = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
      const signedThumbnailUrl = thumbnailUrl ? await getSignedUrl(thumbnailUrl, { expireTime: URL_EXPIRATION }) : null;
      
      // Generate signed URLs for processed images if they exist
      let processedImages = item.images;
      if (processedImages) {
        const signedProcessedImages = { ...processedImages };
        
        // Sign medium image if it exists
        if (processedImages.medium) {
          const mediumUrl = CLOUDFRONT_DOMAIN + processedImages.medium;
          signedProcessedImages.medium = await getSignedUrl(mediumUrl, { expireTime: URL_EXPIRATION });
        }
        
        // Sign large image if it exists
        if (processedImages.large) {
          const largeUrl = CLOUDFRONT_DOMAIN + processedImages.large;
          signedProcessedImages.large = await getSignedUrl(largeUrl, { expireTime: URL_EXPIRATION });
        }
        
        // Update the images object with signed URLs
        processedImages = signedProcessedImages;
      }
      
      return {
        ...item,
        s3Key: signedImageUrl,
        thumbnailFileName: signedThumbnailUrl,
        images: processedImages
      };
    }));

    signedUrlSubsegment?.close();

    // Calculate signed URLs generated
    const signedUrlsCount = itemsWithSignedUrls.reduce((count, item) => {
      let urls = 2; // main image + thumbnail
      if (item.images?.medium) urls++;
      if (item.images?.large) urls++;
      return count + urls;
    }, 0);

    // Add signed URL generation metrics
    addCustomMetric('SignedUrlsGenerated', signedUrlsCount, MetricUnit.Count);

    logger.info('User photos retrieved successfully', {
      userEmail: email,
      totalPhotos: itemsWithSignedUrls.length,
      signedUrlsGenerated: signedUrlsCount,
      hasMoreResults: !!LastEvaluatedKey
    });

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });

  } catch (err) {
    logger.error('Error getting photos for user', {
      error: err.message,
      stack: err.stack,
      userEmail: req.params.email,
      operation: 'getUserPhotos'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UserPhotosQueryErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve photos for this user' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
