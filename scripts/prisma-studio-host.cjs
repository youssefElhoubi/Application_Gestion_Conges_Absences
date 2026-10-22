/**
 * Preload hook for Prisma Studio in Docker.
 * Prisma CLI 7 hardcodes the server listen address to '127.0.0.1' and lacks a '--hostname' CLI flag.
 * This script intercepts binding to '127.0.0.1' and binds to '0.0.0.0' so Docker port forwarding
 * can reach Prisma Studio on eth0 while preserving the requested port and origin check.
 */
const net = require('net');

const originalListen = net.Server.prototype.listen;

net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'object' && args[0] !== null) {
    if (args[0].host === '127.0.0.1') {
      args[0].host = '0.0.0.0';
    }
  } else if (args[1] === '127.0.0.1') {
    args[1] = '0.0.0.0';
  }
  return originalListen.apply(this, args);
};
