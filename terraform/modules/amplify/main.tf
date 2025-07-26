resource "aws_amplify_app" "main" {
  name = "${var.prefix}_sparks-amplify"

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
}
