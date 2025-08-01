const express = require("express");
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { authMiddleware, requireOrganizer } = require("../middleware/auth");
const KSUID = require("ksuid");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// Helper function to get or create the "Others" album for an organizer
async function getOrCreateOthersAlbum(email) {
  const othersAlbumId = `others-${email}`;

  // Try to get existing "Others" album
  const getParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `ALBUM#${othersAlbumId}`,
      SK: "METADATA",
    },
  };

  const getCommand = new GetCommand(getParams);
  const { Item: existingAlbum } = await docClient.send(getCommand);

  if (existingAlbum) {
    return existingAlbum;
  }

  // Create "Others" album if it doesn't exist
  const now = new Date().toISOString();
  const othersAlbumData = {
    PK: `ALBUM#${othersAlbumId}`,
    SK: "METADATA",
    entityType: "ALBUM",
    albumId: othersAlbumId,
    name: "Others",
    description: "Images not assigned to specific albums",
    eventDate: "1970-01-01",
    createdBy: email,
    createdAt: now,
    visibility: "private",
    imageCount: 0,
    isDefault: true,
  };

  const putParams = {
    TableName: TABLE_NAME,
    Item: othersAlbumData,
    ConditionExpression: "attribute_not_exists(PK)",
  };

  try {
    const putCommand = new PutCommand(putParams);
    await docClient.send(putCommand);
    return othersAlbumData;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      // Album was created by another concurrent request, fetch it
      const { Item } = await docClient.send(getCommand);
      return Item;
    }
    throw err;
  }
}

// Apply auth middleware and require organizer access to all routes
router.use(authMiddleware);
router.use(requireOrganizer);

// POST /organizers/me/albums/others - Create or get default "Others" album
router.post("/others", async (req, res) => {
  const { email } = req.user;

  try {
    const othersAlbum = await getOrCreateOthersAlbum(email);

    res.json({
      albumId: othersAlbum.albumId,
      name: othersAlbum.name,
      description: othersAlbum.description,
      eventDate: othersAlbum.eventDate,
      createdBy: othersAlbum.createdBy,
      createdAt: othersAlbum.createdAt,
      visibility: othersAlbum.visibility,
      imageCount: othersAlbum.imageCount || 0,
      isDefault: othersAlbum.isDefault,
    });
  } catch (err) {
    console.error(`Error creating Others album for organizer ${email}:`, err);
    res.status(500).json({ error: "Could not create Others album" });
  }
});

// POST /albums - Create new album
router.post("/", async (req, res) => {
  const { email } = req.user;
  const { name, description, eventDate, visibility = "public" } = req.body;

  // Validate required fields
  if (!name || !eventDate) {
    return res.status(400).json({
      error: "Missing required fields",
      details: "name and eventDate are required",
    });
  }

  // Validate eventDate format (ISO 8601 date)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(eventDate)) {
    return res.status(400).json({
      error: "Invalid eventDate format",
      details: "eventDate must be in YYYY-MM-DD format",
    });
  }

  // Validate visibility
  if (!["public", "private"].includes(visibility)) {
    return res.status(400).json({
      error: "Invalid visibility value",
      details: 'visibility must be either "public" or "private"',
    });
  }

  const albumId = KSUID.randomSync().string;
  const now = new Date().toISOString();

  const albumData = {
    PK: `ALBUM#${albumId}`,
    SK: "METADATA",
    entityType: "ALBUM",
    albumId,
    name: name.trim(),
    description: description ? description.trim() : undefined,
    eventDate,
    createdBy: email,
    createdAt: now,
    visibility,
    imageCount: 0,
  };

  // Remove undefined values
  Object.keys(albumData).forEach((key) => {
    if (albumData[key] === undefined) {
      delete albumData[key];
    }
  });

  const params = {
    TableName: TABLE_NAME,
    Item: albumData,
    ConditionExpression: "attribute_not_exists(PK)",
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);

    res.status(201).json({
      albumId,
      name: albumData.name,
      description: albumData.description,
      eventDate,
      createdBy: email,
      createdAt: now,
      visibility,
      imageCount: 0,
      isDefault: false,
    });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return res
        .status(409)
        .json({ error: "Album with this ID already exists" });
    }
    console.error(`Error creating album for organizer ${email}:`, err);
    res.status(500).json({ error: "Could not create album" });
  }
});

// GET /albums - List albums with organizer-specific filtering
router.get("/", async (req, res) => {
  const { email } = req.user;
  const { limit = 20, lastEvaluatedKey } = req.query;

  try {
    // Ensure "Others" album exists
    await getOrCreateOthersAlbum(email);

    const params = {
      TableName: TABLE_NAME,
      IndexName: "entityType-PK-index",
      KeyConditionExpression: "entityType = :entityType",
      FilterExpression: "createdBy = :email",
      ExpressionAttributeValues: {
        ":entityType": "ALBUM",
        ":email": email,
      },
      Limit: parseInt(limit),
      ScanIndexForward: false, // Sort by newest first
    };

    if (lastEvaluatedKey) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          Buffer.from(lastEvaluatedKey, "base64").toString()
        );
      } catch (err) {
        return res
          .status(400)
          .json({ error: "Invalid lastEvaluatedKey format" });
      }
    }

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    const albums = Items.map((item) => ({
      albumId: item.albumId,
      name: item.name,
      description: item.description,
      eventDate: item.eventDate,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      visibility: item.visibility,
      imageCount: item.imageCount || 0,
      coverImageId: item.coverImageId,
      isDefault: item.isDefault || false,
    }));

    const response = { albums };

    if (LastEvaluatedKey) {
      response.lastEvaluatedKey = Buffer.from(
        JSON.stringify(LastEvaluatedKey)
      ).toString("base64");
    }

    res.json(response);
  } catch (err) {
    console.error(`Error listing albums for organizer ${email}:`, err);
    res.status(500).json({ error: "Could not retrieve albums" });
  }
});

