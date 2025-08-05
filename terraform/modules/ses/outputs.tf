output "domain_identity_arn" {
  description = "The ARN of the SES domain identity."
  value       = var.enable_custom_domain ? aws_ses_domain_identity.main[0].arn : ""
}

output "domain_identity_verification_token" {
  description = "The verification token for the SES domain identity."
  value       = var.enable_custom_domain ? aws_ses_domain_identity.main[0].verification_token : ""
}

output "dkim_tokens" {
  description = "The DKIM tokens for the SES domain."
  value       = var.enable_custom_domain ? aws_ses_domain_dkim.main[0].dkim_tokens : []
}

output "configuration_set_name" {
  description = "The name of the SES configuration set."
  value       = var.enable_custom_domain ? aws_ses_configuration_set.main[0].name : ""
}

output "domain_verification" {
  description = "The SES domain identity verification resource (for dependency management)."
  value       = var.enable_custom_domain ? aws_ses_domain_identity_verification.main[0] : null
}
