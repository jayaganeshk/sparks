output "app_id" {
  description = "The ID of the Amplify App."
  value       = aws_amplify_app.main.id
}

output "default_domain" {
  description = "The default domain for the Amplify App."
  value       = aws_amplify_app.main.default_domain
}
