#!/usr/bin/env node

/**
 * Local Test Runner for Fundability Snapshot Engine
 * 
 * This script tests the scoring engine logic without requiring deployment.
 * Run with: node test-runner.js
 */

const { calculateFundabilitySnapshot } = require('../dist/lib/scoring-engine');
const testCases = require('./test-cases.json');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function runTests() {
  log(colors.cyan, '\n🧪 Fundability Snapshot Engine - Test Runner\n');
  log(colors.cyan, '═'.repeat(60));
  
  let passed = 0;
  let failed = 0;
  const failures = [];

  // Test each case
  testCases.test_cases.forEach((testCase, index) => {
    try {
      log(colors.blue, `\n📋 Test ${index + 1}: ${testCase.name}`);
      log(colors.reset, `   ${testCase.description}`);
      
      const result = calculateFundabilitySnapshot(testCase.input);
      
      // Validate result structure
      const requiredFields = [
        'fundability_score',
        'fundability_tier_numeric',
        'fundability_tier_label',
        'subscores',
        'key_strengths',
        'key_risks',
        'high_impact_actions',
        'funding_range_now',
        'funding_range_after_optimization',
        'goal_path',
        'flags',
        'meta'
      ];
      
      const missingFields = requiredFields.filter(field => !(field in result));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing fields: ${missingFields.join(', ')}`);
      }

      // Validate score range
      if (result.fundability_score < 0 || result.fundability_score > 100) {
        throw new Error(`Score out of range: ${result.fundability_score}`);
      }

      // Validate tier
      if (result.fundability_tier_numeric < 1 || result.fundability_tier_numeric > 4) {
        throw new Error(`Invalid tier: ${result.fundability_tier_numeric}`);
      }

      // Check expected values if provided
      if (testCase.expected) {
        if (testCase.expected.tier && result.fundability_tier_numeric !== testCase.expected.tier) {
          log(colors.yellow, `   ⚠️  Expected tier ${testCase.expected.tier}, got ${result.fundability_tier_numeric}`);
        }
        
        if (testCase.expected.score_range) {
          const [min, max] = testCase.expected.score_range.split('-').map(s => parseInt(s));
          if (result.fundability_score < min || result.fundability_score > max) {
            log(colors.yellow, `   ⚠️  Score ${result.fundability_score} outside expected range ${testCase.expected.score_range}`);
          }
        }
      }

      log(colors.green, `   ✅ PASS`);
      log(colors.reset, `      Score: ${result.fundability_score} | Tier: ${result.fundability_tier_numeric} (${result.fundability_tier_label})`);
      log(colors.reset, `      Funding Now: ${result.funding_range_now}`);
      log(colors.reset, `      Actions: ${result.high_impact_actions.length} recommendations`);
      
      passed++;
    } catch (error) {
      log(colors.red, `   ❌ FAIL: ${error.message}`);
      failed++;
      failures.push({ testCase: testCase.name, error: error.message });
    }
  });

  // Test edge cases
  log(colors.cyan, '\n\n📊 Testing Edge Cases...\n');
  
  testCases.edge_cases.forEach((testCase, index) => {
    try {
      log(colors.blue, `Edge Case ${index + 1}: ${testCase.name}`);
      const result = calculateFundabilitySnapshot(testCase.input);
      log(colors.green, `   ✅ PASS - Score: ${result.fundability_score}`);
      passed++;
    } catch (error) {
      log(colors.red, `   ❌ FAIL: ${error.message}`);
      failed++;
      failures.push({ testCase: testCase.name, error: error.message });
    }
  });

  // Summary
  log(colors.cyan, '\n' + '═'.repeat(60));
  log(colors.cyan, '\n📊 Test Summary\n');
  log(colors.green, `✅ Passed: ${passed}`);
  if (failed > 0) {
    log(colors.red, `❌ Failed: ${failed}`);
    log(colors.reset, '\nFailures:');
    failures.forEach(f => {
      log(colors.red, `  • ${f.testCase}: ${f.error}`);
    });
  }
  
  const total = passed + failed;
  const successRate = ((passed / total) * 100).toFixed(1);
  log(colors.cyan, `\n📈 Success Rate: ${successRate}%\n`);

  // Detailed output for first test case
  log(colors.cyan, '═'.repeat(60));
  log(colors.cyan, '\n📝 Sample Output (First Test Case)\n');
  
  const sampleInput = testCases.test_cases[0].input;
  const sampleOutput = calculateFundabilitySnapshot(sampleInput);
  
  console.log(JSON.stringify(sampleOutput, null, 2));

  return failed === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);
