resource "aws_cloudwatch_query_definition" "web_download_activity" {
  name = "${var.prefix}-web-download-activity"

  query_string = <<-EOT
    fields @timestamp, @message, @logStream, @log
    | filter @message like /eventBody/
    | stats count() as total by eventBody.user, eventBody.imageUrl
    | sort by total desc
  EOT
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.prefix}-sparks"

  dashboard_body = jsonencode({
    widgets = [
      {
        height = 6,
        width  = 7,
        y      = 0,
        x      = 0,
        type   = "metric",
        properties = {
          view    = "timeSeries",
          stacked = false,
          metrics = [
            ["AWS/DynamoDB", "ProvisionedReadCapacityUnits", "TableName", var.dynamodb_table_name, "GlobalSecondaryIndexName", "entityType-PK-index"],
            [".", "ConsumedWriteCapacityUnits", ".", ".", ".", "."],
            [".", "ProvisionedWriteCapacityUnits", ".", ".", ".", "."],
            [".", "ConsumedReadCapacityUnits", ".", ".", ".", "."],
            [".", "ConsumedWriteCapacityUnits", ".", ".", ".", "uploadedBy-PK-index"],
            [".", "ProvisionedWriteCapacityUnits", ".", ".", ".", "."],
            [".", "ProvisionedReadCapacityUnits", ".", ".", ".", "."],
            [".", "ConsumedReadCapacityUnits", ".", ".", ".", "."]
          ],
          region = var.aws_region
        }
      }
    ]
  })
}
