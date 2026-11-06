import { spawn } from 'child_process';
import path from 'path';

const domain = 'app.joypeoplehr.com';
const archivePath = path.resolve(process.cwd(), 'deploy_package.tar.gz');

console.log(`Starting automated deployment to Hostinger for ${domain}...`);
console.log(`Archive: ${archivePath}`);

const child = spawn('npx.cmd', ['--package=@hostinger/mcp@latest', 'hostinger-hosting-mcp'], {
  env: { ...process.env, DEBUG: 'true' },
  shell: true
});

let resolveDeployment;
const deploymentPromise = new Promise((res) => { resolveDeployment = res; });

let pollTimer = null;
let currentLine = 0;

function pollDeployment() {
  const pollReq = JSON.stringify({
    jsonrpc: '2.0',
    id: 20,
    method: 'tools/call',
    params: {
      name: 'execute',
      arguments: {
        operation: 'hosting_get-deployment',
        params: {
          domain,
          fromLine: currentLine
        }
      }
    }
  }) + '\n';
  child.stdin.write(pollReq);
}

child.stdout.on('data', (data) => {
  const str = data.toString();
  try {
    const lines = str.split('\n').filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith('{')) continue;
      const parsed = JSON.parse(line);
      if (parsed.id === 1) {
        console.log('MCP Handshake confirmed. Triggering deploy...');
        const deployReq = JSON.stringify({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'execute',
            arguments: {
              operation: 'hosting_deploy',
              params: {
                domain,
                path: archivePath,
                type: 'nodejs',
                nodeVersion: 22
              }
            }
          }
        }) + '\n';
        child.stdin.write(deployReq);
      } else if (parsed.id === 10) {
        console.log('Deployment Triggered:', JSON.stringify(parsed.result, null, 2));
        // Check if there is buildUuid or immediate completion
        const contentText = parsed.result?.content?.[0]?.text;
        let resultObj = null;
        try {
          resultObj = JSON.parse(contentText);
        } catch (_) {}

        if (resultObj?.buildUuid || resultObj?.build_uuid || contentText?.includes('buildUuid')) {
          console.log('Node.js build queued on server. Polling deployment progress...');
          pollTimer = setInterval(pollDeployment, 10000);
        } else {
          resolveDeployment(parsed.result);
        }
      } else if (parsed.id === 20) {
        const contentText = parsed.result?.content?.[0]?.text;
        try {
          const deployState = JSON.parse(contentText);
          const state = deployState?.build?.state || deployState?.state || deployState?.status;
          console.log(`[Hostinger Build State] ${state || 'running'}`);
          if (deployState?.build?.lines) {
            currentLine = deployState.build.lines;
          }
          if (deployState?.build?.log_slice) {
            console.log(deployState.build.log_slice);
          }
          if (state === 'completed' || state === 'success') {
            console.log('Deployment finished successfully!');
            clearInterval(pollTimer);
            resolveDeployment(deployState);
          } else if (state === 'failed' || state === 'error') {
            console.error('Deployment failed:', JSON.stringify(deployState, null, 2));
            clearInterval(pollTimer);
            resolveDeployment(deployState);
          }
        } catch (e) {
          console.log('[Deploy Status Output]', contentText);
        }
      }
    }
  } catch (e) {
    console.log('[STDOUT raw]', str);
  }
});

child.stderr.on('data', (d) => {
  const msg = d.toString().trim();
  if (msg) {
    console.log('[Hostinger Engine]', msg);
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
console.log('Deployment process finished.');
