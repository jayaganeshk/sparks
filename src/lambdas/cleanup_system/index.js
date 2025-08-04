// AWS SDK v3 imports
const { DynamoDBClient, DescribeTableCommand, DeleteTableCommand, CreateTableCommand, UpdateTimeToLiveCommand, waitUntilTableNotExists, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
const { CognitoIdentityProviderClient, ListUsersCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

// Environment variables
const DDB_TABLE_NAME = process.env.DDB_TABLE_NAME;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const PINECONE_SSM_PARAMETER_NAME = process.env.PINECONE_SSM_PARAMETER_NAME;
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;

// Initialize AWS clients
const dynamodbClient = new DynamoDBClient();
const cognitoClient = new CognitoIdentityProviderClient();
const s3Client = new S3Client();
const ssmClient = new SSMClient();
const cloudFrontClient = new CloudFrontClient();

// Initialize Pinecone client
let pineconeClient = null;

async function initializePinecone() {
    if (pineconeClient) return pineconeClient;

    try {
        const command = new GetParameterCommand({
            Name: PINECONE_SSM_PARAMETER_NAME,
            WithDecryption: true
        });

        const response = await ssmClient.send(command);

        // Use the same import pattern as face recognition lambda
        const { Pinecone } = require('@pinecone-database/pinecone');
        pineconeClient = new Pinecone({
            apiKey: response.Parameter.Value
        });

        return pineconeClient;
    } catch (error) {
        console.error(`Error retrieving Pinecone API key from SSM parameter '${PINECONE_SSM_PARAMETER_NAME}': ${error.message}`);
        throw error;
    }
}

async function clearDynamoDBTable() {
    console.log('Starting DynamoDB table cleanup...');

    try {
        // Get table description to understand the schema
        const describeCommand = new DescribeTableCommand({
            TableName: DDB_TABLE_NAME
        });

        const tableDescription = await dynamodbClient.send(describeCommand);
        const table = tableDescription.Table;
        const keySchema = table.KeySchema;
        const attributeDefinitions = table.AttributeDefinitions;
        const globalSecondaryIndexes = table.GlobalSecondaryIndexes || [];
        const localSecondaryIndexes = table.LocalSecondaryIndexes || [];
        const billingMode = table.BillingModeSummary?.BillingMode || 'PROVISIONED';
        const provisionedThroughput = table.ProvisionedThroughput;
        const ttlDescription = table.TimeToLiveDescription;

        console.log('Table schema captured, proceeding with deletion...');

        // Delete the table
        const deleteCommand = new DeleteTableCommand({
            TableName: DDB_TABLE_NAME
        });

        await dynamodbClient.send(deleteCommand);
        console.log('Table deleted, waiting for deletion to complete...');

        // Wait for table to be deleted
        await waitUntilTableNotExists(
            { client: dynamodbClient, maxWaitTime: 300 },
            { TableName: DDB_TABLE_NAME }
        );

        console.log('Table deletion confirmed, recreating table...');

        // Recreate the table with the same configuration
        const createTableParams = {
            TableName: DDB_TABLE_NAME,
            KeySchema: keySchema,
            AttributeDefinitions: attributeDefinitions,
            BillingMode: billingMode
        };

        if (billingMode === 'PROVISIONED') {
            createTableParams.ProvisionedThroughput = {
                ReadCapacityUnits: provisionedThroughput.ReadCapacityUnits,
                WriteCapacityUnits: provisionedThroughput.WriteCapacityUnits
            };
        }

        // Add Global Secondary Indexes
        if (globalSecondaryIndexes.length > 0) {
            createTableParams.GlobalSecondaryIndexes = globalSecondaryIndexes.map(gsi => ({
                IndexName: gsi.IndexName,
                KeySchema: gsi.KeySchema,
                Projection: gsi.Projection,
                ...(billingMode === 'PROVISIONED' && {
                    ProvisionedThroughput: {
                        ReadCapacityUnits: gsi.ProvisionedThroughput.ReadCapacityUnits,
                        WriteCapacityUnits: gsi.ProvisionedThroughput.WriteCapacityUnits
                    }
                })
            }));
        }

        // Add Local Secondary Indexes
        if (localSecondaryIndexes.length > 0) {
            createTableParams.LocalSecondaryIndexes = localSecondaryIndexes.map(lsi => ({
                IndexName: lsi.IndexName,
                KeySchema: lsi.KeySchema,
                Projection: lsi.Projection
            }));
        }

        const createCommand = new CreateTableCommand(createTableParams);
        await dynamodbClient.send(createCommand);

        console.log('Table recreated, waiting for it to become active...');

        // Wait for table to become active
        await waitUntilTableExists(
            { client: dynamodbClient, maxWaitTime: 300 },
            { TableName: DDB_TABLE_NAME }
        );

        // Restore TTL configuration if it existed
        if (ttlDescription && ttlDescription.TimeToLiveStatus === 'ENABLED') {
            const updateTtlCommand = new UpdateTimeToLiveCommand({
                TableName: DDB_TABLE_NAME,
                TimeToLiveSpecification: {
                    AttributeName: ttlDescription.AttributeName,
                    Enabled: true
                }
            });

            await dynamodbClient.send(updateTtlCommand);
            console.log('TTL configuration restored');
        }

        console.log('DynamoDB table cleanup completed successfully');

    } catch (error) {
        console.error('Error during DynamoDB cleanup:', error);
        throw error;
    }
}

async function clearCognitoUsers() {
    console.log('Starting Cognito users cleanup...');

    try {
        let paginationToken = null;
        let totalUsersDeleted = 0;

        do {
            const listCommand = new ListUsersCommand({
                UserPoolId: COGNITO_USER_POOL_ID,
                Limit: 60, // Maximum allowed by AWS
                ...(paginationToken && { PaginationToken: paginationToken })
            });

            const listResult = await cognitoClient.send(listCommand);

            if (listResult.Users && listResult.Users.length > 0) {
                console.log(`Found ${listResult.Users.length} users to delete`);

                // Delete users in batches to avoid rate limiting
                for (const user of listResult.Users) {
                    try {
                        const deleteCommand = new AdminDeleteUserCommand({
                            UserPoolId: COGNITO_USER_POOL_ID,
                            Username: user.Username
                        });

                        await cognitoClient.send(deleteCommand);
                        totalUsersDeleted++;
                        console.log(`Deleted user: ${user.Username}`);

                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));

                    } catch (deleteError) {
                        console.error(`Failed to delete user ${user.Username}:`, deleteError);
                        // Continue with other users even if one fails
                    }
                }
            }

            paginationToken = listResult.PaginationToken;

        } while (paginationToken);

        console.log(`Cognito users cleanup completed. Total users deleted: ${totalUsersDeleted}`);

    } catch (error) {
        console.error('Error during Cognito users cleanup:', error);
        throw error;
    }
}

