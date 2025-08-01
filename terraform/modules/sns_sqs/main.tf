# SNS Topic for image creation events (original upload)
resource "aws_sns_topic" "image_creation_topic" {
  name = "${var.prefix}-sparks-thumbnail-creation-topic"
}

# SNS Topic for thumbnail completion events (triggers face recognition) - FIFO to match FIFO SQS queue
resource "aws_sns_topic" "thumbnail_completion_topic" {
  name                        = "${var.prefix}-sparks-thumbnail-completion-topic.fifo"
  fifo_topic                  = true
  content_based_deduplication = true
}

# Policy to allow S3 to publish to the SNS topic
resource "aws_sns_topic_policy" "s3_publish_policy" {
  arn = aws_sns_topic.image_creation_topic.arn
  policy = data.aws_iam_policy_document.s3_publish.json
}

# Policy to allow Lambda to publish to the thumbnail completion SNS topic
resource "aws_sns_topic_policy" "lambda_publish_policy" {
  arn = aws_sns_topic.thumbnail_completion_topic.arn
  policy = data.aws_iam_policy_document.lambda_publish.json
}

data "aws_iam_policy_document" "s3_publish" {
  statement {
    effect  = "Allow"
    actions = ["sns:Publish"]
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
    resources = [aws_sns_topic.image_creation_topic.arn]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [var.s3_bucket_arn]
    }
  }
}

data "aws_iam_policy_document" "lambda_publish" {
  statement {
    effect  = "Allow"
    actions = ["sns:Publish"]
    principals {
      type        = "AWS"
      identifiers = [var.lambda_execution_role_arn]
    }
    resources = [aws_sns_topic.thumbnail_completion_topic.arn]
  }
}

# Dead Letter Queue for face recognition (FIFO)
resource "aws_sqs_queue" "face_recognition_dlq" {
  name                        = "${var.prefix}_face_recognition_dlq.fifo"
  fifo_queue                  = true
  message_retention_seconds   = 1209600  # 14 days
}

# SQS Queue for face recognition (FIFO)
resource "aws_sqs_queue" "face_recognition_queue" {
  name                        = "${var.prefix}_face_recogntion_queue.fifo"
  fifo_queue                  = true
  visibility_timeout_seconds  = 60
  
  # Configure Dead Letter Queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.face_recognition_dlq.arn
    maxReceiveCount     = 5  # Number of processing attempts before sending to DLQ
  })
}

# Dead Letter Queue for thumbnail generation (Standard)
resource "aws_sqs_queue" "thumbnail_generation_dlq" {
  name                      = "${var.prefix}-imageThumbnailGeneration-dlq"
  message_retention_seconds = 1209600  # 14 days
}

# SQS Queue for thumbnail generation (Standard)
resource "aws_sqs_queue" "thumbnail_generation_queue" {
  name = "${var.prefix}-imageThumbnailGeneration-sqs"
  
  # Configure Dead Letter Queue
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.thumbnail_generation_dlq.arn
    maxReceiveCount     = 5  # Number of processing attempts before sending to DLQ
  })
}

# Policy to allow SNS to send messages to the thumbnail queue
resource "aws_sqs_queue_policy" "thumbnail_generation_policy" {
  queue_url = aws_sqs_queue.thumbnail_generation_queue.id
  policy    = data.aws_iam_policy_document.sns_to_thumbnail_sqs.json
}

# Policy to allow SNS to send messages to the face recognition queue
resource "aws_sqs_queue_policy" "face_recognition_policy" {
  queue_url = aws_sqs_queue.face_recognition_queue.id
  policy    = data.aws_iam_policy_document.sns_to_face_recognition_sqs.json
}

data "aws_iam_policy_document" "sns_to_thumbnail_sqs" {
  statement {
    effect  = "Allow"
    actions = ["sqs:SendMessage"]
    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
    resources = [aws_sqs_queue.thumbnail_generation_queue.arn]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.image_creation_topic.arn]
    }
  }
}

data "aws_iam_policy_document" "sns_to_face_recognition_sqs" {
  statement {
    effect  = "Allow"
    actions = ["sqs:SendMessage"]
    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
    resources = [aws_sqs_queue.face_recognition_queue.arn]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.thumbnail_completion_topic.arn]
    }
  }
}

# Subscription for the thumbnail queue to the SNS topic (original image upload)
resource "aws_sns_topic_subscription" "thumbnail_generation_subscription" {
  topic_arn              = aws_sns_topic.image_creation_topic.arn
  protocol               = "sqs"
  endpoint               = aws_sqs_queue.thumbnail_generation_queue.arn
  raw_message_delivery = true
}

# Subscription for the face recognition queue to the thumbnail completion SNS topic
resource "aws_sns_topic_subscription" "face_recognition_subscription" {
  topic_arn              = aws_sns_topic.thumbnail_completion_topic.arn
  protocol               = "sqs"
  endpoint               = aws_sqs_queue.face_recognition_queue.arn
  raw_message_delivery = true
}
