#!/usr/bin/env node
/**
 * AiVedha Guardian - Endpoint Validator
 * Version: 5.0.0
 *
 * Validates API endpoints return expected status codes.
 * Checks for 404s and other errors.
 *
 * Usage:
 *   node scripts/validate-endpoints.js [--env production|staging]
 *
 * Exit codes:
 * 0 - All endpoints healthy
 * 1 - One or more endpoints failed
 */

const https = require('https');
const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENV = process.argv.includes('--env')
  ? process.argv[process.argv.indexOf('--env') + 1]
  : 'production';

const API_BASE_URLS = {
  production: {
    us: 'https://api.aivedha.ai/api',
    india: 'https://api-india.aivedha.ai/api'
  },
  staging: {
    us: 'https://api-staging.aivedha.ai/api',
    india: null
  }
};

const WEBSITE_URLS = {
  production: 'https://aivedha.ai',
  staging: 'https://staging.aivedha.ai'
};

const API_BASE_US = API_BASE_URLS[ENV]?.us || API_BASE_URLS.production.us;
const API_BASE_INDIA = API_BASE_URLS[ENV]?.india || null;
const WEBSITE_BASE = WEBSITE_URLS[ENV] || WEBSITE_URLS.production;

// ============================================================================
// ENDPOINTS TO VALIDATE
// ============================================================================

const API_ENDPOINTS = [
  { path: '/health', method: 'GET', expectedStatus: 200, critical: true },
  { path: '/audit/status/test-report-id', method: 'GET', expectedStatus: [200, 404], critical: false },
  { path: '/certificate/verify/test', method: 'GET', expectedStatus: [200, 403, 404], critical: false },
  { path: '/credits/balance?userId=test', method: 'GET', expectedStatus: [200, 401, 403], critical: false }
];

// India API endpoints (only health check for now)
const INDIA_API_ENDPOINTS = [
  { path: '/health', method: 'GET', expectedStatus: [200, 403], critical: false, description: 'India API Health (may not be deployed)' }
];

const WEBSITE_PAGES = [
  { path: '/', expectedStatus: 200, critical: true },
  { path: '/login', expectedStatus: 200, critical: true },
  { path: '/signup', expectedStatus: 200, critical: true },
  { path: '/pricing', expectedStatus: 200, critical: true },
  { path: '/dashboard', expectedStatus: 200, critical: true },
  { path: '/audit', expectedStatus: 200, critical: true },
  { path: '/faq', expectedStatus: 200, critical: false },
  { path: '/terms', expectedStatus: 200, critical: false },
  { path: '/certificate/TEST-12345', expectedStatus: 200, critical: false },
  { path: '/non-existent-page-test-404', expectedStatus: 200, critical: false } // SPA should return 200
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function makeRequest(url, method = 'GET', timeout = 10000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      timeout: timeout,
      headers: {
        'User-Agent': 'AiVedha-Endpoint-Validator/5.0.0',
        'Accept': 'application/json'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: url
        });
      });
    });

    req.on('error', (err) => {
      reject({ error: err.message, url: url });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ error: 'Request timeout', url: url });
    });

    req.end();
  });
}

async function validateEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const method = endpoint.method || 'GET';

  try {
    const response = await makeRequest(url, method);
    const expectedStatuses = Array.isArray(endpoint.expectedStatus)
      ? endpoint.expectedStatus
      : [endpoint.expectedStatus];

    const passed = expectedStatuses.includes(response.statusCode);

    return {
      url,
      method,
      statusCode: response.statusCode,
      expected: expectedStatuses,
      passed,
      critical: endpoint.critical,
      error: null
    };
  } catch (err) {
    return {
      url,
      method,
      statusCode: null,
      expected: endpoint.expectedStatus,
      passed: false,
      critical: endpoint.critical,
      error: err.error || err.message
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AiVedha Guardian - Endpoint Validator');
  console.log(`  Environment: ${ENV}`);
  console.log('═══════════════════════════════════════════════════════════');

  const results = {
    apiUS: [],
    apiIndia: [],
    website: [],
    passed: 0,
    failed: 0,
    criticalFailed: 0
  };

  // Validate US API endpoints
  console.log(`\n📡 Validating US API Endpoints (${API_BASE_US})...\n`);

  for (const endpoint of API_ENDPOINTS) {
    const result = await validateEndpoint(API_BASE_US, endpoint);
    results.apiUS.push(result);

    if (result.passed) {
      results.passed++;
      console.log(`  ✅ ${result.method} ${endpoint.path} → ${result.statusCode}`);
    } else {
      results.failed++;
      if (result.critical) results.criticalFailed++;
      const error = result.error || `Got ${result.statusCode}, expected ${result.expected}`;
      console.log(`  ❌ ${result.method} ${endpoint.path} → ${error}${result.critical ? ' [CRITICAL]' : ''}`);
    }
  }

  // Validate India API endpoints (if available)
  if (API_BASE_INDIA) {
    console.log(`\n🇮🇳 Validating India API Endpoints (${API_BASE_INDIA})...\n`);

    for (const endpoint of INDIA_API_ENDPOINTS) {
      const result = await validateEndpoint(API_BASE_INDIA, endpoint);
      results.apiIndia.push(result);

      if (result.passed) {
        results.passed++;
        console.log(`  ✅ ${result.method} ${endpoint.path} → ${result.statusCode} ${endpoint.description ? `(${endpoint.description})` : ''}`);
      } else {
        results.failed++;
        if (result.critical) results.criticalFailed++;
        const error = result.error || `Got ${result.statusCode}, expected ${result.expected}`;
        console.log(`  ⚠️  ${result.method} ${endpoint.path} → ${error} (India region - expected until deployed)`);
      }
    }
  } else {
    console.log(`\n🇮🇳 India API: Not configured for ${ENV} environment\n`);
  }

  // Validate website pages
  console.log(`\n🌐 Validating Website Pages (${WEBSITE_BASE})...\n`);

  for (const page of WEBSITE_PAGES) {
    const result = await validateEndpoint(WEBSITE_BASE, { ...page, method: 'GET' });
    results.website.push(result);

    if (result.passed) {
      results.passed++;
      console.log(`  ✅ GET ${page.path} → ${result.statusCode}`);
    } else {
      results.failed++;
      if (result.critical) results.criticalFailed++;
      const error = result.error || `Got ${result.statusCode}, expected ${result.expected}`;
      console.log(`  ❌ GET ${page.path} → ${error}${result.critical ? ' [CRITICAL]' : ''}`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total:    ${results.passed + results.failed}`);
  console.log(`  Passed:   ${results.passed}`);
  console.log(`  Failed:   ${results.failed}`);
  console.log(`  Critical: ${results.criticalFailed}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Output JSON for CI/CD consumption
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  }

  // Exit with error if critical endpoints failed
  if (results.criticalFailed > 0) {
    console.log('❌ Critical endpoint failures detected!');
    process.exit(1);
  }

  if (results.failed > 0) {
    console.log('⚠️  Some non-critical endpoints failed');
    process.exit(0); // Don't fail CI for non-critical
  }

  console.log('✅ All endpoint validations passed!');
  process.exit(0);
}

main().catch(err => {
  console.error('Validation script error:', err);
  process.exit(1);
});
