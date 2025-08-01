const request = require('supertest');
const express = require('express');

// Mock the AWS SDK before requiring the router
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: mockSend
    })
  },
  GetCommand: jest.fn().mockImplementation((params) => params),
  PutCommand: jest.fn().mockImplementation((params) => params),
  UpdateCommand: jest.fn().mockImplementation((params) => params),
  DeleteCommand: jest.fn().mockImplementation((params) => params),
  QueryCommand: jest.fn().mockImplementation((params) => params),
  BatchWriteCommand: jest.fn().mockImplementation((params) => params)
}));

// Mock KSUID
jest.mock('ksuid', () => ({
  randomSync: jest.fn(() => ({
    string: '2Z4HRXXVERATW6FQTX8S27ABCD1' // 27-character KSUID
  }))
}));

// Mock auth middleware before requiring it
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { email: 'organizer@example.com' };
    req.userType = 'EVENT_ORGANIZER';
    next();
  },
  requireOrganizer: (req, res, next) => {
    if (req.userType !== 'EVENT_ORGANIZER') {
      return res.status(403).json({ error: 'Event organizer access required' });
    }
    next();
  }
}));

const albumsRouter = require('./albums');

// Create test app
const app = express();
app.use(express.json());
app.use('/albums', albumsRouter);

