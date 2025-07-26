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

output "local_app_client_id" {
  description = "The ID of the local Cognito User Pool Client."
  value       = aws_cognito_user_pool_client.local.id
}

output "prod_app_client_id" {
  description = "The ID of the production Cognito User Pool Client."
  value       = aws_cognito_user_pool_client.prod.id
}

output "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.endpoint
}
