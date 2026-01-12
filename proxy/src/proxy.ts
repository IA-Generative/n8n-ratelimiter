import { appendFileSync } from 'node:fs'
import { createConnection, createServer } from 'node:net'
import process from 'node:process'
import { parseBuffer } from './parser'

// Configuration
const PROXY_PORT = +(process.env.PROXY_PORT as string) || 6379
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = +(process.env.REDIS_PORT as string) || 6379

// Create TCP server (proxy)
const server = createServer((clientSocket) => {
  console.warn(`[${new Date().toISOString()}] Client connected from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`)

  let dataBuffer = Buffer.alloc(0)

  // Connect to Redis server
  const redisSocket = createConnection({
    host: REDIS_HOST,
    port: REDIS_PORT,
  }, () => {
    console.warn(`[${new Date().toISOString()}] Connected to Valkey at ${REDIS_HOST}:${REDIS_PORT}`)
  })

  // Passthrough: Client -> Redis (including AUTH commands)
  clientSocket.on('data', (data) => {
    // Accumulate data in buffer
    dataBuffer = Buffer.concat([dataBuffer, data])

    // Try to parse complete commands from buffer
    const dataStr = dataBuffer.toString('utf8')

    // Check if we have a complete Redis command (ends with \r\n)
    if (!dataStr.endsWith('\r\n')) {
      // Incomplete command, wait for more data
      console.warn('Incomplete command, waiting for more data')
      return
    }

    // Process the complete buffer
    const editedData = parseBuffer(dataBuffer)

    if (process.env.DUMP_DATA === 'true') {
      // Log input data as hex
      appendFileSync('inputs', `${dataBuffer.toString('hex')}\n`)

      // Log output data as hex
      appendFileSync('outputs', `${editedData.toString('hex')}\n`)
    }

    // Forward the data
    redisSocket.write(editedData)

    // Clear the buffer after processing
    dataBuffer = Buffer.alloc(0)
  })

  // Passthrough: Redis -> Client
  redisSocket.on('data', (data) => {
    clientSocket.write(data)
  })

  // Handle client disconnection
  clientSocket.on('end', () => {
    console.warn(`[${new Date().toISOString()}] Client disconnected`)
    redisSocket.end()
  })

  clientSocket.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Client error:`, err.message)
    redisSocket.end()
  })

  // Handle Redis disconnection
  redisSocket.on('end', () => {
    console.warn(`[${new Date().toISOString()}] Redis connection closed`)
    clientSocket.end()
  })

  redisSocket.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Redis error:`, err.message)
    clientSocket.end()
  })
})

// Start server
server.listen(PROXY_PORT, () => {
  console.warn(`Valkey reverse proxy listening on port ${PROXY_PORT}`)
  console.warn(`Forwarding to Valkey at ${REDIS_HOST}:${REDIS_PORT}`)
  console.warn(`Authentication is forwarded from client to server`)
})

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.warn('\nShutting down proxy...')
  server.close(() => {
    console.warn('Proxy closed')
    process.exit(0)
  })
})
