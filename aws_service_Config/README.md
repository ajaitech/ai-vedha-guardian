# AWS Service Configuration

This folder contains scripts and configurations for AWS service setup and management.

## Structure
- `setup-services.sh` - Initial AWS services setup
- `lambda-config.json` - Lambda function configurations
- `dynamodb-tables.json` - DynamoDB table definitions
- `cognito-config.json` - AWS Cognito user pool configuration
- `s3-bucket-config.json` - S3 bucket policies and configurations
- `api-gateway-config.json` - API Gateway setup
- `cloudwatch-config.json` - CloudWatch logging and monitoring

## Prerequisites
- AWS CLI configured with appropriate permissions
- AWS account with required service quotas
- Environment variables set in .env file

## Usage
1. Run `setup-services.sh` to initialize all AWS services
2. Update configuration files as needed
3. Deploy using deployment scripts

## Important Notes
- All configurations support production environment
- Security policies follow AWS best practices
- Services are configured for global access
- Backup and monitoring enabled by default