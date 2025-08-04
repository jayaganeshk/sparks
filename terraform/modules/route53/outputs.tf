output "ui_record_name" {
  description = "The name of the UI record."
  value       = var.enable_custom_domain && var.ui_domain != "" ? aws_route53_record.ui[0].name : ""
}

output "assets_record_name" {
  description = "The name of the assets record."
  value       = var.enable_custom_domain && var.assets_domain != "" ? aws_route53_record.assets[0].name : ""
}

output "api_record_name" {
  description = "The name of the API record."
  value       = var.enable_custom_domain && var.api_domain != "" && var.api_target_domain_name != "" ? aws_route53_record.api[0].name : ""
}
