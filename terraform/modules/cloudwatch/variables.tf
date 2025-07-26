variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "dynamodb_table_name" {
  description = "The name of the DynamoDB table."
  type        = string
}

variable "aws_region" {
  description = "The AWS region for the resources."
  type        = string
}
