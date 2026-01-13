import type { Server, Socket } from 'node:net'
import type { LoggerService } from '../logger/LoggerService.js'
import type { MetricService } from '../metrics/MetricService.js'
import type { Parser } from './Parser.js'
import { appendFileSync } from 'node:fs'
import { createConnection, createServer } from 'node:net'
import process from 'node:process'

export interface ProxyConfig {
  proxyPort: number
  redisHost: string
  redisPort: number
  redisPassword?: string
  dumpData: boolean
}

export class ProxyServer {
  private server: Server | null = null
  private readonly config: ProxyConfig
  private readonly parser: Parser
  private readonly metrics: MetricService
  private readonly logger: LoggerService

  constructor(config: ProxyConfig, parser: Parser, metrics: MetricService, logger: LoggerService) {
    this.config = config
    this.parser = parser
    this.metrics = metrics
    this.logger = logger
  }

  start(): void {
    this.server = createServer(clientSocket => this.handleClientConnection(clientSocket))

    this.server.listen(this.config.proxyPort, () => {
      this.logger.info(`Valkey reverse proxy listening on port ${this.config.proxyPort}`)
      this.logger.info(`Forwarding to Valkey at ${this.config.redisHost}:${this.config.redisPort}`)
      this.logger.info('Authentication is forwarded from client to server')
    })

    this.server.on('error', (err) => {
      this.logger.error({ err }, 'Server error')
      process.exit(1)
    })

    this.setupGracefulShutdown()
  }

  private handleClientConnection(clientSocket: Socket): void {
    this.metrics.activeConnections.inc()
    this.logger.debug({ remoteAddress: clientSocket.remoteAddress, remotePort: clientSocket.remotePort }, 'Client connected')

    let dataBuffer = Buffer.alloc(0)

    // Connect to Redis server
    const redisSocket = createConnection({
      host: this.config.redisHost,
      port: this.config.redisPort,
    }, () => {
      this.logger.debug({ host: this.config.redisHost, port: this.config.redisPort }, 'Connected to Valkey')
    })

    // Passthrough: Client -> Redis (including AUTH commands)
    clientSocket.on('data', async (data) => {
      // Accumulate data in buffer
      this.metrics.requestsTotal.inc({ command: 'onData', status: 'started' })
      dataBuffer = Buffer.concat([dataBuffer, data])

      // Check if we have a complete Redis command (ends with \r\n)
      if (!dataBuffer.slice(-2).equals(Buffer.from('\r\n'))) {
        // Incomplete command, wait for more data
        this.logger.trace('Incomplete command, waiting for more data')
        return
      }

      // Process the complete buffer
      const editedData = await this.parser.parseBuffer(dataBuffer)
      this.metrics.requestsTotal.inc({ command: 'onData', status: 'completed' })

      if (this.config.dumpData) {
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
      this.logger.debug('Client disconnected')
      this.metrics.activeConnections.dec()
      redisSocket.end()
    })

    clientSocket.on('error', (err) => {
      this.logger.error({ err: err.message }, 'Client error')
      redisSocket.end()
    })

    // Handle Redis disconnection
    redisSocket.on('end', () => {
      this.logger.debug('Redis connection closed')
      clientSocket.end()
    })

    redisSocket.on('error', (err) => {
      this.logger.error({ err: err.message }, 'Redis error')
      clientSocket.end()
    })
  }

  private setupGracefulShutdown(): void {
    process.on('SIGINT', () => {
      this.logger.info('Shutting down proxy server...')
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Proxy server closed')
          process.exit(0)
        })
      }
      else {
        process.exit(0)
      }
    })
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }
}
