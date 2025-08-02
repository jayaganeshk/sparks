/**
 * Album management routes
 * Handles creation, retrieval, and management of albums and their images
 */

const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DDB_TABLE_NAME;

/**
 * POST /albums - Create a new album
 * Protected: Requires authentication and organizer role
 */
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, isPublic = true } = req.body;
  const organizerEmail = req.user.email;

  if (!title) {
    return res.status(400).json({ error: 'Album title is required' });
  }

  const albumId = uuidv4();
  const timestamp = new Date().toISOString();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      PK: `ORGANIZER#${organizerEmail}`,
      SK: `ALBUM#${albumId}`,
      entityType: 'ALBUM',
      albumId: albumId,
      title: title,
      description: description || '',
      isPublic: Boolean(isPublic),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: organizerEmail
    }
  };

  try {
    await docClient.send(new PutCommand(params));
    res.status(201).json(params.Item);
  } catch (err) {
    console.error('Error creating album:', err);
    res.status(500).json({ error: 'Could not create album' });
  }
});

/**
 * GET /albums - List all albums for the logged-in organizer
 * Protected: Requires authentication and organizer role
 */
router.get('/', authMiddleware, async (req, res) => {
  const organizerEmail = req.user.email;

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ORGANIZER#${organizerEmail}`,
      ':sk': 'ALBUM#',
    },
  };

  try {
    const { Items } = await docClient.send(new QueryCommand(params));
    res.json(Items || []);
  } catch (err) {
    console.error('Error getting albums:', err);
    res.status(500).json({ error: 'Could not retrieve albums' });
  }
});

/**
 * GET /albums/:albumId - Get a specific album by ID
 * Protected: Requires authentication and organizer role
 */
router.get('/:albumId', authMiddleware, async (req, res) => {
  const { albumId } = req.params;
  const organizerEmail = req.user.email;

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `ORGANIZER#${organizerEmail}`,
      ':sk': `ALBUM#${albumId}`,
    },
  };

  try {
    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Album not found or you do not have permission to view it' });
    }

    res.json(Items[0]);
  } catch (err) {
    console.error(`Error getting album ${albumId}:`, err);
    res.status(500).json({ error: 'Could not retrieve album' });
  }
});

/**
 * POST /albums/:albumId/images - Add an image to an album
 * Protected: Requires authentication and organizer role
 */
router.post('/:albumId/images', authMiddleware, async (req, res) => {
  const { albumId } = req.params;
  const { imageId } = req.body;
  const organizerEmail = req.user.email;

  if (!imageId) {
    return res.status(400).json({ error: 'Image ID is required' });
  }

  // First, verify the album exists and belongs to the organizer to ensure they have permission
  const albumCheckParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `ORGANIZER#${organizerEmail}`,
      ':sk': `ALBUM#${albumId}`,
    },
  };

  const addImageParams = {
    TableName: TABLE_NAME,
    Item: {
      PK: `ALBUM#${albumId}`,
      SK: `IMAGE#${imageId}`,
      entityType: 'ALBUM_IMAGE',
      albumId: albumId,
      imageId: imageId,
      addedAt: new Date().toISOString(),
      addedBy: organizerEmail
    },
  };

  try {
    const { Items } = await docClient.send(new QueryCommand(albumCheckParams));

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Album not found or you do not have permission to modify it' });
    }

    // If the album exists and is owned by the organizer, proceed to add the image link
    await docClient.send(new PutCommand(addImageParams));
    res.status(201).json(addImageParams.Item);

  } catch (err) {
    console.error(`Error adding image to album ${albumId}:`, err);
    res.status(500).json({ error: 'Could not add image to album' });
  }
});

/**
 * GET /albums/:albumId/images - Get all images in a specific album
 * Protected: Requires authentication (accessible to any authenticated user)
 */
router.get('/:albumId/images', authMiddleware, async (req, res) => {
  const { albumId } = req.params;
  const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

  const albumImagesParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `ALBUM#${albumId}`,
      ':sk': 'IMAGE#',
    },
  };

  try {
    // Step 1: Get all image IDs from the album
    const { Items: albumImageLinks } = await docClient.send(new QueryCommand(albumImagesParams));

    if (!albumImageLinks || albumImageLinks.length === 0) {
      return res.json([]); // Return empty array if album has no images
    }

    // Step 2: Fetch the full details for each image in the album
    const imagePromises = albumImageLinks.map(link => {
      const imageParams = {
        TableName: TABLE_NAME,
        IndexName: 'entityType-PK-index',
        KeyConditionExpression: 'entityType = :entityType AND PK = :pk',
        ExpressionAttributeValues: {
          ':entityType': 'IMAGE',
          ':pk': link.imageId,
        },
      };
      return docClient.send(new QueryCommand(imageParams));
    });

    const imageResults = await Promise.all(imagePromises);

    const images = imageResults
      .flatMap(result => result.Items)
      .filter(item => item) // Filter out any undefined items
      .map(item => ({ // Add CloudFront domain to image URLs
        ...item,
        s3Key: CLOUDFRONT_DOMAIN + item.s3Key,
        thumbnailFileName: item.thumbnailFileName ? CLOUDFRONT_DOMAIN + item.thumbnailFileName : null
      }));

    res.json(images);

  } catch (err) {
    console.error(`Error getting images for album ${albumId}:`, err);
    res.status(500).json({ error: 'Could not retrieve images for album' });
  }
});

