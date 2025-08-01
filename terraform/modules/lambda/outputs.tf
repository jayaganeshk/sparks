output "signup_trigger_lambda_arn" {
  description = "The ARN of the Cognito signup trigger Lambda function."
  value       = module.signup_trigger.lambda_function_arn
}

output "signup_trigger_lambda_name" {
  description = "The name of the Cognito signup trigger Lambda function."
  value       = module.signup_trigger.lambda_function_name
}

output "image_compression_lambda_arn" {
  description = "The ARN of the image compression Lambda function."
  value       = module.image_compression.lambda_function_arn
}

output "face_recognition_tagging_lambda_arn" {
  description = "The ARN of the face recognition tagging Lambda function."
  value       = module.face_recognition_tagging.lambda_function_arn
}

output "image_thumbnail_generation_lambda_arn" {
  description = "The ARN of the image thumbnail generation Lambda function."
  value       = module.image_thumbnail_generation.lambda_function_arn
}

output "web_event_logs_function_url" {
  description = "The URL of the web event logs Lambda function."
  value       = aws_lambda_function_url.web_event_logs_url.function_url
}

output "express_api_invoke_arn" {
  description = "The Invoke ARN of the Express API Lambda function."
  value       = module.express_api.lambda_function_invoke_arn
}

output "express_api_function_name" {
  description = "The name of the Express API Lambda function."
  value       = module.express_api.lambda_function_name
}
