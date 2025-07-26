terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.5.0"
    }
  }

  backend "s3" {
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      local.awsMyapplicationsTags,
      {
        environment = var.environment,
        project     = "sparks",
        prefix      = var.prefix
      }
    )
  }
}

provider "aws" {
  alias  = "appregistry"
  region = var.aws_region
}
