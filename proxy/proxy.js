import { createServer, createConnection } from 'net';
import Parser from 'redis-parser';

// Configuration
const PROXY_PORT = process.env.PROXY_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Create TCP server (proxy)
const server = createServer((clientSocket) => {
  console.log(`[${new Date().toISOString()}] Client connected from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

  // Create RESP parser for incoming commands
  const parser = new Parser({
    returnReply: (reply) => {
      if (Array.isArray(reply) && reply.length > 0) {
        const command = reply[0].toString().toUpperCase();
        const args = reply.slice(1).map(arg => {
          const str = arg.toString();
          // Masque les mots de passe dans les logs
          if (command === 'AUTH' && reply.indexOf(arg) === 1) {
            return '***';
          }
          return str.length > 50 ? str.substring(0, 50) + '...' : str;
        });
        
        console.log(`[${new Date().toISOString()}] Command: ${command} ${args.join(' ')}`);
      }
    },
    returnError: (err) => {
      console.error(`[${new Date().toISOString()}] Parser error:`, err);
    }
  });

  // Connect to Redis server
  const redisSocket = createConnection({
    host: REDIS_HOST,
    port: REDIS_PORT
  }, () => {
    console.log(`[${new Date().toISOString()}] Connected to Valkey at ${REDIS_HOST}:${REDIS_PORT}`);
  });

  // Passthrough: Client -> Redis (including AUTH commands)
  clientSocket.on('data', (data) => {
    try {
      // Parse les commandes pour logging
      parser.execute(data);
    } finally {
      // Forward les données sans modification
      redisSocket.write(data);
    }
  });

  // Passthrough: Redis -> Client
  redisSocket.on('data', (data) => {
    clientSocket.write(data);
  });

  // Handle client disconnection
  clientSocket.on('end', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected`);
    redisSocket.end();
  });

  clientSocket.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Client error:`, err.message);
    redisSocket.end();
  });

  // Handle Redis disconnection
  redisSocket.on('end', () => {
    console.log(`[${new Date().toISOString()}] Redis connection closed`);
    clientSocket.end();
  });

  redisSocket.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Redis error:`, err.message);
    clientSocket.end();
  });
});

// Start server
server.listen(PROXY_PORT, () => {
  console.log(`Valkey reverse proxy listening on port ${PROXY_PORT}`);
  console.log(`Forwarding to Valkey at ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`Authentication is forwarded from client to server`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down proxy...');
  server.close(() => {
    console.log('Proxy closed');
    process.exit(0);
  });
});
