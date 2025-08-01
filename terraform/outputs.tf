output "dynamodb_table_name" {
  description = "The name of the master DynamoDB table."
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "The ARN of the master DynamoDB table."
  value       = module.dynamodb.table_arn
}

output "s3_sparks_store_bucket_name" {
  description = "The name of the S3 bucket for storing images."
  value       = module.s3.sparks_store_bucket_name
}

output "sns_image_creation_topic_arn" {
  description = "The ARN of the SNS topic for image creation events."
  value       = module.sns_sqs.image_creation_topic_arn
}

output "sns_thumbnail_completion_topic_arn" {
  description = "The ARN of the SNS topic for thumbnail completion events."
  value       = module.sns_sqs.thumbnail_completion_topic_arn
}

output "sqs_face_recognition_queue_url" {
  description = "The URL of the SQS queue for face recognition."
  value       = module.sns_sqs.face_recognition_queue_url
}

output "sqs_thumbnail_generation_queue_url" {
  description = "The URL of the SQS queue for thumbnail generation."
  value       = module.sns_sqs.thumbnail_generation_queue_url
}

output "iam_lambda_execution_role_arn" {
  description = "The ARN of the IAM role for Lambda execution."
  value       = module.iam.lambda_execution_role_arn
}

output "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool."
  value       = module.cognito.user_pool_id
}

output "cognito_app_client_id" {
  description = "The ID of the Cognito User Pool App Client."
  value       = module.cognito.app_client_id
}

output "cognito_identity_pool_id" {
  description = "The ID of the Cognito Identity Pool."
  value       = module.cognito.identity_pool_id
}

output "lambda_signup_trigger_arn" {
  description = "The ARN of the Cognito signup trigger Lambda function."
  value       = module.lambda.signup_trigger_lambda_arn
}

output "lambda_face_recognition_tagging_arn" {
  description = "The ARN of the face recognition tagging Lambda function."
  value       = module.lambda.face_recognition_tagging_lambda_arn
}

output "lambda_image_thumbnail_generation_arn" {
  description = "The ARN of the image thumbnail generation Lambda function."
  value       = module.lambda.image_thumbnail_generation_lambda_arn
}

output "lambda_web_event_logs_url" {
  description = "The URL of the web event logs Lambda function."
  value       = module.lambda.web_event_logs_function_url
}

output "amplify_app_id" {
  description = "The ID of the Amplify App."
  value       = module.amplify.app_id
}

output "amplify_app_default_domain" {
  description = "The default domain of the Amplify App."
  value       = module.amplify.default_domain
}

output "amplify_app_url" {
  description = "The URL of the deployed Amplify app."
  value       = module.amplify.app_url
}

output "amplify_branch_domain" {
  description = "The domain of the Amplify prod branch."
  value       = module.amplify.branch_domain
}

output "http_api_endpoint" {
  description = "The endpoint of the HTTP API."
  value       = module.http_api.api_endpoint
}
