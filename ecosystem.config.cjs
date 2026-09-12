// ecosystem.config.cjs
// ============================================================================
// JOY PeopleHR — Production PM2 Process Manager Ecosystem Config
// Manages Web Application Server & Biometric LAN/Cloud Gateway Daemon
// ============================================================================

module.exports = {
  apps: [
    {
      name: 'joy-peoplehr-web',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'joy-biometric-gateway',
      script: './scripts/workforce-gateway-agent.cjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        GATEWAY_PORT: 11108,
        ADMS_PORT: 8080,
        COMM_KEY: 123456,
        TENANT_ID: 'org-joy-01',
      },
    },
  ],
};
