const net = require('net');

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(4000);
    socket.on('connect', () => {
      console.log(`[CONNECT SUCCESS] ${host}:${port} is reachable.`);
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      console.log(`[TIMEOUT] ${host}:${port} timed out.`);
      socket.destroy();
      resolve(false);
    });
    socket.on('error', (err) => {
      console.log(`[ERROR] ${host}:${port} - ${err.message}`);
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function run() {
  await checkPort('smtp.hostinger.com', 587);
  await checkPort('smtp.hostinger.com', 465);
  await checkPort('smtp.titan.email', 587);
  await checkPort('smtp.titan.email', 465);
}

run();