// GET /albums/:albumId - Get album details
router.get("/:albumId", async (req, res) => {
  const { email } = req.user;
  const { albumId } = req.params;

  // Validate albumId format (KSUID or Others album format)
  if (!albumId || (albumId.length !== 27 && !albumId.startsWith("others-"))) {
    return res.status(400).json({ error: "Invalid albumId format" });
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `ALBUM#${albumId}`,
      SK: "METADATA",
    },
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      return res.status(404).json({ error: "Album not found" });
    }

    // Verify the organizer owns this album
    if (Item.createdBy !== email) {
      return res.status(403).json({ error: "Access denied to this album" });
    }

    res.json({
      albumId: Item.albumId,
      name: Item.name,
      description: Item.description,
      eventDate: Item.eventDate,
      createdBy: Item.createdBy,
      createdAt: Item.createdAt,
      visibility: Item.visibility,
      imageCount: Item.imageCount || 0,
      coverImageId: Item.coverImageId,
      isDefault: Item.isDefault || false,
    });
  } catch (err) {
    console.error(
      `Error getting album ${albumId} for organizer ${email}:`,
      err
    );
    res.status(500).json({ error: "Could not retrieve album details" });
  }
});

// PUT /albums/:albumId - Update album metadata
router.put("/:albumId", async (req, res) => {
  const { email } = req.user;
  const { albumId } = req.params;
  const { name, description, eventDate, visibility, coverImageId } = req.body;

  // Check if this is the "Others" album (cannot be edited)
  if (albumId === `others-${email}`) {
    return res.status(400).json({
      error: "Cannot edit default Others album",
      details:
        "The Others album is a system-generated album and cannot be modified",
    });
  }

  // Validate albumId format (KSUID or Others album format)
  if (!albumId || (albumId.length !== 27 && !albumId.startsWith("others-"))) {
    return res.status(400).json({ error: "Invalid albumId format" });
  }

  // Validate at least one field is provided
  if (!name && !description && !eventDate && !visibility && !coverImageId) {
    return res.status(400).json({
      error: "At least one field must be provided for update",
      details:
        "Provide name, description, eventDate, visibility, or coverImageId",
    });
  }

  // Validate eventDate format if provided
  if (eventDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate)) {
      return res.status(400).json({
        error: "Invalid eventDate format",
        details: "eventDate must be in YYYY-MM-DD format",
      });
    }
  }

  // Validate visibility if provided
  if (visibility && !["public", "private"].includes(visibility)) {
    return res.status(400).json({
      error: "Invalid visibility value",
      details: 'visibility must be either "public" or "private"',
    });
  }

  // Build update expression dynamically
  let updateExpression = "SET lastModified = :lastModified";
  const expressionAttributeValues = {
    ":lastModified": new Date().toISOString(),
    ":email": email,
  };

  if (name) {
    updateExpression += ", #name = :name";
    expressionAttributeValues[":name"] = name.trim();
  }

  if (description !== undefined) {
    if (description === null || description === "") {
      updateExpression += " REMOVE description";
    } else {
      updateExpression += ", description = :description";
      expressionAttributeValues[":description"] = description.trim();
    }
  }

  if (eventDate) {
    updateExpression += ", eventDate = :eventDate";
    expressionAttributeValues[":eventDate"] = eventDate;
  }

  if (visibility) {
    updateExpression += ", visibility = :visibility";
    expressionAttributeValues[":visibility"] = visibility;
  }

  if (coverImageId !== undefined) {
    if (coverImageId === null || coverImageId === "") {
      updateExpression += " REMOVE coverImageId";
    } else {
      updateExpression += ", coverImageId = :coverImageId";
      expressionAttributeValues[":coverImageId"] = coverImageId;
    }
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `ALBUM#${albumId}`,
      SK: "METADATA",
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: name ? { "#name": "name" } : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: "attribute_exists(PK) AND createdBy = :email",
    ReturnValues: "ALL_NEW",
  };

  // Remove undefined values
  if (!params.ExpressionAttributeNames) {
    delete params.ExpressionAttributeNames;
  }

  try {
    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);

    res.json({
      albumId: Attributes.albumId,
      name: Attributes.name,
      description: Attributes.description,
      eventDate: Attributes.eventDate,
      createdBy: Attributes.createdBy,
      createdAt: Attributes.createdAt,
      lastModified: Attributes.lastModified,
      visibility: Attributes.visibility,
      imageCount: Attributes.imageCount || 0,
      coverImageId: Attributes.coverImageId,
      isDefault: Attributes.isDefault || false,
    });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return res
        .status(404)
        .json({ error: "Album not found or access denied" });
    }
    console.error(
      `Error updating album ${albumId} for organizer ${email}:`,
      err
    );
    res.status(500).json({ error: "Could not update album" });
  }
});

