import { spawn } from 'child_process';
import path from 'path';

const domain = 'app.joypeoplehr.com';
const archivePath = path.resolve(process.cwd(), 'deploy_package.tar.gz');

console.log(`Starting automated deployment to Hostinger for ${domain}...`);
console.log(`Archive: ${archivePath}`);

const child = spawn('npx.cmd', ['--package=hostinger-api-mcp@latest', 'hostinger-hosting-mcp'], {
  env: { ...process.env, DEBUG: 'true' },
  shell: true
});

let resolveDeployment;
const deploymentPromise = new Promise((res) => { resolveDeployment = res; });

child.stdout.on('data', (data) => {
  const str = data.toString();
  try {
    const lines = str.split('\n').filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith('{')) continue;
      const parsed = JSON.parse(line);
      if (parsed.id === 1) {
        console.log('MCP Handshake confirmed. Triggering deploy-js-application...');
        const deployReq = JSON.stringify({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'execute',
            arguments: {
              operation: 'hosting_deploy-js-application',
              params: {
                domain,
                archivePath,
                nodeVersion: 22,
                removeArchive: false
              }
            }
          }
        }) + '\n';
        child.stdin.write(deployReq);
      } else if (parsed.id === 10) {
        console.log('Deployment Result:', JSON.stringify(parsed.result, null, 2));
        resolveDeployment(parsed.result);
      }
    }
  } catch (e) {
    console.log('[STDOUT raw]', str);
  }
});

child.stderr.on('data', (d) => {
  const msg = d.toString();
  if (msg.includes('[INFO]') || msg.includes('Executing') || msg.includes('Upload') || msg.includes('Build') || msg.includes('error') || msg.includes('Error')) {
    console.log('[Hostinger Engine]', msg.trim());
  }
});

// Handshake
const initReq = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'deployer', version: '1.0' }
  }
}) + '\n';

child.stdin.write(initReq);

// Wait for deploy response
const result = await deploymentPromise;

child.kill();
console.log('Deployment triggered successfully. Process finished.');
