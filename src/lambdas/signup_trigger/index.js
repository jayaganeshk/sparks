const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

// Import PowerTools
const { Logger } = require('@aws-lambda-powertools/logger');
const { Tracer } = require('@aws-lambda-powertools/tracer');
const { Metrics, MetricUnit } = require('@aws-lambda-powertools/metrics');

// Initialize PowerTools
const logger = new Logger({
  serviceName: 'signup-trigger',
  logLevel: process.env.LOG_LEVEL || 'INFO'
});

const tracer = new Tracer({
  serviceName: 'signup-trigger'
});

const metrics = new Metrics({
  namespace: 'Sparks/Lambda',
  serviceName: 'signup-trigger'
});

// Initialize AWS clients with tracing
const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocument.from(client);

const { DDB_TABLE_NAME, DEFAULT_UPLOAD_LIMIT } = process.env;

const handler = async (event) => {
  logger.info('Signup trigger invoked', {
    triggerSource: event.triggerSource,
    userPoolId: event.userPoolId,
    userName: event.userName
  });

  // Add metadata to tracer
  tracer.addMetadata('cognito_event', {
    triggerSource: event.triggerSource,
    userPoolId: event.userPoolId,
    userName: event.userName,
    userAttributes: event.request.userAttributes
  });

  metrics.addMetric('SignupTriggerInvocations', MetricUnit.Count, 1);

  try {
    const email = event.request.userAttributes.email;
    
    if (!email) {
      logger.error('No email found in user attributes');
      metrics.addMetric('SignupTriggerErrors', MetricUnit.Count, 1);
      throw new Error('Email is required for user signup');
    }

    logger.info('Processing user signup', {
      email,
      userName: event.userName
    });

    await insertToDDB(email);
    
    logger.info('User signup processed successfully', {
      email,
      userName: event.userName
    });

    metrics.addMetric('SignupTriggerSuccessful', MetricUnit.Count, 1);

    return event;
  } catch (error) {
    logger.error('Error processing signup trigger', {
      error: error.message,
      stack: error.stack,
      userName: event.userName,
      email: event.request.userAttributes?.email
    });

    tracer.addErrorAsMetadata(error);
    metrics.addMetric('SignupTriggerErrors', MetricUnit.Count, 1);
    
    // Re-throw the error to fail the signup process
    throw error;
  }
};

//using aws sdk v3 documentdb client insert to ddb
const insertToDDB = async (userName) => {
  const subsegment = tracer.getSegment()?.addNewSubsegment('insertToDDB');
  
  try {
    const uploadLimit = parseInt(DEFAULT_UPLOAD_LIMIT) || 100;
    
    const item = {
      PK: `LIMIT#${userName}`,
      SK: userName,
      entityType: "DEFAULT_LIMIT",
      limit: uploadLimit,
      createdAt: new Date().toISOString()
    };

    logger.info('Inserting user limit to DynamoDB', {
      userName,
      uploadLimit,
      tableName: DDB_TABLE_NAME
    });

    const params = {
      TableName: DDB_TABLE_NAME,
      Item: item,
    };

    const res = await docClient.put(params);
    
    logger.info('User limit inserted successfully', {
      userName,
      uploadLimit
    });

    // Add metadata to tracer
    tracer.addMetadata('dynamodb_insert', {
      tableName: DDB_TABLE_NAME,
      itemType: 'DEFAULT_LIMIT',
      userName,
      uploadLimit
    });

    metrics.addMetric('DynamoDBInserts', MetricUnit.Count, 1);
    metrics.addMetric('UserLimitsCreated', MetricUnit.Count, 1);

    return res;
  } catch (error) {
    logger.error('Error inserting to DynamoDB', {
      error: error.message,
      stack: error.stack,
      userName,
      tableName: DDB_TABLE_NAME
    });

    metrics.addMetric('DynamoDBInsertErrors', MetricUnit.Count, 1);
    throw error;
  } finally {
    subsegment?.close();
  }
};

// Export handler with PowerTools decorators
module.exports.handler = tracer.captureLambdaHandler(
  logger.injectLambdaContext(
    metrics.logMetrics(handler)
  )
);
