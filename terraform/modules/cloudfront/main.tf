# Origin Access Control for the S3 bucket
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.prefix}-s3-oac"
  description                       = "Origin Access Control for Sparks S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Distribution for the UI (Amplify)
resource "aws_cloudfront_distribution" "ui_distribution" {
  origin {
    domain_name = var.amplify_branch_domain
    origin_id   = "uiOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.prefix} sparks amplify"
  default_root_object = "index.html"

  aliases = var.use_custom_domain_for_ui ? [var.ui_custom_domain] : []

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "uiOrigin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.use_custom_domain_for_ui ? var.acm_certificate_arn : null
    cloudfront_default_certificate = var.use_custom_domain_for_ui ? null : true
    ssl_support_method             = var.use_custom_domain_for_ui ? "sni-only" : null
  }
}

# Distribution for the S3 images
resource "aws_cloudfront_distribution" "image_distribution" {
  origin {
    domain_name              = var.s3_bucket_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
    origin_id                = "myS3Origin"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Image distribution for ${var.s3_bucket_name}"
  http_version        = "http2and3"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "myS3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  logging_config {
    include_cookies = false
    bucket          = var.logs_bucket_domain_name
    prefix          = "cloudfront-access-logs/"
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# S3 Bucket Policy to allow CloudFront access
resource "aws_s3_bucket_policy" "s3_access" {
  bucket = var.s3_bucket_name
  policy = data.aws_iam_policy_document.s3_access.json
}

data "aws_iam_policy_document" "s3_access" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${var.s3_bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.image_distribution.arn]
    }
  }
}
