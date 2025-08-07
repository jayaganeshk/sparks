resource "aws_cloudwatch_query_definition" "web_download_activity" {
  name = "${var.prefix}-web-download-activity"

  query_string = <<-EOT
    fields @timestamp, @message, @logStream, @log
    | filter @message like /eventBody/
    | stats count() as total by eventBody.user, eventBody.imageUrl
    | sort by total desc
  EOT
}

resource "aws_cloudwatch_query_definition" "api_errors" {
  name = "${var.prefix}-api-errors"

  query_string = <<-EOT
    fields @timestamp, @message, @logStream
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 100
  EOT
}

resource "aws_cloudwatch_query_definition" "user_activity" {
  name = "${var.prefix}-user-activity"

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /User activity/
    | stats count() as activity_count by userType, activity
    | sort activity_count desc
  EOT
}

resource "aws_cloudwatch_query_definition" "business_metrics" {
  name = "${var.prefix}-business-metrics"

  query_string = <<-EOT
    fields @timestamp, @message
    | filter @message like /Content interaction/ or @message like /Feature usage/
    | stats count() as usage_count by feature, userType
    | sort usage_count desc
  EOT
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.prefix}-sparks-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      # User Authentication & Activity Overview
      {
        height = 6,
        width  = 12,
        y      = 0,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "AuthenticatedRequests", "service", "express-api"],
            [".", "VerifiedUserRequests", ".", "."],
            [".", "UnverifiedUserRequests", ".", "."],
            [".", "standardUserRequests", ".", "."],
            [".", "premiumUserRequests", ".", "."],
            [".", "adminUserRequests", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "User Authentication & Types"
        }
      },

      # User Cohort Analysis
      {
        height = 6,
        width  = 12,
        y      = 0,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = true,
          metrics = [
            ["Sparks/API", "NewUserAccountRequests", "service", "express-api"],
            [".", "RecentUserAccountRequests", ".", "."],
            [".", "RegularUserAccountRequests", ".", "."],
            [".", "EstablishedUserAccountRequests", ".", "."],
            [".", "VeteranUserAccountRequests", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "User Cohort Activity"
        }
      },

      # Photo Engagement Metrics
      {
        height = 6,
        width  = 12,
        y      = 6,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "PhotoBrowsingActivity", "service", "express-api"],
            [".", "PhotoViewingActivity", ".", "."],
            [".", "PhotoGalleryFeatureUsage", ".", "."],
            [".", "PhotoDetailFeatureUsage", ".", "."],
            [".", "OwnPhotoViews", ".", "."],
            [".", "OtherPhotoViews", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Photo Engagement Metrics"
        }
      },

      # Content Interaction Analysis
      {
        height = 6,
        width  = 12,
        y      = 6,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "ContentInteractions", "service", "express-api", "contentType", "Photo", "action", "Browse"],
            [".", ".", ".", ".", ".", ".", ".", "View"],
            [".", ".", ".", ".", ".", "FaceRecognition", ".", "View"],
            [".", "PhotosWithFacesViewed", ".", "express-api"],
            [".", "PhotosWithoutFacesViewed", ".", "."],
            [".", "FacesDetectedViewed", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Content Interaction Analysis"
        }
      },

      # Feature Usage by User Type
      {
        height = 6,
        width  = 12,
        y      = 12,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = true,
          metrics = [
            ["Sparks/API", "FeatureAdoption", "service", "express-api", "userType", "standard"],
            [".", ".", ".", ".", ".", "premium"],
            [".", ".", ".", ".", ".", "admin"],
            [".", "FaceRecognitionFeatureUsage", ".", "express-api"],
            [".", "PaginationUsage", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Feature Usage by User Type"
        }
      },

      # Upload and Content Creation
      {
        height = 6,
        width  = 12,
        y      = 12,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "PresignedUrlsGenerated", "service", "express-api"],
            [".", "UploadsCompleted", ".", "."],
            [".", "PhotoRecordsCreated", ".", "."],
            [".", "UploadsWithDescription", ".", "."],
            [".", "UploadsWithTags", ".", "."],
            [".", "ProfilePictureUploadsCompleted", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Upload and Content Creation"
        }
      },

      # User Behavior Patterns
      {
        height = 6,
        width  = 12,
        y      = 18,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "standardUserActivity", "service", "express-api"],
            [".", "premiumUserActivity", ".", "."],
            [".", "adminUserActivity", ".", "."],
            [".", "FaceRecognitionViewingActivity", ".", "."],
            [".", "EventsLogged", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "User Behavior Patterns"
        }
      },

      # Business Performance Indicators
      {
        height = 6,
        width  = 12,
        y      = 18,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "singleValue",
          metrics = [
            ["Sparks/API", "AuthenticatedRequests", "service", "express-api"],
            [".", "PhotosQueried", ".", "."],
            [".", "UploadsCompleted", ".", "."],
            [".", "FaceRecognitionFeatureUsage", ".", "."],
            [".", "premiumUserRequests", ".", "."],
            [".", "VerifiedUserRequests", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Business KPIs (Last 5 Minutes)"
        }
      },

      # Error Analysis by User Type
      {
        height = 6,
        width  = 12,
        y      = 24,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = true,
          metrics = [
            ["Sparks/API", "UserErrorCount", "service", "express-api", "userType", "standard"],
            [".", ".", ".", ".", ".", "premium"],
            [".", ".", ".", ".", ".", "admin"],
            [".", "PhotosQueryErrors", ".", "express-api"],
            [".", "UploadCompletionErrors", ".", "."],
            [".", "PhotoRetrievalErrors", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Error Analysis by User Type"
        }
      },

      # API Performance by User Type
      {
        height = 6,
        width  = 12,
        y      = 24,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "AuthenticatedResponseTime", "service", "express-api", "userType", "standard", { "stat": "Average" }],
            [".", ".", ".", ".", ".", "premium", { "stat": "Average" }],
            [".", ".", ".", ".", ".", "admin", { "stat": "Average" }],
            [".", "ResponseTime", ".", "express-api", { "stat": "Average" }]
          ],
          period = 300,
          stat   = "Average",
          region = var.aws_region,
          title  = "API Performance by User Type"
        }
      },

      # Lambda Business Metrics
      {
        height = 6,
        width  = 12,
        y      = 30,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/Lambda", "ImageVariantsProcessed", "service", "image-thumbnail-generation"],
            [".", "RecordsProcessedSuccessfully", ".", "."],
            [".", "SignupTriggerSuccessful", ".", "signup-trigger"],
            [".", "UserLimitsCreated", ".", "."],
            [".", "FaceRecognitionMessagesQueued", ".", "express-api"]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Lambda Business Operations"
        }
      },

      # System Health by User Impact
      {
        height = 6,
        width  = 12,
        y      = 30,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", "${var.prefix}-imageThumbnailGeneration"],
            [".", ".", ".", "${var.prefix}-signup-trigger"],
            ["Sparks/API", "ErrorCount", "service", "express-api"],
            [".", "UserErrorCount", ".", ".", "userType", "premium"],
            [".", ".", ".", ".", ".", "admin"]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "System Health by User Impact"
        }
      },

      # User Engagement Funnel
      {
        height = 6,
        width  = 12,
        y      = 36,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "AuthenticatedRequests", "service", "express-api"],
            [".", "PhotoBrowsingActivity", ".", "."],
            [".", "PhotoViewingActivity", ".", "."],
            [".", "PresignedUrlsGenerated", ".", "."],
            [".", "UploadsCompleted", ".", "."],
            [".", "FaceRecognitionViewingActivity", ".", "."]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "User Engagement Funnel"
        }
      },

      # Revenue-Related Metrics (Premium Features)
      {
        height = 6,
        width  = 12,
        y      = 36,
        x      = 12,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["Sparks/API", "premiumUserRequests", "service", "express-api"],
            [".", "adminUserRequests", ".", "."],
            [".", "premiumUserActivity", ".", "."],
            [".", "adminUserActivity", ".", "."],
            [".", "FeatureAdoption", ".", ".", "userType", "premium"],
            [".", ".", ".", ".", ".", "admin"]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Premium User Engagement"
        }
      },

      # Real-time Business Dashboard
      {
        height = 6,
        width  = 24,
        y      = 42,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "number",
          metrics = [
            ["Sparks/API", "AuthenticatedRequests", "service", "express-api", { "label": "Active Users" }],
            [".", "PhotosQueried", ".", ".", { "label": "Photos Viewed" }],
            [".", "UploadsCompleted", ".", ".", { "label": "Photos Uploaded" }],
            [".", "FaceRecognitionFeatureUsage", ".", ".", { "label": "Face Recognition Uses" }],
            [".", "premiumUserRequests", ".", ".", { "label": "Premium User Activity" }],
            [".", "ErrorCount", ".", ".", { "label": "Errors" }]
          ],
          period = 300,
          stat   = "Sum",
          region = var.aws_region,
          title  = "Real-time Business Metrics"
        }
      }
    ]
  })
}

