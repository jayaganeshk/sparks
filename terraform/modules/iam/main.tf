# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.prefix}_lambda_exec_role"

  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "lambda_exec_policy" {
  name   = "LambdaExecutionPolicy"
  role   = aws_iam_role.lambda_exec_role.id
  policy = data.aws_iam_policy_document.lambda_exec.json
}

data "aws_iam_policy_document" "lambda_exec" {
  statement {
    actions   = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    actions   = ["s3:*"]
    resources = ["*"] # Note: More restrictive permissions are recommended for production
  }

  statement {
    actions   = ["dynamodb:*"]
    resources = [
      var.dynamodb_table_arn,
      "${var.dynamodb_table_arn}/index/*"
    ]
  }

  statement {
    actions   = ["sqs:*"]
    resources = ["*"] # Note: More restrictive permissions are recommended for production
  }
}

# IAM Role for Authenticated Cognito Users
resource "aws_iam_role" "cognito_auth_role" {
  name = "${var.prefix}_sparks_CognitoAuthRole"

  assume_role_policy = data.aws_iam_policy_document.cognito_assume_role.json
}

data "aws_iam_policy_document" "cognito_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [var.cognito_identity_pool_id]
    }

    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

resource "aws_iam_role_policy" "cognito_auth_policy" {
  name   = "CognitoAuthPolicy"
  role   = aws_iam_role.cognito_auth_role.id
  policy = data.aws_iam_policy_document.cognito_auth.json
}

data "aws_iam_policy_document" "cognito_auth" {
  statement {
    actions   = [
      "mobileanalytics:PutEvents",
      "cognito-sync:*",
      "cognito-identity:*"
    ]
    resources = ["*"]
  }

  statement {
    actions   = ["dynamodb:*"]
    resources = [
      var.dynamodb_table_arn,
      "${var.dynamodb_table_arn}/index/*"
    ]
  }

  statement {
    actions   = ["s3:*"]
    resources = [
      var.s3_bucket_arn,
      "${var.s3_bucket_arn}/*"
    ]
  }
}
