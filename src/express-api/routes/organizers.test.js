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
  UpdateCommand: jest.fn().mockImplementation((params) => params),
  QueryCommand: jest.fn().mockImplementation((params) => params)
}));

// Mock the auth middleware
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

const organizersRouter = require('./organizers');

// Create a test app
const app = express();
app.use(express.json());
app.use('/organizers', organizersRouter);

describe('Organizers Routes', () => {
  beforeEach(() => {
    mockSend.mockClear();
    process.env.DDB_TABLE_NAME = 'test-table';
  });

  describe('GET /organizers/me', () => {
    it('should return organizer profile', async () => {
      const mockProfile = {
        email: 'organizer@example.com',
        username: 'Test Organizer',
        userType: 'EVENT_ORGANIZER',
        organizationName: 'Test Events',
        storageQuota: 10737418240,
        storageUsed: 1073741824,
        isActive: true,
        createdAt: '2025-08-01T10:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Item: mockProfile });

      const response = await request(app)
        .get('/organizers/me')
        .expect(200);

      expect(response.body).toEqual({
        email: 'organizer@example.com',
        username: 'Test Organizer',
        userType: 'EVENT_ORGANIZER',
        organizationName: 'Test Events',
        storageQuota: 10737418240,
        storageUsed: 1073741824,
        isActive: true,
        createdAt: '2025-08-01T10:00:00.000Z'
      });
    });

    it('should return 404 if organizer not found', async () => {
      mockSend.mockResolvedValue({ Item: null });

      const response = await request(app)
        .get('/organizers/me')
        .expect(404);

      expect(response.body).toEqual({ error: 'Organizer profile not found' });
    });

    it('should return 403 if user is not an event organizer', async () => {
      const mockProfile = {
        email: 'organizer@example.com',
        username: 'Test User',
        userType: 'REGULAR_USER'
      };

      mockSend.mockResolvedValue({ Item: mockProfile });

      const response = await request(app)
        .get('/organizers/me')
        .expect(403);

      expect(response.body).toEqual({ error: 'User is not an event organizer' });
    });
  });

  describe('PUT /organizers/me', () => {
    it('should update organizer profile', async () => {
      const updatedProfile = {
        email: 'organizer@example.com',
        username: 'Updated Organizer',
        userType: 'EVENT_ORGANIZER',
        organizationName: 'Updated Events',
        storageQuota: 10737418240,
        storageUsed: 1073741824,
        isActive: true,
        createdAt: '2025-08-01T10:00:00.000Z',
        lastModified: '2025-08-01T11:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Attributes: updatedProfile });

      const response = await request(app)
        .put('/organizers/me')
        .send({
          username: 'Updated Organizer',
          organizationName: 'Updated Events'
        })
        .expect(200);

      expect(response.body.username).toBe('Updated Organizer');
      expect(response.body.organizationName).toBe('Updated Events');
    });

    it('should return 400 if no fields provided', async () => {
      const response = await request(app)
        .put('/organizers/me')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ 
        error: 'At least one field (username or organizationName) must be provided' 
      });
    });
  });

  describe('GET /organizers/me/storage', () => {
    it('should return storage information', async () => {
      const mockProfile = {
        email: 'organizer@example.com',
        userType: 'EVENT_ORGANIZER',
        storageQuota: 10737418240,
        storageUsed: 1073741824
      };

      const mockImages = [
        { metadata: { fileSize: 2048576 } },
        { metadata: { fileSize: 1048576 } }
      ];

      mockSend
        .mockResolvedValueOnce({ Item: mockProfile }) // Profile query
        .mockResolvedValueOnce({ Items: mockImages, LastEvaluatedKey: null }); // Images query

      const response = await request(app)
        .get('/organizers/me/storage')
        .expect(200);

      expect(response.body).toMatchObject({
        storageQuota: 10737418240,
        imageCount: 2,
        isNearLimit: false,
        isAtLimit: false
      });
      expect(response.body.storageUsed).toBeGreaterThan(0);
      expect(response.body.remainingStorage).toBeGreaterThan(0);
      expect(response.body.usagePercentage).toBeGreaterThan(0);
    });

    it('should return 404 if organizer not found', async () => {
      mockSend.mockResolvedValue({ Item: null });

      const response = await request(app)
        .get('/organizers/me/storage')
        .expect(404);

      expect(response.body).toEqual({ error: 'Organizer profile not found' });
    });
  });
});