/**
 * DELETE /albums/:albumId/images/:imageId - Remove an image from an album
 * Protected: Requires authentication and organizer role
 */
router.delete('/:albumId/images/:imageId', authMiddleware, async (req, res) => {
  const { albumId, imageId } = req.params;
  const organizerEmail = req.user.email;

  // First, verify the album exists and belongs to the organizer
  const albumCheckParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `ORGANIZER#${organizerEmail}`,
      ':sk': `ALBUM#${albumId}`,
    },
  };

  // Parameters for deleting the image-album association
  const deleteParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `ALBUM#${albumId}`,
      SK: `IMAGE#${imageId}`
    }
  };

  try {
    // Verify album ownership
    const { Items } = await docClient.send(new QueryCommand(albumCheckParams));

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Album not found or you do not have permission to modify it' });
    }

    // Delete the image-album association
    await docClient.send(new DeleteCommand(deleteParams));
    
    res.status(200).json({ message: 'Image removed from album successfully' });
  } catch (err) {
    console.error(`Error removing image ${imageId} from album ${albumId}:`, err);
    res.status(500).json({ error: 'Could not remove image from album' });
  }
});

/**
 * PUT /albums/:albumId/cover - Set an image as the album cover
 * Protected: Requires authentication and organizer role
 */
router.put('/:albumId/cover', authMiddleware, async (req, res) => {
  const { albumId } = req.params;
  const { imageId } = req.body;
  const organizerEmail = req.user.email;

  if (!imageId) {
    return res.status(400).json({ error: 'Image ID is required' });
  }

  // First, verify the album exists and belongs to the organizer
  const albumCheckParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `ORGANIZER#${organizerEmail}`,
      ':sk': `ALBUM#${albumId}`,
    },
  };

  // Update album to set the cover image
  const updateParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `ORGANIZER#${organizerEmail}`,
      SK: `ALBUM#${albumId}`
    },
    UpdateExpression: 'SET coverImageId = :coverImageId, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':coverImageId': imageId,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    // Verify album ownership
    const { Items } = await docClient.send(new QueryCommand(albumCheckParams));

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Album not found or you do not have permission to modify it' });
    }

    // Verify the image exists in the album
    const imageCheckParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `ALBUM#${albumId}`,
        ':sk': `IMAGE#${imageId}`,
      },
    };

    const imageCheck = await docClient.send(new QueryCommand(imageCheckParams));
    if (!imageCheck.Items || imageCheck.Items.length === 0) {
      return res.status(400).json({ error: 'The specified image does not exist in this album' });
    }

    // Update the album with the cover image ID
    const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
    
    res.status(200).json(Attributes);
  } catch (err) {
    console.error(`Error setting cover image for album ${albumId}:`, err);
    res.status(500).json({ error: 'Could not set album cover image' });
  }
});

/**
 * PUT /albums/:albumId/privacy - Update the privacy setting of an album
 * Protected: Requires authentication and organizer role
 */
router.put('/:albumId/privacy', authMiddleware, async (req, res) => {
  const { albumId } = req.params;
  const { isPublic } = req.body;
  const organizerEmail = req.user.email;

  if (isPublic === undefined) {
    return res.status(400).json({ error: 'isPublic parameter is required' });
  }

  // First, verify the album exists and belongs to the organizer
  const albumCheckParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `ORGANIZER#${organizerEmail}`,
      ':sk': `ALBUM#${albumId}`,
    },
  };

  // Update album to set the privacy setting
  const updateParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `ORGANIZER#${organizerEmail}`,
      SK: `ALBUM#${albumId}`
    },
    UpdateExpression: 'SET isPublic = :isPublic, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':isPublic': Boolean(isPublic),
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    // Verify album ownership
    const { Items } = await docClient.send(new QueryCommand(albumCheckParams));

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Album not found or you do not have permission to modify it' });
    }

    // Update the album with the new privacy setting
    const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
    
    res.status(200).json(Attributes);
  } catch (err) {
    console.error(`Error updating privacy setting for album ${albumId}:`, err);
    res.status(500).json({ error: 'Could not update album privacy setting' });
  }
});

module.exports = router;
