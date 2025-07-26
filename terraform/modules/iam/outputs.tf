output "lambda_execution_role_arn" {
  description = "The ARN of the IAM role for Lambda execution."
  value       = aws_iam_role.lambda_exec_role.arn
}

output "cognito_auth_role_arn" {
  description = "The ARN of the IAM role for authenticated Cognito users."
  value       = aws_iam_role.cognito_auth_role.arn
}
