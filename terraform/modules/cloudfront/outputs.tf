output "ui_distribution_domain_name" {
  description = "The domain name of the UI CloudFront distribution."
  value       = aws_cloudfront_distribution.ui_distribution.domain_name
}

output "ui_distribution_id" {
  description = "The ID of the UI CloudFront distribution."
  value       = aws_cloudfront_distribution.ui_distribution.id
}

output "image_distribution_domain_name" {
  description = "The domain name of the image CloudFront distribution."
  value       = aws_cloudfront_distribution.image_distribution.domain_name
}

output "image_distribution_id" {
  description = "The ID of the image CloudFront distribution."
  value       = aws_cloudfront_distribution.image_distribution.id
}
