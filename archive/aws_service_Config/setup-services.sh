#!/bin/bash
echo "🚀 Setting up AWS services for AiVedha Guardian..."

# Create S3 bucket
BUCKET_NAME="aivedha-security-reports-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb "s3://$BUCKET_NAME" --region us-east-1

# Create DynamoDB tables
python3 ../aws_dbschema/create-tables.py

echo "✅ AWS setup completed!"
echo "Bucket: $BUCKET_NAME"