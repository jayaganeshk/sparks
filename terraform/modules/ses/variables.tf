variable "prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "environment" {
  description = "The environment for the resources."
  type        = string
}

variable "enable_custom_domain" {
  description = "Whether to enable custom domain for SES."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "The base domain name for SES."
  type        = string
  default     = ""
}

variable "from_email_address" {
  description = "The email address to send emails from."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "The ID of the Route 53 hosted zone for the domain."
  type        = string
  default     = ""
}