# Enhanced CloudWatch Alarms for Business Metrics
resource "aws_cloudwatch_metric_alarm" "low_user_engagement" {
  alarm_name          = "${var.prefix}-low-user-engagement"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "AuthenticatedRequests"
  namespace           = "Sparks/API"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when user engagement drops below threshold"
  alarm_actions       = []

  dimensions = {
    service = "express-api"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_premium_user_errors" {
  alarm_name          = "${var.prefix}-high-premium-user-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UserErrorCount"
  namespace           = "Sparks/API"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when premium users experience high error rates"
  alarm_actions       = []

  dimensions = {
    service  = "express-api"
    userType = "premium"
  }
}

resource "aws_cloudwatch_metric_alarm" "face_recognition_usage_drop" {
  alarm_name          = "${var.prefix}-face-recognition-usage-drop"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "FaceRecognitionFeatureUsage"
  namespace           = "Sparks/API"
  period              = "900"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when face recognition feature usage drops significantly"
  alarm_actions       = []

  dimensions = {
    service = "express-api"
  }
}

resource "aws_cloudwatch_metric_alarm" "upload_completion_rate" {
  alarm_name          = "${var.prefix}-low-upload-completion-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UploadsCompleted"
  namespace           = "Sparks/API"
  period              = "600"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Alert when upload completion rate is low"
  alarm_actions       = []

  dimensions = {
    service = "express-api"
  }
}
