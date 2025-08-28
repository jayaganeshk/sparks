# IAM role for EventBridge Scheduler
resource "aws_iam_role" "scheduler_execution_role" {
  name = "${var.prefix}-cleanup-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for EventBridge Scheduler to invoke Lambda
resource "aws_iam_role_policy" "scheduler_lambda_invoke" {
  name = "${var.prefix}-cleanup-scheduler-lambda-policy"
  role = aws_iam_role.scheduler_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = module.cleanup_lambda.lambda_function_arn
      }
    ]
  })
}

# EventBridge Scheduler for cleanup (disabled by default)
resource "aws_scheduler_schedule" "cleanup_schedule" {
  name        = "${var.prefix}-cleanup-schedule"
  description = "Trigger cleanup lambda every 12 hours"
  state       = var.cleanup_schedule_enabled ? "ENABLED" : "DISABLED"

  # Schedule expression using rate-based scheduling
  schedule_expression = "rate(12 hours)"

  # Configure the target (Lambda function)
  target {
    arn      = module.cleanup_lambda.lambda_function_arn
    role_arn = aws_iam_role.scheduler_execution_role.arn

    # Optional: Add retry policy
    retry_policy {
      maximum_retry_attempts = 3
    }

    # Optional: Add dead letter queue configuration if needed
    # dead_letter_config {
    #   arn = aws_sqs_queue.cleanup_dlq.arn
    # }
  }

  # Flexible time window (optional)
  flexible_time_window {
    mode = "OFF"
  }
}

# Cleanup Lambda Function
module "cleanup_lambda" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-cleanup-system"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/cleanup_system"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  timeout       = 900 # 15 minutes - cleanup operations can take time
  memory_size   = 512

  environment_variables = {
    DDB_TABLE_NAME              = var.dynamodb_table_name
    COGNITO_USER_POOL_ID        = var.cognito_user_pool_id
    S3_BUCKET_NAME              = var.s3_bucket_name
    PINECONE_INDEX_NAME         = var.pinecone_index_name
    PINECONE_SSM_PARAMETER_NAME = var.pinecone_ssm_parameter_name
    CLOUDFRONT_DISTRIBUTION_ID  = var.cloudfront_distribution_id
    REKOGNITION_COLLECTION_ID   = var.rekognition_collection_id
    USE_AWS_REKOGNITION_SERVICE = var.use_aws_rekognition_service

  }

  tags = {
    Name        = "${var.prefix}-cleanup-system"
    Environment = var.environment
  }
}

# Additional IAM policy for cleanup lambda specific permissions
resource "aws_iam_role_policy" "cleanup_lambda_additional_permissions" {
  name = "${var.prefix}-cleanup-lambda-additional-policy"
  role = var.lambda_exec_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:DeleteTable",
          "dynamodb:CreateTable",
          "dynamodb:UpdateTimeToLive"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:ListUsers",
          "cognito-idp:AdminDeleteUser"
        ]
        Resource = var.cognito_user_pool_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter${var.pinecone_ssm_parameter_name}"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = var.cloudfront_distribution_arn
      },
      {
        Effect = "Allow"
        Action = [
          "rekognition:DescribeCollection",
          "rekognition:ListFaces",
          "rekognition:DeleteFaces",
          "rekognition:DeleteCollection",
          "rekognition:CreateCollection"
        ]
        Resource = "*"      }
    ]
  })
}
