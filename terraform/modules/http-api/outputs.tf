output "api_endpoint" {
  description = "The endpoint of the HTTP API."
  value       = aws_apigatewayv2_api.main.api_endpoint
}
