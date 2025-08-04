# EventBridge rule for scheduled cleanup (disabled by default)
resource "aws_cloudwatch_event_rule" "cleanup_schedule" {
  name                = "${var.prefix}-cleanup-schedule"
  description         = "Trigger cleanup lambda every 12 hours"
  schedule_expression = "rate(12 hours)"
  state               = var.cleanup_schedule_enabled ? "ENABLED" : "DISABLED"

  tags = {
    Name        = "${var.prefix}-cleanup-schedule"
    Environment = var.environment
  }
}

# EventBridge target to invoke the cleanup lambda
resource "aws_cloudwatch_event_target" "cleanup_lambda_target" {
  rule      = aws_cloudwatch_event_rule.cleanup_schedule.name
  target_id = "CleanupLambdaTarget"
  arn       = module.cleanup_lambda.lambda_function_arn
}

# Lambda permission to allow EventBridge to invoke the function
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = module.cleanup_lambda.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cleanup_schedule.arn
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
    AWS_REGION                  = var.aws_region
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
      }
    ]
  })
}
