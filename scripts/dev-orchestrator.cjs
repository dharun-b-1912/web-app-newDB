#!/usr/bin/env node
// scripts/dev-orchestrator.cjs
// ============================================================================
// WorkForceOS / Joy PeopleHR — Unified Dev Orchestrator
// Spawns Vite Dev Server (port 3000) + Biometric Gateway Daemon (port 11108 & 8080)
// ============================================================================

const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[32m%s\x1b[0m', ' 🚀 JOY PeopleHR — Unified Development Environment');
console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log(' Starting Vite Web App on http://localhost:3000');
console.log(' Starting Biometric Gateway on http://localhost:11108 & ADMS port 8080');
console.log(' Press Ctrl+C to terminate both processes.\n');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const nodeCmd = process.execPath;

// 1. Spawn Biometric Gateway Agent
const gatewayProcess = spawn(
  nodeCmd,
  [path.join(__dirname, 'workforce-gateway-agent.cjs')],
  { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }
);

// 2. Spawn Vite Dev Server
const viteProcess = spawn(
  npxCmd,
  ['vite', '--port=3000', '--host=0.0.0.0'],
  { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }
);

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', ' Shutting down JOY PeopleHR Dev Environment...');
  try {
    if (!gatewayProcess.killed) gatewayProcess.kill('SIGINT');
    if (!viteProcess.killed) viteProcess.kill('SIGINT');
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
