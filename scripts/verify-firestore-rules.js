#!/usr/bin/env node

/**
 * Firestore Rules Verification Script
 *
 * This script verifies that production Firestore rules do NOT contain
 * dangerous open-access patterns that could expose the database.
 *
 * Run before deployment: npm run verify:rules
 * Or add to CI/CD pipeline for automated checks.
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Dangerous patterns to check for
const dangerousPatterns = [
  {
    pattern: /allow\s+read\s*,\s*write\s*:\s*if\s+true/gi,
    description: 'Open read/write access (allow read, write: if true)',
    severity: 'CRITICAL',
  },
  {
    pattern: /allow\s+read\s*:\s*if\s+true.*allow\s+write\s*:\s*if\s+true/gis,
    description: 'Separate open read and write rules',
    severity: 'CRITICAL',
  },
  {
    pattern: /match\s+\/\{document=\*\*\}\s*\{[^}]*allow\s+read\s*,\s*write\s*:\s*if\s+true/gis,
    description: 'Wildcard match with open access',
    severity: 'CRITICAL',
  },
];

// Files to check
const rulesToCheck = [
  {
    file: 'backend/firestore.rules',
    name: 'Production Rules',
    mustBeSecure: true,
  },
  {
    file: 'backend/firestore.emulator.rules',
    name: 'Emulator Rules',
    mustBeSecure: false,
  },
];

console.log(`${colors.blue}🔍 Firestore Rules Verification${colors.reset}\n`);

let hasErrors = false;
let hasWarnings = false;

// Check each rules file
for (const ruleFile of rulesToCheck) {
  const filePath = path.join(__dirname, '..', ruleFile.file);

  console.log(`${colors.blue}Checking: ${ruleFile.name}${colors.reset}`);
  console.log(`File: ${ruleFile.file}\n`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}❌ ERROR: File not found${colors.reset}\n`);
    hasErrors = true;
    continue;
  }

  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for dangerous patterns
  let foundIssues = false;

  for (const check of dangerousPatterns) {
    const matches = content.match(check.pattern);

    if (matches) {
      foundIssues = true;

      if (ruleFile.mustBeSecure) {
        // Production rules MUST NOT have dangerous patterns
        console.log(`${colors.red}❌ ${check.severity}: ${check.description}${colors.reset}`);
        console.log(`   Found ${matches.length} occurrence(s)\n`);
        hasErrors = true;
      } else {
        // Emulator rules are allowed to have open access (just a warning)
        console.log(`${colors.yellow}⚠️  INFO: ${check.description}${colors.reset}`);
        console.log(`   This is expected for emulator rules\n`);
      }
    }
  }

  if (!foundIssues && ruleFile.mustBeSecure) {
    console.log(`${colors.green}✅ No dangerous patterns found${colors.reset}\n`);
  } else if (!foundIssues && !ruleFile.mustBeSecure) {
    console.log(`${colors.yellow}⚠️  WARNING: Emulator rules appear to be strict${colors.reset}`);
    console.log(`   Consider adding open access for easier testing\n`);
    hasWarnings = true;
  }
}

// Check firebase.json configuration
console.log(`${colors.blue}Checking: Firebase Configuration${colors.reset}`);
console.log(`File: backend/firebase.json\n`);

const firebaseJsonPath = path.join(__dirname, '..', 'backend', 'firebase.json');

if (fs.existsSync(firebaseJsonPath)) {
  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));

  // Check production rules configuration
  if (firebaseJson.firestore?.rules === 'firestore.rules') {
    console.log(`${colors.green}✅ Production rules: firestore.rules${colors.reset}`);
  } else {
    console.log(
      `${colors.red}❌ ERROR: Production rules not set to firestore.rules${colors.reset}`,
    );
    console.log(`   Current: ${firebaseJson.firestore?.rules || 'NOT SET'}${colors.reset}`);
    hasErrors = true;
  }

  // Check emulator rules configuration
  if (firebaseJson.emulators?.firestore?.rules === 'firestore.emulator.rules') {
    console.log(`${colors.green}✅ Emulator rules: firestore.emulator.rules${colors.reset}`);
  } else if (!firebaseJson.emulators?.firestore?.rules) {
    console.log(`${colors.yellow}⚠️  INFO: Emulator rules not explicitly set${colors.reset}`);
    console.log(`   Emulator will use production rules (firestore.rules)${colors.reset}`);
    console.log(`   This is SAFE but may cause auth issues during testing${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ERROR: Emulator rules set to wrong file${colors.reset}`);
    console.log(`   Current: ${firebaseJson.emulators.firestore.rules}${colors.reset}`);
    console.log(`   Expected: firestore.emulator.rules${colors.reset}`);
    hasErrors = true;
  }

  // Verify production rules are NOT in emulator config
  if (firebaseJson.emulators?.firestore?.rules === 'firestore.rules') {
    console.log(`${colors.red}❌ ERROR: Emulator using production rules${colors.reset}`);
    console.log(`   This will cause authentication issues during testing${colors.reset}`);
    hasWarnings = true;
  }

  console.log();
} else {
  console.log(`${colors.red}❌ ERROR: firebase.json not found${colors.reset}\n`);
  hasErrors = true;
}

// Final summary
console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);

if (hasErrors) {
  console.log(`${colors.red}❌ VERIFICATION FAILED${colors.reset}`);
  console.log(`${colors.red}Production rules contain dangerous patterns!${colors.reset}`);
  console.log(`${colors.red}DO NOT DEPLOY until issues are fixed.${colors.reset}\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}⚠️  VERIFICATION PASSED WITH WARNINGS${colors.reset}`);
  console.log(`${colors.yellow}Review warnings above before deploying.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.green}✅ VERIFICATION PASSED${colors.reset}`);
  console.log(`${colors.green}Production rules are secure!${colors.reset}\n`);
  process.exit(0);
}
