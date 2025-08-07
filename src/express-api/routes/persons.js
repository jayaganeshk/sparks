const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
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

// GET /persons - Get all unique people with pagination
router.get('/', async (req, res) => {
  const subsegment = createRouteSegment('persons', 'getAllPersons');
  
  try {
    const { lastEvaluatedKey } = req.query;

    logger.info('Fetching all persons', {
      operation: 'getAllPersons',
      hasLastEvaluatedKey: !!lastEvaluatedKey,
      limit: 100
    });

    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'PERSON',
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
      operation: 'query_persons',
      limit: 100
    });

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    logger.info('DynamoDB query completed', {
      personCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    // Add metrics
    addCustomMetric('PersonsQueried', Items?.length || 0, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getAllPersons' });

    // Generate signed URLs for person images
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrls');
    
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      // Check if the person has an s3Key (image)
      if (item.s3Key) {
        const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
        const signedImageUrl = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
        return {
          ...item,
          s3Key: signedImageUrl
        };
      }
      return item;
    }));

    signedUrlSubsegment?.close();

    // Count signed URLs generated
    const signedUrlsCount = itemsWithSignedUrls.filter(item => item.s3Key).length;
    addCustomMetric('SignedUrlsGenerated', signedUrlsCount, MetricUnit.Count);

    logger.info('Persons retrieved successfully', {
      totalPersons: itemsWithSignedUrls.length,
      signedUrlsGenerated: signedUrlsCount,
      hasMoreResults: !!LastEvaluatedKey
    });

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });

  } catch (err) {
    logger.error('Error querying DynamoDB for persons', {
      error: err.message,
      stack: err.stack,
      operation: 'getAllPersons'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('PersonsQueryErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve persons' });
  } finally {
    subsegment?.close();
  }
});

// GET /persons/:personId - Get Person Info
router.get('/:personId', async (req, res) => {
  const subsegment = createRouteSegment('persons', 'getPersonById');
  
  try {
    const { personId } = req.params;

    logger.info('Fetching person by ID', {
      operation: 'getPersonById',
      personId: personId
    });

    // Get person info using entityType: PERSON and PK: PERSON#person4
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType and PK = :pk',
      ExpressionAttributeValues: {
        ':entityType': 'PERSON',
        ':pk': `PERSON#${personId}`,
      },
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'entityType-PK-index',
      operation: 'query_person',
      personId: personId
    });

    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);

    if (Items.length === 0) {
      logger.warn('Person not found', { personId });
      addCustomMetric('PersonNotFound', 1, MetricUnit.Count);
      return res.status(404).json({ error: 'Person not found.' });
    }

    logger.info('Person found', { 
      personId,
      displayName: Items[0].displayName 
    });

    // Add metrics
    addCustomMetric('PersonRetrieved', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getPersonById' });

    res.json(Items[0]);

  } catch (err) {
    logger.error('Error retrieving person', {
      error: err.message,
      stack: err.stack,
      personId: req.params.personId,
      operation: 'getPersonById'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('PersonRetrievalErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve person.' });
  } finally {
    subsegment?.close();
  }
});

