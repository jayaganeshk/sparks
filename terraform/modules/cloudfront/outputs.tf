output "ui_distribution_domain_name" {
  description = "The domain name of the UI CloudFront distribution."
  value       = aws_cloudfront_distribution.ui_distribution.domain_name
}

output "image_distribution_domain_name" {
  description = "The domain name of the image CloudFront distribution."
  value       = aws_cloudfront_distribution.image_distribution.domain_name
}

output "cloudfront_key_pair_id" {
  description = "The ID of the CloudFront key pair used for URL signing."
  value       = aws_cloudfront_public_key.signing_key.id
}
