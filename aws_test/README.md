# AWS Testing and Temporary Files

This folder contains testing utilities, mock data, and temporary files for development and testing.

## Testing Structure

### Unit Tests
- `test-lambda-functions/` - Individual Lambda function tests
- `test-database-operations/` - DynamoDB operation tests
- `test-payment-integration/` - PayPal payment flow tests (USD only)
- `test-security-scanner/` - Security audit engine tests

### Integration Tests
- `test-api-endpoints/` - API Gateway endpoint testing
- `test-user-flows/` - End-to-end user journey tests
- `test-admin-functions/` - Admin dashboard functionality tests

### Mock Data
- `mock-users.json` - Test user accounts
- `mock-audit-data.json` - Sample audit results
- `mock-payment-data.json` - Test payment transactions
- `mock-vulnerabilities.json` - Sample vulnerability data

### Temporary Files
- `temp-reports/` - Temporary PDF reports for testing
- `temp-logs/` - Testing log files
- `temp-uploads/` - Temporary file uploads
- `sandbox-config/` - Sandbox environment configurations

## Usage
1. Run unit tests before deployment
2. Use mock data for development
3. Integration tests for full system validation
4. Cleanup temporary files regularly

## Test Scripts
- `run-all-tests.sh` - Execute complete test suite
- `setup-test-env.sh` - Prepare testing environment
- `cleanup-temp.sh` - Clean temporary files
- `generate-test-data.sh` - Create mock data

## Important Notes
- Never commit sensitive test data
- Clean temporary files after testing
- Use sandbox environment for safe testing
- Mock external service calls in tests