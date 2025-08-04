# Get the hosted zone for the domain
data "aws_route53_zone" "main" {
  count = var.enable_custom_domain ? 1 : 0
  name  = var.domain_name
}

# Create A record for UI distribution
resource "aws_route53_record" "ui" {
  count = var.enable_custom_domain && var.ui_domain != "" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.ui_domain
  type    = "A"

  alias {
    name                   = var.ui_distribution_domain_name
    zone_id                = "Z2FDTNDATAQYW2" # CloudFront hosted zone ID (always the same)
    evaluate_target_health = false
  }
}

# Create A record for assets distribution
resource "aws_route53_record" "assets" {
  count = var.enable_custom_domain && var.assets_domain != "" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.assets_domain
  type    = "A"

  alias {
    name                   = var.assets_distribution_domain_name
    zone_id                = "Z2FDTNDATAQYW2" # CloudFront hosted zone ID (always the same)
    evaluate_target_health = false
  }
}

# Create A record for API Gateway
resource "aws_route53_record" "api" {
  count = var.enable_custom_domain && var.api_domain != "" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.api_domain
  type    = "A"

  alias {
    name                   = var.api_target_domain_name
    zone_id                = var.api_hosted_zone_id
    evaluate_target_health = false
  }
}