// GET /persons/:personId/photos - Get photos that a specific person is tagged in
router.get('/:personId/photos', async (req, res) => {
  const subsegment = createRouteSegment('persons', 'getPersonPhotos');
  
  try {
    const { personId } = req.params;
    const { lastEvaluatedKey } = req.query;

    logger.info('Fetching photos for person', {
      operation: 'getPersonPhotos',
      personId: personId,
      hasLastEvaluatedKey: !!lastEvaluatedKey,
      limit: 100
    });

    // Use the entityType-PK-index to find all TAGGING# entries for this person
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': `TAGGING#${personId}`,
      },
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      logger.info('Using pagination for person photos', { 
        personId, 
        lastEvaluatedKey 
      });
    }

    // Add DynamoDB query metadata to tracer
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'entityType-PK-index',
      operation: 'query_person_photos',
      personId: personId,
      limit: 100
    });

    // First, query for all TAGGING# entries for this person
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    logger.info('DynamoDB query completed for person photos', {
      personId,
      photoCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    // Add metrics
    addCustomMetric('PersonPhotosQueried', Items?.length || 0, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getPersonPhotos' });

    // Generate signed URLs for all images in the tagging entries
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrls');
    
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      const result = { ...item };

      // Sign the main s3Key if it exists
      if (item.s3Key) {
        const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
        result.s3Key = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
      }

      // Sign images in the images object if it exists
      if (item.images) {
        const signedImages = { ...item.images };

        // Sign medium image if it exists
        if (item.images.medium) {
          const mediumUrl = CLOUDFRONT_DOMAIN + item.images.medium;
          signedImages.medium = await getSignedUrl(mediumUrl, { expireTime: URL_EXPIRATION });
        }

        // Sign large image if it exists
        if (item.images.large) {
          const largeUrl = CLOUDFRONT_DOMAIN + item.images.large;
          signedImages.large = await getSignedUrl(largeUrl, { expireTime: URL_EXPIRATION });
        }

        result.images = signedImages;
      }

      return result;
    }));

    signedUrlSubsegment?.close();

    // Calculate signed URLs generated
    const signedUrlsCount = itemsWithSignedUrls.reduce((count, item) => {
      let urls = 0;
      if (item.s3Key) urls++;
      if (item.images?.medium) urls++;
      if (item.images?.large) urls++;
      return count + urls;
    }, 0);

    // Add signed URL generation metrics
    addCustomMetric('SignedUrlsGenerated', signedUrlsCount, MetricUnit.Count);

    logger.info('Person photos retrieved successfully', {
      personId,
      totalPhotos: itemsWithSignedUrls.length,
      signedUrlsGenerated: signedUrlsCount,
      hasMoreResults: !!LastEvaluatedKey
    });

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });

  } catch (err) {
    logger.error('Error retrieving photos for person', {
      error: err.message,
      stack: err.stack,
      personId: req.params.personId,
      operation: 'getPersonPhotos'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('PersonPhotosQueryErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve photos for this person' });
  } finally {
    subsegment?.close();
  }
});

// PUT /persons/:personId - Update a person's name
router.put('/:personId', async (req, res) => {
  const subsegment = createRouteSegment('persons', 'updatePersonName');
  
  try {
    const { personId } = req.params;
    const { name } = req.body;

    logger.info('Updating person name', {
      operation: 'updatePersonName',
      personId: personId,
      newName: name
    });

    if (!name || typeof name !== 'string') {
      logger.warn('Invalid name provided for person update', { 
        personId, 
        providedName: name 
      });
      addCustomMetric('PersonUpdateValidationErrors', 1, MetricUnit.Count);
      return res.status(400).json({ error: 'Invalid name provided.' });
    }

    // Add validation metadata to tracer
    tracer.addMetadata('validation', {
      personId,
      nameProvided: !!name,
      nameType: typeof name,
      nameLength: name?.length
    });

    // Now, update the name attribute
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `PERSON#${personId}`,
        SK: personId,
      },
      UpdateExpression: 'SET #nameAttr = :nameValue, lastModified = :lastModified',
      ExpressionAttributeNames: {
        '#nameAttr': 'displayName',
      },
      ExpressionAttributeValues: {
        ':nameValue': name,
        ':lastModified': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW',
    };

    tracer.addMetadata('dynamodb_update', {
      tableName: TABLE_NAME,
      operation: 'update_person_name',
      personId: personId,
      newName: name
    });

    const updateCommand = new UpdateCommand(updateParams);
    const { Attributes } = await docClient.send(updateCommand);

    logger.info('Person name updated successfully', {
      personId,
      oldName: Attributes?.displayName,
      newName: name
    });

    // Add metrics
    addCustomMetric('PersonNameUpdated', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBUpdates', 1, MetricUnit.Count, { operation: 'updatePersonName' });

    res.json(Attributes);

  } catch (err) {
    logger.error('Error updating name for person', {
      error: err.message,
      stack: err.stack,
      personId: req.params.personId,
      newName: req.body?.name,
      operation: 'updatePersonName'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('PersonUpdateErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not update person name.' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