describe('Albums API', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.DDB_TABLE_NAME = 'test-table';
  });

  describe('POST /albums', () => {
    it('should create a new album successfully', async () => {
      mockSend.mockResolvedValueOnce({});

      const albumData = {
        name: 'Wedding Reception 2025',
        description: 'Beautiful wedding reception photos',
        eventDate: '2025-07-15',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/albums')
        .send(albumData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Wedding Reception 2025',
        description: 'Beautiful wedding reception photos',
        eventDate: '2025-07-15',
        createdBy: 'organizer@example.com',
        visibility: 'public',
        imageCount: 0
      });

      expect(response.body.albumId).toBeDefined();
      expect(response.body.albumId).toHaveLength(27); // KSUID length
      expect(response.body.createdAt).toBeDefined();

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Item: expect.objectContaining({
              PK: expect.stringMatching(/^ALBUM#/),
              SK: 'METADATA',
              entityType: 'ALBUM',
              name: 'Wedding Reception 2025',
              description: 'Beautiful wedding reception photos',
              eventDate: '2025-07-15',
              createdBy: 'organizer@example.com',
              visibility: 'public',
              imageCount: 0
            }),
            ConditionExpression: 'attribute_not_exists(PK)'
          })
        })
      );
    });

    it('should create album without optional description', async () => {
      mockSend.mockResolvedValueOnce({});

      const albumData = {
        name: 'Simple Album',
        eventDate: '2025-08-01'
      };

      const response = await request(app)
        .post('/albums')
        .send(albumData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Simple Album',
        eventDate: '2025-08-01',
        createdBy: 'organizer@example.com',
        visibility: 'public',
        imageCount: 0
      });

      expect(response.body.description).toBeUndefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/albums')
        .send({ name: 'Test Album' }) // Missing eventDate
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid eventDate format', async () => {
      const response = await request(app)
        .post('/albums')
        .send({
          name: 'Test Album',
          eventDate: '2025/07/15' // Invalid format
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid eventDate format');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid visibility value', async () => {
      const response = await request(app)
        .post('/albums')
        .send({
          name: 'Test Album',
          eventDate: '2025-07-15',
          visibility: 'invalid'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid visibility value');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 409 if album already exists', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'ConditionalCheckFailedException'
      });

      const response = await request(app)
        .post('/albums')
        .send({
          name: 'Test Album',
          eventDate: '2025-07-15'
        })
        .expect(409);

      expect(response.body.error).toBe('Album with this ID already exists');
    });
  });

  describe('GET /albums', () => {
    it('should list albums for organizer', async () => {
      const mockAlbums = [
        {
          albumId: 'test-album-1',
          name: 'Album 1',
          eventDate: '2025-07-15',
          createdBy: 'organizer@example.com',
          createdAt: '2025-08-01T10:00:00.000Z',
          visibility: 'public',
          imageCount: 5
        },
        {
          albumId: 'test-album-2',
          name: 'Album 2',
          eventDate: '2025-07-20',
          createdBy: 'organizer@example.com',
          createdAt: '2025-08-01T11:00:00.000Z',
          visibility: 'private',
          imageCount: 10
        }
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockAlbums,
        LastEvaluatedKey: null
      });

      const response = await request(app)
        .get('/albums')
        .expect(200);

      expect(response.body.albums).toHaveLength(2);
      expect(response.body.albums[0]).toMatchObject({
        albumId: 'test-album-1',
        name: 'Album 1',
        eventDate: '2025-07-15',
        createdBy: 'organizer@example.com',
        visibility: 'public',
        imageCount: 5
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            IndexName: 'entityType-PK-index',
            KeyConditionExpression: 'entityType = :entityType',
            FilterExpression: 'createdBy = :email',
            ExpressionAttributeValues: {
              ':entityType': 'ALBUM',
              ':email': 'organizer@example.com'
            },
            Limit: 20,
            ScanIndexForward: false
          })
        })
      );
    });

    it('should handle pagination with lastEvaluatedKey', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: { PK: 'test-key' }
      });

      const lastEvaluatedKey = Buffer.from(JSON.stringify({ PK: 'previous-key' })).toString('base64');

      const response = await request(app)
        .get('/albums')
        .query({ lastEvaluatedKey, limit: 10 })
        .expect(200);

      expect(response.body.lastEvaluatedKey).toBeDefined();
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ExclusiveStartKey: { PK: 'previous-key' },
            Limit: 10
          })
        })
      );
    });

    it('should return 400 for invalid lastEvaluatedKey', async () => {
      const response = await request(app)
        .get('/albums')
        .query({ lastEvaluatedKey: 'invalid-key' })
        .expect(400);

      expect(response.body.error).toBe('Invalid lastEvaluatedKey format');
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('GET /albums/:albumId', () => {
    it('should get album details successfully', async () => {
      const mockAlbum = {
        albumId: '2Z4HRXXVERATW6FQTX8S27ABCD1',
        name: 'Test Album',
        description: 'Test description',
        eventDate: '2025-07-15',
        createdBy: 'organizer@example.com',
        createdAt: '2025-08-01T10:00:00.000Z',
        visibility: 'public',
        imageCount: 15,
        coverImageId: 'cover-image-id'
      };

      mockSend.mockResolvedValueOnce({ Item: mockAlbum });

      const response = await request(app)
        .get('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .expect(200);

      expect(response.body).toMatchObject(mockAlbum);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Key: {
              PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
              SK: 'METADATA'
            }
          })
        })
      );
    });

    it('should return 400 for invalid albumId format', async () => {
      const response = await request(app)
        .get('/albums/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid albumId format');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 404 if album not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: null });

      const response = await request(app)
        .get('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .expect(404);

      expect(response.body.error).toBe('Album not found');
    });

    it('should return 403 if organizer does not own album', async () => {
      const mockAlbum = {
        albumId: '2Z4HRXXVERATW6FQTX8S27ABCD1',
        name: 'Test Album',
        createdBy: 'other@example.com' // Different organizer
      };

      mockSend.mockResolvedValueOnce({ Item: mockAlbum });

      const response = await request(app)
        .get('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .expect(403);

      expect(response.body.error).toBe('Access denied to this album');
    });
  });

  describe('PUT /albums/:albumId', () => {
    it('should update album metadata successfully', async () => {
      const updatedAlbum = {
        albumId: '2Z4HRXXVERATW6FQTX8S27ABCD1',
        name: 'Updated Album Name',
        description: 'Updated description',
        eventDate: '2025-08-15',
        createdBy: 'organizer@example.com',
        createdAt: '2025-08-01T10:00:00.000Z',
        lastModified: '2025-08-01T12:00:00.000Z',
        visibility: 'private',
        imageCount: 20,
        coverImageId: 'new-cover-id'
      };

      mockSend.mockResolvedValueOnce({ Attributes: updatedAlbum });

      const updateData = {
        name: 'Updated Album Name',
        description: 'Updated description',
        eventDate: '2025-08-15',
        visibility: 'private',
        coverImageId: 'new-cover-id'
      };

      const response = await request(app)
        .put('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updatedAlbum);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Key: {
              PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
              SK: 'METADATA'
            },
            UpdateExpression: expect.stringContaining('SET lastModified = :lastModified'),
            ConditionExpression: 'attribute_exists(PK) AND createdBy = :email',
            ReturnValues: 'ALL_NEW'
          })
        })
      );
    });

    it('should return 400 for invalid albumId format', async () => {
      const response = await request(app)
        .put('/albums/invalid-id')
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body.error).toBe('Invalid albumId format');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 400 if no fields provided for update', async () => {
      const response = await request(app)
        .put('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('At least one field must be provided for update');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid eventDate format', async () => {
      const response = await request(app)
        .put('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .send({ eventDate: '2025/08/15' })
        .expect(400);

      expect(response.body.error).toBe('Invalid eventDate format');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 404 if album not found or access denied', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'ConditionalCheckFailedException'
      });

      const response = await request(app)
        .put('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.error).toBe('Album not found or access denied');
    });
  });

  describe('DELETE /albums/:albumId', () => {
    it('should delete album with cascade deletion successfully', async () => {
      const mockAlbum = {
        albumId: '2Z4HRXXVERATW6FQTX8S27ABCD1',
        name: 'Test Album',
        createdBy: 'organizer@example.com'
      };

      const mockAssociations = [
        {
          PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
          SK: 'IMAGE#image1',
          imageId: 'image1'
        },
        {
          PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
          SK: 'IMAGE#image2',
          imageId: 'image2'
        }
      ];

      // Mock the sequence of calls
      mockSend
        .mockResolvedValueOnce({ Item: mockAlbum }) // Get album
        .mockResolvedValueOnce({ Items: mockAssociations }) // Get associations
        .mockResolvedValueOnce({}) // Update image1
        .mockResolvedValueOnce({}) // Update image2
        .mockResolvedValueOnce({}); // Batch delete

      const response = await request(app)
        .delete('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Album deleted successfully',
        albumId: '2Z4HRXXVERATW6FQTX8S27ABCD1',
        deletedAssociations: 2
      });

      // Verify the sequence of calls
      expect(mockSend).toHaveBeenCalledTimes(5);
      
      // First call: Get album
      expect(mockSend).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Key: {
              PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
              SK: 'METADATA'
            }
          })
        })
      );

      // Second call: Get associations
      expect(mockSend).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            KeyConditionExpression: 'PK = :albumPK AND begins_with(SK, :imagePrefix)',
            ExpressionAttributeValues: {
              ':albumPK': 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
              ':imagePrefix': 'IMAGE#'
            }
          })
        })
      );

      // Last call: Batch delete
      expect(mockSend).toHaveBeenLastCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            RequestItems: {
              'test-table': expect.arrayContaining([
                {
                  DeleteRequest: {
                    Key: {
                      PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
                      SK: 'METADATA'
                    }
                  }
                },
                {
                  DeleteRequest: {
                    Key: {
                      PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
                      SK: 'IMAGE#image1'
                    }
                  }
                },
                {
                  DeleteRequest: {
                    Key: {
                      PK: 'ALBUM#2Z4HRXXVERATW6FQTX8S27ABCD1',
                      SK: 'IMAGE#image2'
                    }
                  }
                }
              ])
            }
          })
        })
      );
    });

    it('should return 400 for invalid albumId format', async () => {
      const response = await request(app)
        .delete('/albums/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid albumId format');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should return 404 if album not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: null });

      const response = await request(app)
        .delete('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .expect(404);

      expect(response.body.error).toBe('Album not found');
    });

    it('should return 403 if organizer does not own album', async () => {
      const mockAlbum = {
        albumId: '2Z4HRXXVERATW6FQTX8S27ABCD1',
        name: 'Test Album',
        createdBy: 'other@example.com' // Different organizer
      };

      mockSend.mockResolvedValueOnce({ Item: mockAlbum });

      const response = await request(app)
        .delete('/albums/2Z4HRXXVERATW6FQTX8S27ABCD1')
        .expect(403);

      expect(response.body.error).toBe('Access denied to this album');
    });
  });
});