// DELETE /albums/:albumId - Delete album and move images to Others album
router.delete("/:albumId", async (req, res) => {
  const { email } = req.user;
  const { albumId } = req.params;

  // Check if this is the "Others" album (cannot be deleted)
  if (albumId === `others-${email}`) {
    return res.status(400).json({
      error: "Cannot delete default Others album",
      details:
        "The Others album is a system-generated album and cannot be deleted",
    });
  }

  // Validate albumId format (KSUID)
  if (!albumId || albumId.length !== 27) {
    return res.status(400).json({ error: "Invalid albumId format" });
  }

  try {
    // First, verify the album exists and the organizer owns it
    const getAlbumParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `ALBUM#${albumId}`,
        SK: "METADATA",
      },
    };

    const getAlbumCommand = new GetCommand(getAlbumParams);
    const { Item: album } = await docClient.send(getAlbumCommand);

    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    if (album.createdBy !== email) {
      return res.status(403).json({ error: "Access denied to this album" });
    }

    // Get or create the "Others" album
    const othersAlbum = await getOrCreateOthersAlbum(email);

    // Get all album-image associations to move
    const getAssociationsParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :albumPK AND begins_with(SK, :imagePrefix)",
      ExpressionAttributeValues: {
        ":albumPK": `ALBUM#${albumId}`,
        ":imagePrefix": "IMAGE#",
      },
    };

    const getAssociationsCommand = new QueryCommand(getAssociationsParams);
    const { Items: associations } = await docClient.send(
      getAssociationsCommand
    );

    // Prepare operations
    const deleteRequests = [];
    const putRequests = [];

    // Delete album metadata
    deleteRequests.push({
      DeleteRequest: {
        Key: {
          PK: `ALBUM#${albumId}`,
          SK: "METADATA",
        },
      },
    });

    // Delete old album-image associations and create new ones for "Others" album
    const now = new Date().toISOString();
    associations.forEach((association) => {
      // Delete old association
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            PK: association.PK,
            SK: association.SK,
          },
        },
      });

      // Create new association with "Others" album
      putRequests.push({
        PutRequest: {
          Item: {
            PK: `ALBUM#${othersAlbum.albumId}`,
            SK: `IMAGE#${association.imageId}`,
            entityType: "ALBUM_IMAGE",
            albumId: othersAlbum.albumId,
            imageId: association.imageId,
            addedAt: now,
            sortOrder: association.sortOrder || 0,
          },
        },
      });
    });

    // Update all associated images to point to "Others" album
    const imageUpdatePromises = associations.map(async (association) => {
      const imageId = association.imageId;
      const updateImageParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: imageId,
          SK: `UPLOADED_BY#${email}`,
        },
        UpdateExpression:
          "SET albumId = :othersAlbumId, lastModified = :lastModified",
        ExpressionAttributeValues: {
          ":othersAlbumId": othersAlbum.albumId,
          ":lastModified": now,
        },
        ConditionExpression: "attribute_exists(PK)",
      };

      try {
        const updateImageCommand = new UpdateCommand(updateImageParams);
        await docClient.send(updateImageCommand);
      } catch (err) {
        console.warn(`Failed to update albumId for image ${imageId}:`, err);
        // Continue with deletion even if image update fails
      }
    });

    // Execute image updates in parallel
    await Promise.allSettled(imageUpdatePromises);

    // Execute batch operations
    const allRequests = [...deleteRequests, ...putRequests];
    if (allRequests.length > 0) {
      // DynamoDB batch write can handle up to 25 items at a time
      const batchSize = 25;
      for (let i = 0; i < allRequests.length; i += batchSize) {
        const batch = allRequests.slice(i, i + batchSize);
        const batchParams = {
          RequestItems: {
            [TABLE_NAME]: batch,
          },
        };

        const batchCommand = new BatchWriteCommand(batchParams);
        await docClient.send(batchCommand);
      }
    }

    // Update image count for "Others" album
    if (associations.length > 0) {
      const updateOthersParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: `ALBUM#${othersAlbum.albumId}`,
          SK: "METADATA",
        },
        UpdateExpression: "ADD imageCount :count",
        ExpressionAttributeValues: {
          ":count": associations.length,
        },
      };

      const updateOthersCommand = new UpdateCommand(updateOthersParams);
      await docClient.send(updateOthersCommand);
    }

    res.json({
      message: "Album deleted successfully and images moved to Others album",
      albumId,
      movedImages: associations.length,
      othersAlbumId: othersAlbum.albumId,
    });
  } catch (err) {
    console.error(
      `Error deleting album ${albumId} for organizer ${email}:`,
      err
    );
    res.status(500).json({ error: "Could not delete album" });
  }
});

module.exports = router;
