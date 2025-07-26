resource "aws_dynamodb_table" "master_table" {
  name                        = "${var.prefix}_sparks_master_table"
  billing_mode                = "PROVISIONED"
  read_capacity               = 1
  write_capacity              = 1
  deletion_protection_enabled = true

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "entityType"
    type = "S"
  }

  attribute {
    name = "uploadedBy"
    type = "S"
  }

  attribute {
    name = "limit"
    type = "N"
  }

  local_secondary_index {
    name            = "PK-limit-index"
    range_key       = "limit"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "uploadedBy-PK-index"
    hash_key        = "uploadedBy"
    range_key       = "PK"
    projection_type = "ALL"
    read_capacity   = 1
    write_capacity  = 1
  }

  global_secondary_index {
    name            = "entityType-PK-index"
    hash_key        = "entityType"
    range_key       = "PK"
    projection_type = "ALL"
    read_capacity   = 1
    write_capacity  = 1
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "sparks-master-table"
  }
}
