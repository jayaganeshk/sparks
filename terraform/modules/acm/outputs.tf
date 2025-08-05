output "ui_certificate_arn" {
  description = "The ARN of the UI CloudFront certificate (us-east-1)."
  value       = var.enable_custom_domain && length(aws_acm_certificate.ui) > 0 ? aws_acm_certificate.ui[0].arn : ""
}

output "assets_certificate_arn" {
  description = "The ARN of the assets CloudFront certificate (us-east-1)."
  value       = var.enable_custom_domain && length(aws_acm_certificate.assets) > 0 ? aws_acm_certificate.assets[0].arn : ""
}

output "api_certificate_arn" {
  description = "The ARN of the API Gateway certificate (in the API region)."
  value       = var.enable_custom_domain && length(aws_acm_certificate.api) > 0 ? aws_acm_certificate.api[0].arn : ""
}

output "ui_certificate_validation_completed" {
  description = "Whether the UI certificate validation has completed."
  value       = var.enable_custom_domain && length(aws_acm_certificate_validation.ui) > 0 ? true : false
}

output "assets_certificate_validation_completed" {
  description = "Whether the assets certificate validation has completed."
  value       = var.enable_custom_domain && length(aws_acm_certificate_validation.assets) > 0 ? true : false
}

output "api_certificate_validation_completed" {
  description = "Whether the API Gateway certificate validation has completed."
  value       = var.enable_custom_domain && length(aws_acm_certificate_validation.api) > 0 ? true : false
}
output "cognito_certificate_arn" {
  description = "The ARN of the Cognito certificate (us-east-1)."
  value       = var.enable_custom_domain && length(aws_acm_certificate.cognito) > 0 ? aws_acm_certificate.cognito[0].arn : ""
}

output "cognito_certificate_validation_completed" {
  description = "Whether the Cognito certificate validation has completed."
  value       = var.enable_custom_domain && length(aws_acm_certificate_validation.cognito) > 0 ? true : false
}

output "cognito_certificate_validation" {
  description = "The Cognito certificate validation resource for dependency management."
  value       = var.enable_custom_domain && length(aws_acm_certificate_validation.cognito) > 0 ? aws_acm_certificate_validation.cognito[0] : null
}
