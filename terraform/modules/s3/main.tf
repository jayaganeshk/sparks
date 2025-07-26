# Main application storage bucket
resource "aws_s3_bucket" "sparks_store" {
  bucket = "${var.prefix}-sparks-store"
}

resource "aws_s3_bucket_ownership_controls" "sparks_store" {
  bucket = aws_s3_bucket.sparks_store.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "sparks_store" {
  bucket = aws_s3_bucket.sparks_store.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "sparks_store" {
  bucket = aws_s3_bucket.sparks_store.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
  }
}


# Bucket for CloudFront access logs
resource "aws_s3_bucket" "logs" {
  bucket = "${var.prefix}-imagedistribution-access-logs"
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
