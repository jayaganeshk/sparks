output "app_id" {
  description = "The ID of the Amplify App."
  value       = aws_amplify_app.main.id
}

output "default_domain" {
  description = "The default domain for the Amplify App."
  value       = aws_amplify_app.main.default_domain
}

output "branch_name" {
  description = "The name of the prod branch."
  value       = aws_amplify_branch.prod.branch_name
}

output "app_url" {
  description = "The URL of the deployed Amplify app."
  value       = "https://${aws_amplify_branch.prod.branch_name}.${aws_amplify_app.main.default_domain}"
}

output "branch_domain" {
  description = "The domain for the prod branch (for CloudFront origin)."
  value       = "${aws_amplify_branch.prod.branch_name}.${aws_amplify_app.main.default_domain}"
}
