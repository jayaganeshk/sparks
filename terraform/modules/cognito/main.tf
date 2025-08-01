# Main user pool for regular users (existing)
resource "aws_cognito_user_pool" "main" {
  name                     = "${var.prefix}_sparks_user_pool"
  mfa_configuration        = "OPTIONAL"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  software_token_mfa_configuration {
    enabled = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
  }

  lambda_config {
    post_confirmation = var.post_confirmation_lambda_arn
  }
}

# Event organizer user group in the main user pool
resource "aws_cognito_user_group" "event_organizers" {
  name         = "event-organizers"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Group for event organizers with elevated permissions"
  precedence   = 1
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.user_pool_domain
  user_pool_id = aws_cognito_user_pool.main.id
}

# Main user pool client for regular users (existing)
resource "aws_cognito_user_pool_client" "main" {
  name                                 = "${var.prefix}_sparks_app_client"
  user_pool_id                         = aws_cognito_user_pool.main.id
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "phone", "openid"]
  callback_urls                        = ["http://localhost:3000/", var.ui_callback_url]
  logout_urls                          = ["http://localhost:3000/", var.ui_callback_url]
  supported_identity_providers         = ["COGNITO"]
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
}

# Event organizer app client for Flutter desktop app (uses same user pool)
resource "aws_cognito_user_pool_client" "event_organizer" {
  name                                 = "${var.prefix}_event_organizer_app_client"
  user_pool_id                         = aws_cognito_user_pool.main.id
  
  # No OAuth flows needed for desktop app - using direct authentication
  allowed_oauth_flows_user_pool_client = false
  
  # Support for desktop application authentication
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]
  
  # Token validity settings
  access_token_validity  = 24  # 24 hours
  id_token_validity      = 24  # 24 hours
  refresh_token_validity = 30  # 30 days
  
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
  
  # Prevent secret generation for public clients (mobile/desktop apps)
  generate_secret = false
  
  # Read and write attributes
  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.prefix}_sparks_identity_pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = var.authenticated_role_arn
  }
}

resource "aws_lambda_permission" "allow_cognito" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = var.post_confirmation_lambda_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
