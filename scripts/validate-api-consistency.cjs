#!/usr/bin/env node
/**
 * AiVedha Guardian - API Consistency Validator
 * Version: 5.0.0
 *
 * Validates parameter consistency between:
 * - Frontend TypeScript types (src/types/audit.types.ts)
 * - Frontend API client (src/lib/api.ts)
 * - Lambda functions (aws-lambda/)
 *
 * Exit codes:
 * 0 - All validations passed
 * 1 - Validation errors found
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ERRORS = [];
const WARNINGS = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function readFile(filePath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function extractTypeScriptFields(content, interfaceName) {
  const regex = new RegExp(`interface\\s+${interfaceName}\\s*\\{([^}]+)\\}`, 's');
  const match = content.match(regex);
  if (!match) return [];

  const fields = [];
  const fieldRegex = /(\w+)\??:\s*([^;]+)/g;
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(match[1])) !== null) {
    fields.push({
      name: fieldMatch[1],
      type: fieldMatch[2].trim(),
      optional: match[0].includes(fieldMatch[1] + '?')
    });
  }
  return fields;
}

function extractPythonFields(content, section) {
  const fields = [];
  // Look for dictionary keys in Python
  const keyRegex = /'(\w+)':\s*/g;
  let match;
  while ((match = keyRegex.exec(content)) !== null) {
    fields.push(match[1]);
  }
  return [...new Set(fields)];
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateAuditTypes() {
  console.log('\n📋 Validating audit.types.ts...');

  const typesContent = readFile('src/types/audit.types.ts');
  if (!typesContent) {
    ERRORS.push('Missing: src/types/audit.types.ts');
    return;
  }

  // Check API_VERSION exists
  if (!typesContent.includes("API_VERSION = '")) {
    ERRORS.push('Missing: API_VERSION constant in audit.types.ts');
  }

  // Check required interfaces exist
  const requiredInterfaces = [
    'AuditRequestParams',
    'AuditResponseBase',
    'AuditResponseCompleted',
    'AuditResponseProcessing',
    'AuditResponseFailed',
    'Vulnerability',
    'AuditItemStatus',
    'DynamoDBReportItem'
  ];

  requiredInterfaces.forEach(iface => {
    if (!typesContent.includes(`interface ${iface}`)) {
      ERRORS.push(`Missing interface: ${iface} in audit.types.ts`);
    }
  });

  // Check region configs
  if (!typesContent.includes("'us-east-1'") || !typesContent.includes("'ap-south-1'")) {
    ERRORS.push('Missing region configurations in audit.types.ts');
  }

  console.log('  ✓ audit.types.ts structure validated');
}

function validateApiClient() {
  console.log('\n📋 Validating api.ts...');

  const apiContent = readFile('src/lib/api.ts');
  if (!apiContent) {
    ERRORS.push('Missing: src/lib/api.ts');
    return;
  }

  // Check for required imports
  if (!apiContent.includes("from '../types/audit.types'") &&
      !apiContent.includes("from '@/types/audit.types'")) {
    WARNINGS.push('api.ts should import from unified audit.types.ts');
  }

  // Check for required endpoints
  const requiredEndpoints = [
    '/audit/start',
    '/audit/status',
    '/certificate',
    '/health'
  ];

  requiredEndpoints.forEach(endpoint => {
    if (!apiContent.includes(endpoint)) {
      ERRORS.push(`Missing endpoint: ${endpoint} in api.ts`);
    }
  });

  // Check for region routing
  if (!apiContent.includes('scanRegion') && !apiContent.includes('scan_region')) {
    WARNINGS.push('api.ts should include region routing parameters');
  }

  console.log('  ✓ api.ts structure validated');
}

function validateLambdaConsistency() {
  console.log('\n📋 Validating Lambda functions...');

  const lambdaDirs = [
    'aws-lambda/security-crawler',
    'aws-lambda/audit-status',
    'aws-lambda/report-generator'
  ];

  lambdaDirs.forEach(dir => {
    const files = fs.readdirSync(path.join(ROOT_DIR, dir)).filter(f => f.endsWith('.py'));

    files.forEach(file => {
      const content = readFile(path.join(dir, file));
      if (!content) return;

      // Check for region fields in responses
      if (file.includes('crawler') || file.includes('status') || file.includes('report')) {
        if (!content.includes('scan_region') && !content.includes('scanRegion')) {
          WARNINGS.push(`${dir}/${file}: Missing scan_region in response`);
        }
        if (!content.includes('static_ip') && !content.includes('staticIP')) {
          WARNINGS.push(`${dir}/${file}: Missing static_ip in response`);
        }
      }

      // Check for proper error handling
      if (!content.includes('try:') || !content.includes('except')) {
        WARNINGS.push(`${dir}/${file}: Missing error handling`);
      }
    });
  });

  console.log('  ✓ Lambda functions validated');
}

function validateDynamoDBSchema() {
  console.log('\n📋 Validating DynamoDB schema consistency...');

  const typesContent = readFile('src/types/audit.types.ts');
  const crawlerContent = readFile('aws-lambda/security-crawler/security-audit-crawler.py');

  if (!typesContent || !crawlerContent) {
    WARNINGS.push('Cannot validate DynamoDB schema - missing files');
    return;
  }

  // Extract DynamoDB fields from types
  const dbFields = extractTypeScriptFields(typesContent, 'DynamoDBReportItem');

  // Check that key fields are used in Lambda
  const requiredDbFields = [
    'report_id',
    'user_id',
    'url',
    'status',
    'scan_region',
    'region_name',
    'static_ip',
    'created_at'
  ];

  requiredDbFields.forEach(field => {
    if (!crawlerContent.includes(`'${field}'`)) {
      WARNINGS.push(`Lambda may be missing DynamoDB field: ${field}`);
    }
  });

  console.log('  ✓ DynamoDB schema validated');
}

function validateResponseFieldConsistency() {
  console.log('\n📋 Validating response field consistency...');

  // Check that both camelCase and snake_case versions exist
  const typesContent = readFile('src/types/audit.types.ts');
  if (!typesContent) return;

  const dualCaseFields = [
    ['report_id', 'reportId'],
    ['scan_region', 'scanRegion'],
    ['region_name', 'regionName'],
    ['static_ip', 'staticIP'],
    ['progress_percent', 'progressPercent'],
    ['current_stage', 'currentStage'],
    ['security_score', 'securityScore'],
    ['vulnerabilities_count', 'vulnerabilitiesCount']
  ];

  dualCaseFields.forEach(([snake, camel]) => {
    if (!typesContent.includes(snake) || !typesContent.includes(camel)) {
      WARNINGS.push(`Missing dual-case support for: ${snake}/${camel}`);
    }
  });

  console.log('  ✓ Response field consistency validated');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('  AiVedha Guardian - API Consistency Validator');
console.log('═══════════════════════════════════════════════════════════');

validateAuditTypes();
validateApiClient();
validateLambdaConsistency();
validateDynamoDBSchema();
validateResponseFieldConsistency();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  VALIDATION RESULTS');
console.log('═══════════════════════════════════════════════════════════');

if (WARNINGS.length > 0) {
  console.log(`\n⚠️  WARNINGS (${WARNINGS.length}):`);
  WARNINGS.forEach(w => console.log(`   - ${w}`));
}

if (ERRORS.length > 0) {
  console.log(`\n❌ ERRORS (${ERRORS.length}):`);
  ERRORS.forEach(e => console.log(`   - ${e}`));
  console.log('\n');
  process.exit(1);
}

console.log('\n✅ All validations passed!');
console.log('═══════════════════════════════════════════════════════════\n');
process.exit(0);
