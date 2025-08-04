output "api_endpoint" {
  description = "The endpoint of the HTTP API."
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "custom_domain_name" {
  description = "The custom domain name of the API Gateway."
  value       = var.enable_custom_domain && var.api_custom_domain != "" ? var.api_custom_domain : ""
}

output "domain_name_target" {
  description = "The target domain name for the API Gateway custom domain."
  value       = var.enable_custom_domain && var.api_custom_domain != "" ? aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].target_domain_name : ""
}

output "hosted_zone_id" {
  description = "The hosted zone ID for the API Gateway custom domain."
  value       = var.enable_custom_domain && var.api_custom_domain != "" ? aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].hosted_zone_id : ""
}
