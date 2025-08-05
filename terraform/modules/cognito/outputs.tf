output "user_pool_id" {
  description = "The ID of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.endpoint
}

output "app_client_id" {
  description = "The ID of the Cognito User Pool Client."
  value       = aws_cognito_user_pool_client.main.id
}

output "identity_pool_id" {
  description = "The ID of the Cognito Identity Pool."
  value       = aws_cognito_identity_pool.main.id
}

output "user_pool_domain" {
  description = "The domain of the Cognito User Pool."
  value       = aws_cognito_user_pool_domain.main.domain
}

output "user_pool_domain_cloudfront_distribution" {
  description = "The CloudFront distribution for the Cognito User Pool domain."
  value       = aws_cognito_user_pool_domain.main.cloudfront_distribution
}

output "user_pool_domain_cloudfront_distribution_arn" {
  description = "The CloudFront distribution ARN for the Cognito User Pool domain."
  value       = aws_cognito_user_pool_domain.main.cloudfront_distribution_arn
}

output "user_pool_domain_s3_bucket" {
  description = "The S3 bucket for the Cognito User Pool domain."
  value       = aws_cognito_user_pool_domain.main.s3_bucket
}
