# ---------- API Gateway for FastAPI Integration ----------

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project}-api"
  description = "Compliance Screenshot Archiver API"

  # Enable binary media types for file downloads
  binary_media_types = [
    "application/pdf",
    "image/png",
    "application/octet-stream"
  ]

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${var.project}-api"
  }
}

# ---------- Cognito Authorizer ----------

resource "aws_api_gateway_authorizer" "cognito" {
  name                   = "${var.project}-cognito-authorizer"
  rest_api_id            = aws_api_gateway_rest_api.main.id
  type                   = "COGNITO_USER_POOLS"
  identity_source        = "method.request.header.Authorization"
  provider_arns          = [aws_cognito_user_pool.main.arn]
  authorizer_credentials = aws_iam_role.api_gateway_cognito.arn
}

# ---------- Lambda Integration ----------

# Lambda proxy integration for all paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# Lambda integration
resource "aws_api_gateway_integration" "lambda_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

# Root resource method (for health checks, etc.)
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_rest_api.main.root_resource_id
  http_method   = "ANY"
  authorization = "NONE" # Allow unauthenticated health checks
}

resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_rest_api.main.root_resource_id
  http_method = aws_api_gateway_method.root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

# ---------- CORS Configuration ----------

# Options method for CORS
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ---------- API Gateway Deployment ----------

resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.lambda_proxy,
    aws_api_gateway_integration.lambda_root,
    aws_api_gateway_integration.options,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  lifecycle {
    create_before_destroy = true
  }
}

# ---------- API Gateway Stage ----------

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  # Enable caching for performance
  cache_cluster_enabled = false # Can be enabled for production
  cache_cluster_size    = "0.5"

  tags = {
    Name = "${var.project}-api-prod"
  }
}

# Separate resource for method settings including throttling
resource "aws_api_gateway_method_settings" "settings" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
    throttling_rate_limit  = 1000
    throttling_burst_limit = 2000
  }
}

# ---------- CloudWatch Log Group for API Gateway ----------

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project}"
  retention_in_days = 14

  tags = {
    Name = "${var.project}-api-gateway-logs"
  }
}

# ---------- Lambda Permission for API Gateway ----------

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"

  # Allow from any method and resource in this API
  source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ---------- IAM Role for API Gateway Cognito Integration ----------

data "aws_iam_policy_document" "api_gateway_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_gateway_cognito" {
  name               = "${var.project}-api-gateway-cognito-role"
  assume_role_policy = data.aws_iam_policy_document.api_gateway_trust.json
}

# Policy for API Gateway to invoke Cognito
data "aws_iam_policy_document" "api_gateway_cognito" {
  statement {
    sid    = "AllowCognitoAccess"
    effect = "Allow"
    actions = [
      "cognito-idp:GetUser",
      "cognito-identity:GetId",
      "cognito-identity:GetCredentialsForIdentity"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "api_gateway_cognito" {
  name   = "${var.project}-api-gateway-cognito-policy"
  role   = aws_iam_role.api_gateway_cognito.id
  policy = data.aws_iam_policy_document.api_gateway_cognito.json
}

# ---------- Custom Domain Name (Optional) ----------

# Can be uncommented and configured when you have a domain
# resource "aws_api_gateway_domain_name" "main" {
#   domain_name     = "${var.project}.yourdomain.com"
#   certificate_arn = aws_acm_certificate.main.arn
# 
#   endpoint_configuration {
#     types = ["REGIONAL"]
#   }
# 
#   tags = {
#     Name = "${var.project}-api-domain"
#   }
# }

# resource "aws_api_gateway_base_path_mapping" "main" {
#   api_id      = aws_api_gateway_rest_api.main.id
#   stage_name  = aws_api_gateway_stage.prod.stage_name
#   domain_name = aws_api_gateway_domain_name.main.domain_name
# }