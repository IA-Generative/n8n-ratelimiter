import { createClient } from 'redis';

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379; // Connect to proxy by default
const OPERATIONS_PER_MINUTE = parseInt(process.env.OPS_PER_MINUTE) || 10;
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS) || 60;

// Random data generators
const randomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const randomInt = (min = 0, max = 1000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomKey = () => {
  const prefixes = ['user', 'session', 'cache', 'data', 'config', 'temp'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}:${randomString(8)}`;
};

// Redis operations
const operations = [
  // String operations
  async (client) => {
    const key = randomKey();
    const value = randomString(20);
    await client.set(key, value);
    return `SET ${key} ${value}`;
  },
  async (client) => {
    const key = randomKey();
    await client.get(key);
    return `GET ${key}`;
  },
  async (client) => {
    const key = randomKey();
    await client.del(key);
    return `DEL ${key}`;
  },
  
  // Hash operations
  async (client) => {
    const key = randomKey();
    const field = randomString(5);
    const value = randomString(15);
    await client.hSet(key, field, value);
    return `HSET ${key} ${field} ${value}`;
  },
  async (client) => {
    const key = randomKey();
    const field = randomString(5);
    await client.hGet(key, field);
    return `HGET ${key} ${field}`;
  },
  async (client) => {
    const key = randomKey();
    await client.hGetAll(key);
    return `HGETALL ${key}`;
  },
  
  // List operations
  async (client) => {
    const key = randomKey();
    const value = randomString(15);
    await client.lPush(key, value);
    return `LPUSH ${key} ${value}`;
  },
  async (client) => {
    const key = randomKey();
    await client.lRange(key, 0, -1);
    return `LRANGE ${key} 0 -1`;
  },
  
  // Set operations
  async (client) => {
    const key = randomKey();
    const member = randomString(10);
    await client.sAdd(key, member);
    return `SADD ${key} ${member}`;
  },
  async (client) => {
    const key = randomKey();
    await client.sMembers(key);
    return `SMEMBERS ${key}`;
  },
  
  // Sorted set operations
  async (client) => {
    const key = randomKey();
    const score = randomInt(1, 100);
    const member = randomString(10);
    await client.zAdd(key, { score, value: member });
    return `ZADD ${key} ${score} ${member}`;
  },
  async (client) => {
    const key = randomKey();
    await client.zRange(key, 0, -1);
    return `ZRANGE ${key} 0 -1`;
  },
  
  // Expiration
  async (client) => {
    const key = randomKey();
    const ttl = randomInt(10, 300);
    await client.expire(key, ttl);
    return `EXPIRE ${key} ${ttl}`;
  },
  
  // Increment/Decrement
  async (client) => {
    const key = randomKey();
    await client.incr(key);
    return `INCR ${key}`;
  },
  async (client) => {
    const key = randomKey();
    const amount = randomInt(1, 10);
    await client.incrBy(key, amount);
    return `INCRBY ${key} ${amount}`;
  },
];

// Statistics
let stats = {
  total: 0,
  success: 0,
  errors: 0,
  startTime: Date.now(),
};

// Execute random operation
async function executeRandomOperation(client) {
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  try {
    const description = await operation(client);
    stats.success++;
    stats.total++;
    
    if (stats.total % 100 === 0) {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.total / elapsed;
      console.log(`[${new Date().toISOString()}] Operations: ${stats.total} | Success: ${stats.success} | Errors: ${stats.errors} | Rate: ${rate.toFixed(2)} ops/s`);
    }
    
    return description;
  } catch (error) {
    stats.errors++;
    stats.total++;
    console.error(`Error: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log('=== Redis Load Tester ===');
  console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`Target rate: ${OPERATIONS_PER_MINUTE} ops/min`);
  console.log(`Duration: ${DURATION_SECONDS} seconds`);
  console.log('');

  // Create Redis client
  const client = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    },
    password: process.env.REDIS_PASSWORD || undefined,
    
  });

  client.on('error', (err) => console.error('Redis Client Error:', err));
  
  await client.connect();
  console.log('Connected to Redis');
  console.log('Starting load test...\n');

  // Calculate interval
  const intervalMs = 60000 / OPERATIONS_PER_MINUTE;
  const endTime = Date.now() + (DURATION_SECONDS * 1000);

  // Run operations
  const interval = setInterval(async () => {
    if (Date.now() >= endTime) {
      clearInterval(interval);
      
      // Print final statistics
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.total / elapsed;
      
      console.log('\n=== Final Statistics ===');
      console.log(`Total Operations: ${stats.total}`);
      console.log(`Successful: ${stats.success}`);
      console.log(`Errors: ${stats.errors}`);
      console.log(`Duration: ${elapsed.toFixed(2)}s`);
      console.log(`Average Rate: ${rate.toFixed(2)} ops/s`);
      console.log(`Success Rate: ${((stats.success / stats.total) * 100).toFixed(2)}%`);
      
      await client.quit();
      process.exit(0);
    }
    
    executeRandomOperation(client);
  }, intervalMs);
}

// Start the load tester
main().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down...');
  process.exit(0);
});
