variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "domain_name" {
  description = "The base domain name for all distributions (e.g., sparks.deonte.in)."
  type        = string
}

variable "environment" {
  description = "The environment (e.g., dev, prod)."
  type        = string
}

variable "enable_custom_domain" {
  description = "Whether to use custom domains for all distributions."
  type        = bool
  default     = false
}

variable "ui_custom_domain" {
  description = "The custom domain for the UI distribution."
  type        = string
  default     = ""
}

variable "api_custom_domain" {
  description = "The custom domain for the API Gateway."
  type        = string
  default     = ""
}

variable "assets_custom_domain" {
  description = "The custom domain for the assets distribution."
  type        = string
  default     = ""
}

variable "cognito_custom_domain" {
  description = "The custom domain for the Cognito User Pool."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "The ID of the Route 53 hosted zone for the domain."
  type        = string
}

variable "aws_region" {
  description = "The AWS region where the API Gateway is deployed."
  type        = string
}