async function clearPineconeIndex() {
    console.log('Starting Pinecone index cleanup...');

    try {
        const pc = await initializePinecone();
        // Note: JavaScript uses pc.index() (lowercase), Python uses pc.Index() (uppercase)
        // This matches the face recognition lambda pattern for their respective languages
        const index = pc.index(PINECONE_INDEX_NAME);

        // Delete all vectors in the index using the correct method
        await index.deleteAll();

        console.log('Pinecone index cleanup completed successfully');

    } catch (error) {
        console.error('Error during Pinecone cleanup:', error);
        throw error;
    }
}

async function clearPersonsFolder() {
    console.log('Starting S3 persons folder cleanup...');

    try {
        const prefix = 'persons/';
        let continuationToken = null;
        let totalObjectsDeleted = 0;

        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: S3_BUCKET_NAME,
                Prefix: prefix,
                MaxKeys: 1000,
                ...(continuationToken && { ContinuationToken: continuationToken })
            });

            const listResult = await s3Client.send(listCommand);

            if (listResult.Contents && listResult.Contents.length > 0) {
                console.log(`Found ${listResult.Contents.length} objects to delete in persons folder`);

                // Prepare objects for batch deletion
                const objectsToDelete = listResult.Contents.map(obj => ({ Key: obj.Key }));

                // Delete objects in batch (max 1000 per request)
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: S3_BUCKET_NAME,
                    Delete: {
                        Objects: objectsToDelete,
                        Quiet: false
                    }
                });

                const deleteResult = await s3Client.send(deleteCommand);

                totalObjectsDeleted += deleteResult.Deleted ? deleteResult.Deleted.length : 0;

                if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                    console.error('Some objects failed to delete:', deleteResult.Errors);
                }
            }

            continuationToken = listResult.NextContinuationToken;

        } while (continuationToken);

        console.log(`S3 persons folder cleanup completed. Total objects deleted: ${totalObjectsDeleted}`);

    } catch (error) {
        console.error('Error during S3 persons folder cleanup:', error);
        throw error;
    }
}

