const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { getSignedUrl } = require('../utils/cloudfront');

// Import PowerTools utilities with enhanced user context support
const { 
  logger, 
  tracer, 
  createRouteSegment, 
  addCustomMetric, 
  MetricUnit,
  trackBusinessMetric,
  trackUserActivity,
  trackFeatureUsage,
  trackContentInteraction
} = require('../utils/powertools');

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// URL expiration time in seconds (24 hours)
const URL_EXPIRATION = 24 * 60 * 60;

// GET /photos - Get all photos with pagination
router.get('/', async (req, res) => {
  const subsegment = createRouteSegment('photos', 'getAllPhotos', req.userContext);
  
  try {
    const { lastEvaluatedKey } = req.query;
    const userContext = req.userContext;

    logger.info('Fetching photos', {
      operation: 'getAllPhotos',
      hasLastEvaluatedKey: !!lastEvaluatedKey,
      limit: 100,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    // Track user activity
    trackUserActivity('PhotoBrowsing', userContext, {
      hasLastEvaluatedKey: !!lastEvaluatedKey
    });

    // Track feature usage
    trackFeatureUsage('PhotoGallery', userContext);

    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'IMAGE',
      },
      Limit: 100,
      ScanIndexForward: false, // Sort by PK (timestamp) in descending order
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      logger.info('Using pagination', { lastEvaluatedKey, userId: userContext?.userId });
    }

    // Add DynamoDB query metadata to tracer with user context
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'entityType-PK-index',
      operation: 'query',
      limit: 100,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    logger.info('DynamoDB query completed', {
      itemCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    // Enhanced metrics with user context
    trackBusinessMetric('PhotosQueried', Items?.length || 0, userContext);
    trackBusinessMetric('DynamoDBQueries', 1, userContext, { operation: 'getAllPhotos' });

    // Track pagination usage
    if (lastEvaluatedKey) {
      trackBusinessMetric('PaginationUsage', 1, userContext, { feature: 'photos' });
    }

    // Generate signed URLs for images
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrls');
    
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
      const thumbnailUrl = item.thumbnailFileName ? CLOUDFRONT_DOMAIN + item.thumbnailFileName : null;
      
      // Generate signed URLs
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

    // Track signed URL generation with user context
    const signedUrlsCount = itemsWithSignedUrls.length * 2; // Approximate count
    trackBusinessMetric('SignedUrlsGenerated', signedUrlsCount, userContext);

    // Track content interaction
    trackContentInteraction('Photo', 'Browse', userContext, {
      photoCount: itemsWithSignedUrls.length,
      hasMoreResults: !!LastEvaluatedKey
    });

    logger.info('Photos retrieved successfully', {
      totalPhotos: itemsWithSignedUrls.length,
      hasMoreResults: !!LastEvaluatedKey,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });

  } catch (err) {
    logger.error('Error getting photos', {
      error: err.message,
      stack: err.stack,
      operation: 'getAllPhotos',
      userId: req.userContext?.userId,
      userType: req.userContext?.userType
    });

    tracer.addErrorAsMetadata(err);
    trackBusinessMetric('PhotosQueryErrors', 1, req.userContext);

    res.status(500).json({ error: 'Could not retrieve photos' });
  } finally {
    subsegment?.close();
  }
});

// GET /photos/:id - Get a specific photo by ID
router.get('/:id', async (req, res) => {
  const subsegment = createRouteSegment('photos', 'getPhotoById', req.userContext);
  
  try {
    const { id } = req.params;
    const userContext = req.userContext;

    logger.info('Fetching photo by ID', {
      operation: 'getPhotoById',
      photoId: id,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    // Track user activity
    trackUserActivity('PhotoViewing', userContext, { photoId: id });
    trackFeatureUsage('PhotoDetail', userContext);

    // Query for the photo with the given ID
    const photoParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': id,
      },
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      operation: 'query',
      photoId: id,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    const command = new QueryCommand(photoParams);
    const { Items } = await docClient.send(command);

    if (!Items || Items.length === 0) {
      logger.warn('Photo not found', { 
        photoId: id,
        userId: userContext?.userId 
      });
      trackBusinessMetric('PhotoNotFound', 1, userContext);
      return res.status(404).json({ error: 'Photo not found' });
    }

    logger.info('Photo found', { 
      photoId: id, 
      itemCount: Items.length,
      userId: userContext?.userId,
      uploadedBy: Items[0].uploadedBy
    });

    // Generate signed URLs for the photo
    const imageUrl = CLOUDFRONT_DOMAIN + Items[0].s3Key;
    const thumbnailUrl = Items[0].thumbnailFileName ? CLOUDFRONT_DOMAIN + Items[0].thumbnailFileName : null;
    
    // Generate signed URLs
    const signedImageUrl = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
    const signedThumbnailUrl = thumbnailUrl ? await getSignedUrl(thumbnailUrl, { expireTime: URL_EXPIRATION }) : null;
    
    const photo = {
      ...Items[0],
      s3Key: signedImageUrl,
      thumbnailFileName: signedThumbnailUrl
    };

    // Enhanced business metrics
    trackBusinessMetric('PhotoRetrieved', 1, userContext);
    trackBusinessMetric('DynamoDBQueries', 1, userContext, { operation: 'getPhotoById' });
    trackBusinessMetric('SignedUrlsGenerated', 2, userContext);

    // Track content interaction
    trackContentInteraction('Photo', 'View', userContext, {
      photoId: id,
      uploadedBy: Items[0].uploadedBy,
      isOwnPhoto: userContext?.email === Items[0].uploadedBy
    });

    // Track if user is viewing their own photo vs others'
    if (userContext?.email === Items[0].uploadedBy) {
      trackBusinessMetric('OwnPhotoViews', 1, userContext);
    } else {
      trackBusinessMetric('OtherPhotoViews', 1, userContext);
    }

    logger.info('Photo retrieved successfully', { 
      photoId: id,
      userId: userContext?.userId,
      isOwnPhoto: userContext?.email === Items[0].uploadedBy
    });

    res.json(photo);

  } catch (err) {
    logger.error('Error retrieving photo', {
      error: err.message,
      stack: err.stack,
      photoId: req.params.id,
      operation: 'getPhotoById',
      userId: req.userContext?.userId,
      userType: req.userContext?.userType
    });

    tracer.addErrorAsMetadata(err);
    trackBusinessMetric('PhotoRetrievalErrors', 1, req.userContext);

    res.status(500).json({ error: 'Could not retrieve photo' });
  } finally {
    subsegment?.close();
  }
});

// GET /photos/:id/persons - Get persons detected in a specific photo
router.get('/:id/persons', async (req, res) => {
  const subsegment = createRouteSegment('photos', 'getPhotoPersons', req.userContext);
  
  try {
    const { id } = req.params;
    const userContext = req.userContext;

    logger.info('Fetching persons for photo', {
      operation: 'getPhotoPersons',
      photoId: id,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    // Track user activity
    trackUserActivity('FaceRecognitionViewing', userContext, { photoId: id });
    trackFeatureUsage('FaceRecognition', userContext);

    // Query for TAGGING entities with the photo's PK
    const taggingParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'begins_with(entityType, :entityTypePrefix)',
      ExpressionAttributeValues: {
        ':pk': id,
        ':entityTypePrefix': 'TAGGING',
      },
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      operation: 'query_tagging',
      photoId: id,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    const taggingCommand = new QueryCommand(taggingParams);
    const { Items: taggingItems } = await docClient.send(taggingCommand);

    if (!taggingItems || taggingItems.length === 0) {
      logger.info('No persons found for photo', { 
        photoId: id,
        userId: userContext?.userId 
      });
      trackBusinessMetric('PhotoPersonsNotFound', 1, userContext);
      return res.json({ items: [] });
    }

    logger.info('Found tagging items', { 
      photoId: id, 
      taggingCount: taggingItems.length,
      userId: userContext?.userId
    });

    // Extract person IDs from the tagging items
    const personIds = taggingItems.map(item => {
      // Extract person ID from SK (format: 'PERSON#personId')
      const parts = item.SK.split('#');
      return parts.length > 1 ? parts[1] : null;
    }).filter(id => id); // Filter out any null values

    logger.info('Extracted person IDs', { 
      photoId: id, 
      personIds: personIds.length,
      userId: userContext?.userId
    });

    // Fetch person details
    const personSubsegment = subsegment?.addNewSubsegment('fetchPersonDetails');
    
    const personPromises = personIds.map(personId => {
      const personParams = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `PERSON#${personId}`,
          ':sk': personId,
        },
      };
      return docClient.send(new QueryCommand(personParams));
    });

    const personResults = await Promise.all(personPromises);
    personSubsegment?.close();

    // Extract person details and add CloudFront URL for person image
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generatePersonSignedUrls');
    
    const personsPromises = personResults
      .flatMap(result => result.Items)
      .filter(item => item) // Filter out any undefined items
      .map(async person => {
        const imageUrl = CLOUDFRONT_DOMAIN + 'persons/' + person.SK + '.jpg';
        const signedImageUrl = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
        
        return {
          personId: person.SK,
          name: person.displayName || person.SK,
          imageUrl: signedImageUrl
        };
      });
      
    const persons = await Promise.all(personsPromises);
    signedUrlSubsegment?.close();

    // Enhanced business metrics
    trackBusinessMetric('PhotoPersonsRetrieved', persons.length, userContext);
    trackBusinessMetric('DynamoDBQueries', personIds.length + 1, userContext, { operation: 'getPhotoPersons' });
    trackBusinessMetric('SignedUrlsGenerated', persons.length, userContext);

    // Track face recognition engagement
    trackContentInteraction('FaceRecognition', 'View', userContext, {
      photoId: id,
      personsFound: persons.length
    });

    // Track face recognition effectiveness
    if (persons.length > 0) {
      trackBusinessMetric('PhotosWithFacesViewed', 1, userContext);
      trackBusinessMetric('FacesDetectedViewed', persons.length, userContext);
    } else {
      trackBusinessMetric('PhotosWithoutFacesViewed', 1, userContext);
    }

    logger.info('Photo persons retrieved successfully', {
      photoId: id,
      personCount: persons.length,
      userId: userContext?.userId,
      userType: userContext?.userType
    });

    res.json({ items: persons });

  } catch (err) {
    logger.error('Error retrieving persons for photo', {
      error: err.message,
      stack: err.stack,
      photoId: req.params.id,
      operation: 'getPhotoPersons',
      userId: req.userContext?.userId,
      userType: req.userContext?.userType
    });

    tracer.addErrorAsMetadata(err);
    trackBusinessMetric('PhotoPersonsErrors', 1, req.userContext);

    res.status(500).json({ error: 'Could not retrieve persons for this photo' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
