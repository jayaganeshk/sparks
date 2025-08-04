output "cleanup_lambda_function_name" {
  description = "Name of the cleanup Lambda function"
  value       = module.cleanup_lambda.lambda_function_name
}

output "cleanup_lambda_function_arn" {
  description = "ARN of the cleanup Lambda function"
  value       = module.cleanup_lambda.lambda_function_arn
}

output "cleanup_schedule_name" {
  description = "Name of the EventBridge Scheduler schedule for cleanup"
  value       = aws_scheduler_schedule.cleanup_schedule.name
}

output "cleanup_schedule_arn" {
  description = "ARN of the EventBridge Scheduler schedule for cleanup"
  value       = aws_scheduler_schedule.cleanup_schedule.arn
}

output "cleanup_schedule_enabled" {
  description = "Whether the cleanup schedule is currently enabled"
  value       = var.cleanup_schedule_enabled
}

output "scheduler_execution_role_arn" {
  description = "ARN of the EventBridge Scheduler execution role"
  value       = aws_iam_role.scheduler_execution_role.arn
}
