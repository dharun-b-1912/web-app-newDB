const fs = require('fs');
const src = fs.readFileSync('src/services/attendance/biometricGatewayService.ts', 'utf8');
const lines = src.split('\n');
lines.forEach((l, i) => {
  if (l.includes('getConnectorTelemetry') || l.includes('detectIpChanges')) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
