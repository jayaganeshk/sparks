/**
 * This script is for local development only.
 * It starts a local Express server that simulates the API Gateway + Lambda environment.
 */

// Set default environment variables for local development
process.env.DDB_TABLE_NAME = process.env.DDB_TABLE_NAME || 'dev_sparks_master_table';
process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'dev-sparks-store';

const app = require('./index').app;  // Import the Express app without the serverless wrapper
const PORT = 8080;

app.listen(PORT, () => {
  console.log(`Sparks API running locally on port ${PORT}`);
  console.log(`Environment: DDB_TABLE_NAME=${process.env.DDB_TABLE_NAME}, S3_BUCKET_NAME=${process.env.S3_BUCKET_NAME}`);
  console.log(`Face Recognition: FACE_RECOGNITION_QUEUE_URL=${process.env.FACE_RECOGNITION_QUEUE_URL || 'not set'}`);
  console.log('For testing with authentication, use the x-user-email header to simulate a logged-in user');
});
