#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`\n[E2E_CONTRACT_GUARD] ${message}`);
  process.exit(1);
}

function countLines(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

const repoRoot = path.resolve(__dirname, '..');
const contractsPath = path.resolve(__dirname, 'e2e-spec-contracts.json');

if (!fs.existsSync(contractsPath)) {
  fail(`Missing contracts file: ${contractsPath}`);
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
} catch (error) {
  fail(`Invalid JSON in contracts file: ${error.message}`);
}

const contracts = Array.isArray(parsed.contracts) ? parsed.contracts : [];
if (!contracts.length) {
  fail('No contracts defined.');
}

const violations = [];

for (const contract of contracts) {
  const relFile = contract.file;
  const minLines = Number(contract.minLines || 0);
  const requiredSnippets = Array.isArray(contract.requiredSnippets)
    ? contract.requiredSnippets
    : [];

  if (!relFile) {
    violations.push('Contract entry missing "file" field.');
    continue;
  }

  const absoluteFile = path.resolve(repoRoot, relFile);
  if (!fs.existsSync(absoluteFile)) {
    violations.push(`${relFile}: file is missing.`);
    continue;
  }

  const content = fs.readFileSync(absoluteFile, 'utf8');
  const lines = countLines(content);

  if (lines < minLines) {
    violations.push(
      `${relFile}: line count ${lines} is below minimum ${minLines}.`
    );
  }

  for (const snippet of requiredSnippets) {
    if (!content.includes(snippet)) {
      violations.push(`${relFile}: missing required snippet -> ${snippet}`);
    }
  }
}

if (violations.length) {
  console.error('\n[E2E_CONTRACT_GUARD] Contract violations detected:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('[E2E_CONTRACT_GUARD] OK - critical spec contracts are intact.');
