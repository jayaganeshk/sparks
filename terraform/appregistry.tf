resource "aws_servicecatalogappregistry_application" "sparksApp" {
  provider    = aws.appregistry
  name        = "${var.prefix}sparks"
  description = "Sparks Application"
}

locals {
  awsMyapplicationsTags = aws_servicecatalogappregistry_application.sparksApp.application_tag
}
