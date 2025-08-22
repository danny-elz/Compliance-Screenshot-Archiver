# ---------- Cognito User Pool ----------

resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-user-pool"

  # Secure password policy as required by REQ-AUTH-001
  password_policy {
    minimum_length                   = 12
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }

  # Username configuration - allow email login
  username_attributes = ["email"]

  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Enable MFA for admin users (NFR-SECURITY)
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # Lambda triggers for custom authentication flows if needed
  # Can be extended later for SAML/OIDC integration

  tags = {
    Name = "${var.project}-user-pool"
  }
}

# ---------- User Pool Domain ----------

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project}-auth-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ---------- User Pool Client (App Client) ----------

resource "aws_cognito_user_pool_client" "api_client" {
  name         = "${var.project}-api-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true # Required for server-side applications

  # Token validity settings
  access_token_validity  = 1  # 1 hour
  id_token_validity      = 1  # 1 hour  
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # OAuth settings
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs for application integration
  callback_urls = [
    "https://localhost:8000/auth/callback",
    "https://${var.project}.example.com/auth/callback"
  ]

  logout_urls = [
    "https://localhost:8000/logout",
    "https://${var.project}.example.com/logout"
  ]

  # Security settings
  prevent_user_existence_errors = "ENABLED"

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "preferred_username"
  ]

  write_attributes = [
    "email",
    "preferred_username"
  ]
}

# ---------- User Groups ----------

# Admin group for administrative users
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Administrator users with full access"
  precedence   = 10
  role_arn     = aws_iam_role.cognito_admin.arn
}

# Regular user group
resource "aws_cognito_user_group" "user" {
  name         = "user"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Regular users with standard access"
  precedence   = 20
  role_arn     = aws_iam_role.cognito_user.arn
}

# Auditor group for read-only audit access
resource "aws_cognito_user_group" "auditor" {
  name         = "auditor"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Auditor users with read-only access"
  precedence   = 30
  role_arn     = aws_iam_role.cognito_auditor.arn
}

# ---------- IAM Roles for Cognito User Groups ----------

# Trust policy for Cognito Identity Provider
data "aws_iam_policy_document" "cognito_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = ["cognito-identity.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.main.id]
    }
    condition {
      test     = "ForAnyValue:StringLike"
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

# Admin role with full permissions
resource "aws_iam_role" "cognito_admin" {
  name               = "${var.project}-cognito-admin-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_trust.json
}

# User role with limited permissions
resource "aws_iam_role" "cognito_user" {
  name               = "${var.project}-cognito-user-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_trust.json
}

# Auditor role with read-only permissions
resource "aws_iam_role" "cognito_auditor" {
  name               = "${var.project}-cognito-auditor-role"
  assume_role_policy = data.aws_iam_policy_document.cognito_trust.json
}

# ---------- Cognito Identity Pool ----------

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project}-identity-pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.api_client.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  # Future: SAML and OIDC providers can be added here for REQ-AUTH-001
  # saml_provider_arns = []
  # openid_connect_provider_arns = []

  tags = {
    Name = "${var.project}-identity-pool"
  }
}

# ---------- Identity Pool Role Attachment ----------

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated" = aws_iam_role.cognito_user.arn
  }

  role_mapping {
    identity_provider         = "${aws_cognito_user_pool.main.endpoint}:${aws_cognito_user_pool_client.api_client.id}"
    ambiguous_role_resolution = "AuthenticatedRole"
    type                      = "Token"
  }
}