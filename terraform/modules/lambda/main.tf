# create aws lambda layer from s3://techneekz-lambda-layer/image-processing-layer.zip
resource "aws_lambda_layer_version" "image_processing_layer" {
  layer_name  = "image-processing-layer"
  s3_bucket   = "techneekz-lambda-layer"
  s3_key      = "image-processing-layer.zip"
  description = "Image Processing Layer with sharp js and image-thumbnail"
}


# Optional AWS Rekognition-based Lambda (Python)
module "face_rekognition" {
  source = "terraform-aws-modules/lambda/aws"

  function_name                  = "${var.prefix}-face-rekognition"
  handler                        = "lambda_function.handler"
  runtime                        = "python3.12"
  source_path                    = "${path.module}/../../../src/lambdas/face_rekognition"
  create_role                    = false
  lambda_role                    = var.lambda_exec_role_arn
  timeout                        = 60
  memory_size                    = 1024
  publish                        = true
  reserved_concurrent_executions = 1
  layers = [
    "arn:aws:lambda:ap-south-1:770693421928:layer:Klayers-p312-Pillow:7"
  ]

  environment_variables = {
    DDB_TABLE_NAME            = var.dynamodb_table_name
    S3_BUCKET_NAME            = var.thumbnail_bucket_name
    REKOGNITION_COLLECTION_ID = "${var.prefix}-sparks-face-collection"
  }
}


# Lambda Functions
module "signup_trigger" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-signup-trigger"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/signup_trigger"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn

  environment_variables = {
    DDB_TABLE_NAME       = var.dynamodb_table_name
    DEFAULT_UPLOAD_LIMIT = var.default_upload_limit
  }
}

module "image_compression" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-compress-image"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/image_compression"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  memory_size   = 512
  timeout       = 30

  layers = [aws_lambda_layer_version.image_processing_layer.arn]

  build_in_docker = true

  environment_variables = {
    DDB_TABLE_NAME       = var.dynamodb_table_name
    DEFAULT_UPLOAD_LIMIT = var.default_upload_limit
  }
}

module "image_thumbnail_generation" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-imageThumbnailGeneration"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/image_thumbnail_generation"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  timeout       = 30
  memory_size   = 1024

  layers = [aws_lambda_layer_version.image_processing_layer.arn]

  environment_variables = {
    DDB_TABLE_NAME                 = var.dynamodb_table_name
    THUMBNAIL_BUCKET_NAME          = var.thumbnail_bucket_name
    CLOUDFRONT_DOMAIN              = var.enable_custom_domain && var.assets_custom_domain != "" ? "${var.assets_custom_domain}/" : var.cloudfront_domain_name
    USER_POOL_ID                   = var.cognito_user_pool_id
    THUMBNAIL_COMPLETION_TOPIC_ARN = var.thumbnail_completion_topic_arn
  }
}

module "web_event_logs" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-webevent-logs"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/lambdas/web_event_logs"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
}

resource "aws_lambda_function_url" "web_event_logs_url" {
  function_name      = module.web_event_logs.lambda_function_name
  authorization_type = "NONE"

  cors {
    allow_headers = ["*"]
    allow_methods = ["*"]
    allow_origins = ["*"]
  }
}

module "face_recognition_tagging" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-face-recognition-tagging"
  package_type  = "Image"
  image_uri     = var.face_recognition_image_uri

  architectures = ["arm64"]

  create_package                 = false
  create_role                    = false
  lambda_role                    = var.lambda_exec_role_arn
  timeout                        = 60
  memory_size                    = 3078
  reserved_concurrent_executions = 1

  environment_variables = {
    DDB_TABLE_NAME              = var.dynamodb_table_name
    S3_BUCKET_NAME              = var.thumbnail_bucket_name
    PINECONE_INDEX_NAME         = var.pinecone_index_name
    PINECONE_SSM_PARAMETER_NAME = var.pinecone_ssm_parameter_name
  }
}

module "express_api" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.prefix}-express-api"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  source_path   = "${path.module}/../../../src/express-api"
  create_role   = false
  lambda_role   = var.lambda_exec_role_arn
  timeout       = 10
  memory_size   = 1024

  # Create Lambda version
  publish = true

  environment_variables = {
    DDB_TABLE_NAME               = var.dynamodb_table_name
    S3_BUCKET_NAME               = var.thumbnail_bucket_name
    COGNITO_USER_POOL_ID         = var.cognito_user_pool_id
    COGNITO_CLIENT_ID            = var.cognito_client_id
    COGNITO_REGION               = var.aws_region
    CLOUDFRONT_DOMAIN            = var.enable_custom_domain && var.assets_custom_domain != "" ? "${var.assets_custom_domain}/" : var.cloudfront_domain_name
    RESOURCE_PREFIX              = var.prefix
    CLOUDFRONT_KEY_PAIR_ID       = var.cloudfront_key_pair_id
    CLOUDFRONT_PRIVATE_KEY_PARAM = var.cloudfront_private_key_param
    FACE_RECOGNITION_QUEUE_URL   = var.face_recognition_queue_url
  }
}

# Set provisioned concurrency on the published version of the Lambda function
resource "aws_lambda_provisioned_concurrency_config" "express_api" {
  count                             = var.enable_provisioned_concurrency ? 1 : 0
  function_name                     = module.express_api.lambda_function_name
  qualifier                         = module.express_api.lambda_function_version
  provisioned_concurrent_executions = var.provisioned_concurrency_value
}

# Create a Lambda alias pointing to the version with provisioned concurrency
resource "aws_lambda_alias" "express_api_provisioned" {
  name             = "provisioned"
  function_name    = module.express_api.lambda_function_name
  function_version = module.express_api.lambda_function_version
}

