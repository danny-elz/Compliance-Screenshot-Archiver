# Authentication Setup Guide

This guide explains how to set up and use JWT authentication with AWS Cognito for the Compliance Screenshot Archiver API.

## Overview

The API uses JWT tokens issued by AWS Cognito User Pool for authentication and role-based access control (RBAC). Users are assigned to Cognito groups that map to application roles.

## Role Hierarchy

- **Admin**: Full access to all resources and admin functions
- **Operator**: Can view resources and trigger captures
- **Viewer**: Read-only access to resources

## Cognito Group Mapping

| Cognito Group | Application Role | Permissions |
|---------------|------------------|-------------|
| `admin`       | `admin`          | Full access |
| `user`        | `operator`       | View + trigger captures |
| `auditor`     | `viewer`         | Read-only access |

## Environment Configuration

Set the following environment variables:

```bash
# Required
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_REGION=us-east-1

# Optional (will be auto-constructed if not provided)
JWT_AUDIENCE=your-cognito-client-id
JWT_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX
JWT_JWKS_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/jwks.json
```

## Setting up Cognito (via Terraform)

The Terraform configuration creates:

1. **User Pool** with secure password policy and MFA
2. **User Groups** (admin, user, auditor)
3. **App Client** for JWT token generation
4. **Identity Pool** for AWS resource access

Deploy with:
```bash
cd infra
terraform init
terraform plan
terraform apply
```

## API Usage

### Authentication

Include JWT token in Authorization header:
```http
Authorization: Bearer <your-jwt-token>
```

### Health Check Endpoints

Check authentication configuration:
```bash
# Public health check
curl http://localhost:8000/api/health

# Authentication status (requires token)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/status

# Public auth configuration
curl http://localhost:8000/api/auth/config
```

### Protected Endpoints

All API endpoints except health checks require authentication:

| Endpoint | Required Role | Description |
|----------|---------------|-------------|
| `GET /api/captures` | viewer | List user's captures |
| `GET /api/captures/{id}` | viewer | Get specific capture |
| `GET /api/captures/{id}/download` | viewer | Download capture |
| `POST /api/captures/trigger` | operator | Trigger new capture |
| `POST /api/captures/verify` | viewer | Verify capture hash |
| `GET /api/schedules` | viewer | List schedules |
| `POST /api/schedules` | operator | Create schedule |

## Testing Authentication

### Using the Test Script

```bash
# Test a JWT token
python scripts/test_auth.py --token "your-jwt-token"
```

### Manual Testing

1. **Get JWT Token** from Cognito (via AWS CLI, SDK, or hosted UI)
2. **Test API Endpoints**:
   ```bash
   # Test viewer access
   curl -H "Authorization: Bearer <token>" http://localhost:8000/api/captures
   
   # Test operator access
   curl -X POST -H "Authorization: Bearer <token>" \
        "http://localhost:8000/api/captures/trigger?url=https://example.com"
   ```

## Obtaining JWT Tokens

### Via AWS CLI (for testing)

```bash
# Authenticate user and get tokens
aws cognito-idp admin-initiate-auth \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-id your-cognito-client-id \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=userpassword
```

### Via Hosted UI

```bash
# Get authorization code
https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/authorize?response_type=code&client_id=your-client-id&redirect_uri=https://localhost:8000/auth/callback&scope=openid+email+profile

# Exchange code for tokens
curl -X POST https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=your-client-id&code=auth-code&redirect_uri=https://localhost:8000/auth/callback"
```

## Error Handling

The API returns standard HTTP status codes for authentication errors:

- **401 Unauthorized**: Invalid, expired, or missing token
- **403 Forbidden**: Insufficient permissions for the requested resource

Example error responses:
```json
{
  "detail": "Token has expired"
}

{
  "detail": "Role 'admin' required, but user has role 'viewer'"
}
```

## Security Features

1. **JWT Validation**: Tokens verified against Cognito JWKS endpoint
2. **Token Expiration**: Automatic handling of expired tokens
3. **Role-based Access**: Fine-grained permissions based on user roles
4. **JWKS Caching**: Performance optimization with TTL-based caching
5. **Error Isolation**: Authentication errors don't expose sensitive information

## Troubleshooting

### Common Issues

1. **"JWKS URL not configured"**
   - Set `COGNITO_USER_POOL_ID` and `COGNITO_REGION` environment variables

2. **"Token has expired"**
   - Refresh the JWT token using the refresh token from Cognito

3. **"Role 'operator' required"**
   - User needs to be added to appropriate Cognito group

4. **"Unable to find signing key"**
   - Token was signed with different key (wrong user pool or region)

### Debug Mode

Enable debug logging to see detailed authentication flow:
```bash
export LOG_LEVEL=DEBUG
python -m app.main
```

### Verify Cognito Configuration

```bash
# Check user pool details
aws cognito-idp describe-user-pool --user-pool-id us-east-1_XXXXXXXXX

# List user groups
aws cognito-idp list-groups --user-pool-id us-east-1_XXXXXXXXX

# Check user's group membership
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username user@example.com
```

## Production Considerations

1. **Token Storage**: Store tokens securely on client side
2. **Token Refresh**: Implement automatic token refresh
3. **Rate Limiting**: Configure API Gateway rate limiting
4. **Monitoring**: Set up CloudWatch alarms for authentication failures
5. **Backup Keys**: Cognito automatically rotates keys, ensure JWKS cache respects TTL