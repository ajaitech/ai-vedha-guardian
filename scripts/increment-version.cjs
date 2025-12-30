#!/usr/bin/env node
/**
 * AiVedha Guardian - Version Incrementer
 *
 * Automatically increments API version on every deployment.
 * Updates version in:
 * - src/types/audit.types.ts (API_VERSION)
 * - package.json (version)
 *
 * Usage:
 *   node scripts/increment-version.js [--type major|minor|patch]
 *
 * Default: patch increment (5.0.0 -> 5.0.1)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERSION_TYPE = process.argv.includes('--type')
  ? process.argv[process.argv.indexOf('--type') + 1]
  : 'patch';

const FILES_TO_UPDATE = [
  'src/types/audit.types.ts',
  'package.json'
];

// ============================================================================
// VERSION FUNCTIONS
// ============================================================================

function parseVersion(versionString) {
  const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

function incrementVersion(version, type) {
  switch (type) {
    case 'major':
      return `${version.major + 1}.0.0`;
    case 'minor':
      return `${version.major}.${version.minor + 1}.0`;
    case 'patch':
    default:
      return `${version.major}.${version.minor}.${version.patch + 1}`;
  }
}

function getCurrentVersion() {
  // Read from package.json as source of truth
  const packagePath = path.join(ROOT_DIR, 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageContent.version;
}

function updateFile(filePath, currentVersion, newVersion) {
  const fullPath = path.join(ROOT_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let updated = false;

  if (filePath.endsWith('.json')) {
    // Update package.json
    const json = JSON.parse(content);
    if (json.version) {
      json.version = newVersion;
      content = JSON.stringify(json, null, 2) + '\n';
      updated = true;
    }
  } else if (filePath.endsWith('.ts')) {
    // Update TypeScript files
    const versionRegex = /API_VERSION\s*=\s*['"][\d.]+['"]/;
    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `API_VERSION = '${newVersion}'`);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Updated: ${filePath}`);
    return true;
  }

  console.log(`  ⚠️  No version found in: ${filePath}`);
  return false;
}

function updateBuildTimestamp() {
  const typesPath = path.join(ROOT_DIR, 'src/types/audit.types.ts');

  if (!fs.existsSync(typesPath)) {
    return;
  }

  let content = fs.readFileSync(typesPath, 'utf8');
  const timestamp = new Date().toISOString();

  // Update BUILD_TIMESTAMP placeholder
  content = content.replace(
    /BUILD_TIMESTAMP\s*=\s*['"][^'"]*['"]/,
    `BUILD_TIMESTAMP = '${timestamp}'`
  );

  fs.writeFileSync(typesPath, content);
  console.log(`  ✅ Updated BUILD_TIMESTAMP: ${timestamp}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AiVedha Guardian - Version Incrementer');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const currentVersion = getCurrentVersion();
    const parsedVersion = parseVersion(currentVersion);
    const newVersion = incrementVersion(parsedVersion, VERSION_TYPE);

    console.log(`\n  Current Version: ${currentVersion}`);
    console.log(`  Increment Type:  ${VERSION_TYPE}`);
    console.log(`  New Version:     ${newVersion}`);
    console.log('\n  Updating files...\n');

    let updatedCount = 0;
    FILES_TO_UPDATE.forEach(file => {
      if (updateFile(file, currentVersion, newVersion)) {
        updatedCount++;
      }
    });

    // Update build timestamp
    updateBuildTimestamp();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Updated ${updatedCount} files to version ${newVersion}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Output new version for CI/CD consumption
    if (process.argv.includes('--output')) {
      console.log(`::set-output name=version::${newVersion}`);
    }

    // Write to GitHub env if available
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
