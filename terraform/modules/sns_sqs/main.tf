# SNS Topic for image creation events
resource "aws_sns_topic" "image_creation_topic" {
  name = "${var.prefix}-sparks-thumbnail-creation-topic"
}

# Policy to allow S3 to publish to the SNS topic
resource "aws_sns_topic_policy" "s3_publish_policy" {
  arn = aws_sns_topic.image_creation_topic.arn
  policy = data.aws_iam_policy_document.s3_publish.json
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

# SQS Queue for face recognition (FIFO)
resource "aws_sqs_queue" "face_recognition_queue" {
  name                        = "${var.prefix}_face_recogntion_queue.fifo"
  fifo_queue                  = true
  visibility_timeout_seconds  = 60
}

# SQS Queue for thumbnail generation (Standard)
resource "aws_sqs_queue" "thumbnail_generation_queue" {
  name = "${var.prefix}-imageThumbnailGeneration-sqs"
}

# Policy to allow SNS to send messages to the thumbnail queue
resource "aws_sqs_queue_policy" "thumbnail_generation_policy" {
  queue_url = aws_sqs_queue.thumbnail_generation_queue.id
  policy    = data.aws_iam_policy_document.sns_to_sqs.json
}

data "aws_iam_policy_document" "sns_to_sqs" {
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

# Subscription for the thumbnail queue to the SNS topic
resource "aws_sns_topic_subscription" "thumbnail_generation_subscription" {
  topic_arn              = aws_sns_topic.image_creation_topic.arn
  protocol               = "sqs"
  endpoint               = aws_sqs_queue.thumbnail_generation_queue.arn
  raw_message_delivery = true
}
