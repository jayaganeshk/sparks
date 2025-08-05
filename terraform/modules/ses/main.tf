# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  count  = var.enable_custom_domain ? 1 : 0
  domain = var.domain_name
}

# SES Domain DKIM
resource "aws_ses_domain_dkim" "main" {
  count  = var.enable_custom_domain ? 1 : 0
  domain = aws_ses_domain_identity.main[0].domain
}

# Route53 records for SES domain verification
resource "aws_route53_record" "ses_verification" {
  count   = var.enable_custom_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_amazonses.${aws_ses_domain_identity.main[0].domain}"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.main[0].verification_token]
}

# Route53 records for DKIM (AWS SES always generates exactly 3 DKIM tokens)
resource "aws_route53_record" "ses_dkim" {
  count   = var.enable_custom_domain ? 3 : 0
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.main[0].dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = "600"
  records = ["${aws_ses_domain_dkim.main[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# SES Domain Identity Verification
resource "aws_ses_domain_identity_verification" "main" {
  count      = var.enable_custom_domain ? 1 : 0
  domain     = aws_ses_domain_identity.main[0].id
  depends_on = [aws_route53_record.ses_verification]
}

# SES Configuration Set
resource "aws_ses_configuration_set" "main" {
  count = var.enable_custom_domain ? 1 : 0
  name  = "${var.prefix}-sparks-ses-config"

  delivery_options {
    tls_policy = "Require"
  }

  reputation_metrics_enabled = true
}

# SES Identity Policy to allow Cognito to send emails
resource "aws_ses_identity_policy" "cognito" {
  count    = var.enable_custom_domain ? 1 : 0
  identity = aws_ses_domain_identity.main[0].arn
  name     = "${var.prefix}-cognito-ses-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = aws_ses_domain_identity.main[0].arn
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.from_email_address
          }
        }
      }
    ]
  })
}
