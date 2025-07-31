output "user_pool_id" {
  description = "The ID of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.arn
}

output "identity_pool_id" {
  description = "The ID of the Cognito Identity Pool."
  value       = aws_cognito_identity_pool.main.id
}

output "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.endpoint
}

output "app_client_id" {
  description = "The ID of the Cognito User Pool Client."
  value       = aws_cognito_user_pool_client.main.id
}

# Deprecated outputs for backward compatibility - remove after updating references
output "prod_user_pool_client_id" {
  description = "DEPRECATED: Use app_client_id instead. The ID of the Cognito User Pool Client."
  value       = aws_cognito_user_pool_client.main.id
}

output "local_app_client_id" {
  description = "DEPRECATED: Use app_client_id instead. The ID of the Cognito User Pool Client."
  value       = aws_cognito_user_pool_client.main.id
}
