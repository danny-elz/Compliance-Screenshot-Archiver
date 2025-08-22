#!/bin/bash
# LocalStack initialization script for CSA development

echo "🚀 Initializing LocalStack for CSA development..."

# Wait for LocalStack to be ready
while ! curl -s http://localhost:4566/_localstack/health > /dev/null; do
    echo "Waiting for LocalStack..."
    sleep 2
done

echo "✅ LocalStack is ready!"

# Create S3 buckets
echo "📦 Creating S3 buckets..."
awslocal s3 mb s3://csa-artifacts-local
awslocal s3 mb s3://csa-cloudtrail-local

# Enable versioning on artifacts bucket
awslocal s3api put-bucket-versioning \
    --bucket csa-artifacts-local \
    --versioning-configuration Status=Enabled

# Create DynamoDB tables
echo "🗄️  Creating DynamoDB tables..."

# Schedules table
awslocal dynamodb create-table \
    --table-name csa-schedules \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=scheduleId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=scheduleId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Captures table
awslocal dynamodb create-table \
    --table-name csa-captures \
    --attribute-definitions \
        AttributeName=captureId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=timestamp,AttributeType=S \
    --key-schema \
        AttributeName=captureId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=UserCaptures,KeySchema='[{AttributeName=userId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}]',Projection='{ProjectionType=ALL}' \
    --billing-mode PAY_PER_REQUEST

# Create Cognito User Pool
echo "🔐 Creating Cognito User Pool..."
USER_POOL_ID=$(awslocal cognito-idp create-user-pool \
    --pool-name csa-users \
    --policies PasswordPolicy='{MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
    --query 'UserPool.Id' --output text)

# Create User Pool Client
CLIENT_ID=$(awslocal cognito-idp create-user-pool-client \
    --user-pool-id $USER_POOL_ID \
    --client-name csa-client \
    --explicit-auth-flows ADMIN_NO_SRP_AUTH \
    --query 'UserPoolClient.ClientId' --output text)

# Create test admin user
echo "👤 Creating test admin user..."
awslocal cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username admin@test.com \
    --user-attributes Name=email,Value=admin@test.com Name=email_verified,Value=true \
    --temporary-password TempPass123! \
    --message-action SUPPRESS

# Set permanent password
awslocal cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username admin@test.com \
    --password AdminPass123! \
    --permanent

# Create KMS keys
echo "🔑 Creating KMS keys..."
ARTIFACTS_KEY_ID=$(awslocal kms create-key \
    --description "CSA Artifacts Encryption Key" \
    --query 'KeyMetadata.KeyId' --output text)

AUDIT_KEY_ID=$(awslocal kms create-key \
    --description "CSA Audit Logs Encryption Key" \
    --query 'KeyMetadata.KeyId' --output text)

# Create SNS topics for notifications
echo "📢 Creating SNS topics..."
awslocal sns create-topic --name csa-alerts
awslocal sns create-topic --name csa-notifications

# Create SQS queues for job processing
echo "📬 Creating SQS queues..."
awslocal sqs create-queue --queue-name csa-jobs
awslocal sqs create-queue --queue-name csa-jobs-dlq

echo "🎉 LocalStack initialization complete!"
echo ""
echo "📋 Development Environment Details:"
echo "   S3 Buckets: csa-artifacts-local, csa-cloudtrail-local"
echo "   DynamoDB Tables: csa-schedules, csa-captures"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $CLIENT_ID"
echo "   Test User: admin@test.com / AdminPass123!"
echo "   Artifacts Key: $ARTIFACTS_KEY_ID"
echo "   Audit Key: $AUDIT_KEY_ID"
echo ""
echo "🌐 Access LocalStack services at: http://localhost:4566"