async function invalidateCloudFrontDistribution() {
    console.log('Starting CloudFront distribution invalidation...');

    if (!CLOUDFRONT_DISTRIBUTION_ID) {
        console.log('CloudFront distribution ID not provided, skipping invalidation');
        return;
    }

    try {
        // Create invalidation for all cached assets
        const invalidationCommand = new CreateInvalidationCommand({
            DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationBatch: {
                Paths: {
                    Quantity: 3,
                    Items: [
                        '/persons/*',      // All person images
                        '/thumbnails/*',   // All thumbnails
                        '/originals/*'     // All original images
                    ]
                },
                CallerReference: `cleanup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
        });

        const invalidationResult = await cloudFrontClient.send(invalidationCommand);

        console.log(`CloudFront invalidation created successfully. Invalidation ID: ${invalidationResult.Invalidation.Id}`);
        console.log(`Status: ${invalidationResult.Invalidation.Status}`);

    } catch (error) {
        console.error('Error during CloudFront invalidation:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    console.log('Starting system cleanup process...');
    console.log('Event:', JSON.stringify(event, null, 2));

    const results = {
        dynamodb: { success: false, error: null, duration: 0 },
        cognito: { success: false, error: null, duration: 0 },
        pinecone: { success: false, error: null, duration: 0 },
        s3: { success: false, error: null, duration: 0 },
        cloudfront: { success: false, error: null, duration: 0 }
    };

    const startTime = Date.now();

    try {
        console.log('Running all cleanup operations in parallel for optimal performance...');

        // Run all cleanup operations in parallel using Promise.allSettled
        // This ensures all operations run concurrently and we get results for all of them
        const cleanupPromises = [
            // DynamoDB cleanup
            (async () => {
                const operationStart = Date.now();
                try {
                    await clearDynamoDBTable();
                    results.dynamodb.success = true;
                    results.dynamodb.duration = Date.now() - operationStart;
                    console.log(`DynamoDB cleanup completed in ${results.dynamodb.duration}ms`);
                } catch (error) {
                    results.dynamodb.error = error.message;
                    results.dynamodb.duration = Date.now() - operationStart;
                    console.error(`DynamoDB cleanup failed after ${results.dynamodb.duration}ms:`, error);
                }
            })(),

            // Cognito users cleanup
            (async () => {
                const operationStart = Date.now();
                try {
                    await clearCognitoUsers();
                    results.cognito.success = true;
                    results.cognito.duration = Date.now() - operationStart;
                    console.log(`Cognito cleanup completed in ${results.cognito.duration}ms`);
                } catch (error) {
                    results.cognito.error = error.message;
                    results.cognito.duration = Date.now() - operationStart;
                    console.error(`Cognito cleanup failed after ${results.cognito.duration}ms:`, error);
                }
            })(),

            // Pinecone index cleanup
            (async () => {
                const operationStart = Date.now();
                try {
                    await clearPineconeIndex();
                    results.pinecone.success = true;
                    results.pinecone.duration = Date.now() - operationStart;
                    console.log(`Pinecone cleanup completed in ${results.pinecone.duration}ms`);
                } catch (error) {
                    results.pinecone.error = error.message;
                    results.pinecone.duration = Date.now() - operationStart;
                    console.error(`Pinecone cleanup failed after ${results.pinecone.duration}ms:`, error);
                }
            })(),

            // S3 persons folder cleanup
            (async () => {
                const operationStart = Date.now();
                try {
                    await clearPersonsFolder();
                    results.s3.success = true;
                    results.s3.duration = Date.now() - operationStart;
                    console.log(`S3 cleanup completed in ${results.s3.duration}ms`);
                } catch (error) {
                    results.s3.error = error.message;
                    results.s3.duration = Date.now() - operationStart;
                    console.error(`S3 cleanup failed after ${results.s3.duration}ms:`, error);
                }
            })(),

            // CloudFront invalidation
            (async () => {
                const operationStart = Date.now();
                try {
                    await invalidateCloudFrontDistribution();
                    results.cloudfront.success = true;
                    results.cloudfront.duration = Date.now() - operationStart;
                    console.log(`CloudFront invalidation completed in ${results.cloudfront.duration}ms`);
                } catch (error) {
                    results.cloudfront.error = error.message;
                    results.cloudfront.duration = Date.now() - operationStart;
                    console.error(`CloudFront invalidation failed after ${results.cloudfront.duration}ms:`, error);
                }
            })()
        ];

        // Wait for all operations to complete (whether successful or failed)
        await Promise.allSettled(cleanupPromises);

        const totalDuration = Date.now() - startTime;
        const successCount = Object.values(results).filter(r => r.success).length;
        const failureCount = 5 - successCount;

        console.log(`🏁 All cleanup operations completed in ${totalDuration}ms`);
        console.log(`📊 Results: ${successCount} successful, ${failureCount} failed`);
        console.log('📋 Detailed results:', JSON.stringify(results, null, 2));

        // Determine overall status
        const allSuccessful = successCount === 5;
        const statusCode = allSuccessful ? 200 : 207; // 207 = Multi-Status (partial success)

        return {
            statusCode: statusCode,
            body: JSON.stringify({
                message: allSuccessful
                    ? 'All cleanup operations completed successfully'
                    : `Cleanup completed with ${successCount}/${5} operations successful`,
                totalDuration: totalDuration,
                summary: {
                    successful: successCount,
                    failed: failureCount,
                    operations: Object.keys(results)
                },
                results: results
            })
        };

    } catch (error) {
        const totalDuration = Date.now() - startTime;
        console.error(`Unexpected error during parallel cleanup after ${totalDuration}ms:`, error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Cleanup process failed with unexpected error',
                error: error.message,
                totalDuration: totalDuration,
                results: results
            })
        };
    }
};
