variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "enable_custom_domain" {
  description = "Whether to use custom domains for all distributions."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "The base domain name for all distributions (e.g., sparks.deonte.in)."
  type        = string
}

variable "ui_domain" {
  description = "The custom domain for the UI distribution."
  type        = string
  default     = ""
}

variable "api_domain" {
  description = "The custom domain for the API Gateway."
  type        = string
  default     = ""
}

variable "assets_domain" {
  description = "The custom domain for the assets distribution."
  type        = string
  default     = ""
}

variable "ui_distribution_domain_name" {
  description = "The domain name of the CloudFront UI distribution."
  type        = string
}

variable "assets_distribution_domain_name" {
  description = "The domain name of the CloudFront assets distribution."
  type        = string
}

variable "api_domain_name" {
  description = "The domain name of the API Gateway custom domain."
  type        = string
  default     = ""
}

variable "api_target_domain_name" {
  description = "The target domain name for the API Gateway custom domain."
  type        = string
  default     = ""
}

variable "api_hosted_zone_id" {
  description = "The hosted zone ID for the API Gateway custom domain."
  type        = string
  default     = ""
}
