output "cleanup_lambda_function_name" {
  description = "Name of the cleanup Lambda function"
  value       = module.cleanup_lambda.lambda_function_name
}

output "cleanup_lambda_function_arn" {
  description = "ARN of the cleanup Lambda function"
  value       = module.cleanup_lambda.lambda_function_arn
}

output "cleanup_schedule_rule_name" {
  description = "Name of the EventBridge rule for cleanup schedule"
  value       = aws_cloudwatch_event_rule.cleanup_schedule.name
}

output "cleanup_schedule_rule_arn" {
  description = "ARN of the EventBridge rule for cleanup schedule"
  value       = aws_cloudwatch_event_rule.cleanup_schedule.arn
}

output "cleanup_schedule_enabled" {
  description = "Whether the cleanup schedule is currently enabled"
  value       = var.cleanup_schedule_enabled
}
