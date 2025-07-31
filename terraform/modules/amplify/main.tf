resource "aws_amplify_app" "main" {
  name = "${var.prefix}_sparks-amplify"

  # Custom rules for SPA routing
  custom_rule {
    source = "/<*>"
    target = "/"
    status = "404"
  }

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    target = "/"
    status = "200"
  }

  # Platform for manual deployments
  platform = "WEB"
}

# Create a prod branch for manual deployment
resource "aws_amplify_branch" "prod" {
  app_id      = aws_amplify_app.main.id
  branch_name = "prod"

  # Disable auto build since we're doing manual deployments
  enable_auto_build = false
}
