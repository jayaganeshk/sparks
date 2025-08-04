# The module now expects provider configurations to be passed by the caller

# No need to look up the Route 53 zone, we'll use the zone_id directly

# Certificate for UI CloudFront distribution in us-east-1
resource "aws_acm_certificate" "ui" {
  count             = var.enable_custom_domain ? 1 : 0
  provider          = aws.cloudfront_acm
  domain_name       = var.ui_custom_domain != "" ? var.ui_custom_domain : "${var.environment}.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.prefix}-ui-certificate"
    Environment = var.environment
  }
}

# Certificate for assets CloudFront distribution in us-east-1
resource "aws_acm_certificate" "assets" {
  count             = var.enable_custom_domain ? 1 : 0
  provider          = aws.cloudfront_acm
  domain_name       = var.assets_custom_domain != "" ? var.assets_custom_domain : "assets.${var.environment}.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.prefix}-assets-certificate"
    Environment = var.environment
  }
}

# Certificate for API Gateway in the API region
resource "aws_acm_certificate" "api" {
  count             = var.enable_custom_domain ? 1 : 0
  provider          = aws.api_acm
  domain_name       = var.api_custom_domain != "" ? var.api_custom_domain : "api.${var.environment}.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.prefix}-api-certificate"
    Environment = var.environment
  }
}

# DNS validation records for UI certificate
resource "aws_route53_record" "ui_validation" {
  for_each = var.enable_custom_domain ? {
    for dvo in aws_acm_certificate.ui[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# DNS validation records for assets certificate
resource "aws_route53_record" "assets_validation" {
  for_each = var.enable_custom_domain ? {
    for dvo in aws_acm_certificate.assets[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# DNS validation records for API Gateway certificate
resource "aws_route53_record" "api_validation" {
  for_each = var.enable_custom_domain ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Wait for UI certificate validation
resource "aws_acm_certificate_validation" "ui" {
  count                   = var.enable_custom_domain ? 1 : 0
  provider                = aws.cloudfront_acm
  certificate_arn         = aws_acm_certificate.ui[0].arn
  validation_record_fqdns = [for record in aws_route53_record.ui_validation : record.fqdn]
}

# Wait for assets certificate validation
resource "aws_acm_certificate_validation" "assets" {
  count                   = var.enable_custom_domain ? 1 : 0
  provider                = aws.cloudfront_acm
  certificate_arn         = aws_acm_certificate.assets[0].arn
  validation_record_fqdns = [for record in aws_route53_record.assets_validation : record.fqdn]
}

# Wait for API Gateway certificate validation
resource "aws_acm_certificate_validation" "api" {
  count                   = var.enable_custom_domain ? 1 : 0
  provider                = aws.api_acm
  certificate_arn         = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for record in aws_route53_record.api_validation : record.fqdn]
}
