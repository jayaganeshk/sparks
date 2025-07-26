output "image_creation_topic_arn" {
  description = "The ARN of the SNS topic for image creation events."
  value       = aws_sns_topic.image_creation_topic.arn
}

output "face_recognition_queue_arn" {
  description = "The ARN of the SQS queue for face recognition."
  value       = aws_sqs_queue.face_recognition_queue.arn
}

output "face_recognition_queue_url" {
  description = "The URL of the SQS queue for face recognition."
  value       = aws_sqs_queue.face_recognition_queue.id
}

output "thumbnail_generation_queue_arn" {
  description = "The ARN of the SQS queue for thumbnail generation."
  value       = aws_sqs_queue.thumbnail_generation_queue.arn
}

output "thumbnail_generation_queue_url" {
  description = "The URL of the SQS queue for thumbnail generation."
  value       = aws_sqs_queue.thumbnail_generation_queue.id
}
