# Valkey Reverse Proxy

A simple TCP reverse proxy for Valkey (Redis-compatible) that passes through all requests transparently.

## Features

- Simple passthrough proxy
- No modification of Valkey/Redis protocol
- Connection logging
- Configurable via environment variables
- Compatible with Redis clients and tools

## Installation

```bash
npm install
```

## Usage

### Start the proxy

```bash
npm start
```

### Development mode (with auto-reload)

```bash
npm run dev
```

## Configuration

Create a `.env` file or set environment variables:

- `PROXY_PORT` - Port the proxy listens on (default: 6380)
- `REDIS_HOST` - Redis server hostname (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)

## Testing

### Load Testing Client

Run the included load testing client that generates random Redis operations:

```bash
npm run client
```

Configure the load test with environment variables:

```bash
# Custom configuration
OPS_PER_SECOND=50 DURATION_SECONDS=120 REDIS_PORT=6380 npm run client
```

Available options:
- `REDIS_HOST` - Redis/proxy hostname (default: localhost)
- `REDIS_PORT` - Redis/proxy port (default: 6380)
- `OPS_PER_SECOND` - Operations per second (default: 10)
- `DURATION_SECONDS` - Test duration (default: 60)

The client performs random operations including:
- String operations (GET, SET, DEL, INCR)
- Hash operations (HSET, HGET, HGETALL)
- List operations (LPUSH, LRANGE)
- Set operations (SADD, SMEMBERS)
- Sorted set operations (ZADD, ZRANGE)
- Expiration (EXPIRE)

### Manual Testing

Connect to the proxy using redis-cli:

```bash
redis-cli -p 6380
```

Or from your application:

```javascript
const redis = require('redis');
const client = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6380
  }
});
```

## Project Structure

```
.
├── proxy/              # Valkey reverse proxy
│   ├── proxy.js
│   ├── Dockerfile
│   └── package.json
├── client/             # Load testing client
│   ├── client.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Docker Setup

### Using Docker Compose (Recommended)

Start both Redis and the proxy:

```bash
docker-compose up -d
```

This will:
- Start a Valkey server on port 6379
- Start the proxy on port 6379
- Start the load testing client (runs for 1 hour by default)
- Start Redis Insight on port 5540 (compatible with Valkey)
- Connect clients to port 6379

Access Redis Insight at: http://localhost:5540

To connect Redis Insight to the proxy, use:
- Host: `valkey-proxy`
- Port: `6379`

Stop services:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f redis-proxy
```

### Building Docker Image Only

```bash
docker build -t redis-proxy .
docker run -p 6380:6380 -e REDIS_HOST=host.docker.internal redis-proxy
```

## Architecture

```
Client → Proxy (port 6379) → Valkey (port 6379)
       ←                      ←
```

The proxy acts as a transparent middleman, forwarding all data bidirectionally without modification. Fully compatible with Redis clients.
