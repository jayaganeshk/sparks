# Generate RSA key pair for CloudFront URL signing (only generated once)
resource "tls_private_key" "cloudfront_key" {
  algorithm = "RSA"
  rsa_bits  = 2048

  # This ensures the key is only created once and not replaced on subsequent applies
  lifecycle {
    ignore_changes = all
  }
}

# CloudFront Key Group for URL signing
resource "aws_cloudfront_public_key" "signing_key" {
  name        = "${var.prefix}-cloudfront-signing-key"
  comment     = "Public key for signing CloudFront URLs"
  encoded_key = tls_private_key.cloudfront_key.public_key_pem
}

resource "aws_cloudfront_key_group" "signing_key_group" {
  name    = "${var.prefix}-cloudfront-signing-key-group"
  comment = "Key group for CloudFront URL signing"
  items   = [aws_cloudfront_public_key.signing_key.id]
}

# SSM Parameters for CloudFront signing keys
resource "aws_ssm_parameter" "cloudfront_private_key" {
  name        = "/sparks/${var.prefix}/cloudfront/private_key"
  description = "Private key for CloudFront URL signing"
  type        = "SecureString"
  value       = tls_private_key.cloudfront_key.private_key_pem
  tags = {
    Environment = var.prefix
  }

  # This ensures the parameter is only created once and not replaced on subsequent applies
  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "cloudfront_public_key" {
  name        = "/sparks/${var.prefix}/cloudfront/public_key"
  description = "Public key for CloudFront URL signing"
  type        = "String"
  value       = tls_private_key.cloudfront_key.public_key_pem
  tags = {
    Environment = var.prefix
  }

  # This ensures the parameter is only created once and not replaced on subsequent applies
  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "cloudfront_key_pair_id" {
  name        = "/sparks/${var.prefix}/cloudfront/key_pair_id"
  description = "Key Pair ID for CloudFront URL signing"
  type        = "String"
  value       = aws_cloudfront_public_key.signing_key.id
  tags = {
    Environment = var.prefix
  }
}
