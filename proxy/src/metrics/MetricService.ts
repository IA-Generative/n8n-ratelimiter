import type { LoggerService } from '../logger/LoggerService.js'
import http from 'node:http'
import { collectDefaultMetrics, Counter, Gauge, Histogram, register } from 'prom-client'

export interface MetricServiceConfig {
  port: number
  disabled?: boolean
}

/**
 * Service for collecting and exposing Prometheus metrics
 */
export class MetricService {
  private server: http.Server | null = null
  private readonly config: MetricServiceConfig
  private readonly logger: LoggerService

  // Proxy-specific metrics
  public readonly requestsTotal: Counter
  public readonly activeConnections: Gauge
  public readonly commandDuration: Histogram
  public readonly cacheHits: Counter
  public readonly cacheMisses: Counter
  public readonly redisErrors: Counter
  public readonly workflowsRuns: Counter

  constructor(config: MetricServiceConfig, logger: LoggerService) {
    this.config = config
    this.logger = logger

    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      prefix: 'n8n_proxy_',
    })

    // Initialize custom metrics
    this.requestsTotal = new Counter({
      name: 'n8n_proxy_requests_total',
      help: 'Total number of Redis commands processed',
      labelNames: ['command', 'status'],
    })

    this.activeConnections = new Gauge({
      name: 'n8n_proxy_active_connections',
      help: 'Number of active proxy connections',
    })

    this.commandDuration = new Histogram({
      name: 'n8n_proxy_command_duration_seconds',
      help: 'Duration of Redis commands in seconds',
      labelNames: ['command'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    })

    this.cacheHits = new Counter({
      name: 'n8n_proxy_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    })

    this.cacheMisses = new Counter({
      name: 'n8n_proxy_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    })

    this.redisErrors = new Counter({
      name: 'n8n_proxy_redis_errors_total',
      help: 'Total number of Redis errors',
      labelNames: ['error_type'],
    })

    this.workflowsRuns = new Counter({
      name: 'n8n_proxy_workflows_runs_total',
      help: 'Total number of workflow runs',
      labelNames: ['workflow_id', 'owner_id', 'owner_name'],
    })
  }

  /**
   * Start the metrics HTTP server
   */
  public start(): void {
    if (this.config.disabled) {
      this.logger.info('Metrics service is disabled')
      return
    }

    if (this.server) {
      this.logger.warn('Metrics server is already running')
      return
    }

    this.server = http.createServer(async (req, res) => {
      if (req.url === '/metrics') {
        res.setHeader('Content-Type', register.contentType)
        try {
          const metrics = await register.metrics()
          res.end(metrics)
        }
        catch (error) {
          res.statusCode = 500
          res.end(`Error collecting metrics: ${error}`)
        }
      }
      else if (req.url === '/health') {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'healthy' }))
      }
      else {
        res.statusCode = 404
        res.end('Not Found')
      }
    })

    this.server.listen(this.config.port, () => {
      this.logger.info(`Metrics server listening on http://0.0.0.0:${this.config.port}/metrics`)
    })

    this.server.on('error', (error) => {
      this.logger.error({ error }, 'Metrics server error')
    })
  }

  /**
   * Stop the metrics HTTP server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve()
        return
      }

      this.server.close((err) => {
        if (err) {
          reject(err)
        }
        else {
          this.server = null
          this.logger.info('Metrics server stopped')
          resolve()
        }
      })
    })
  }

  /**
   * Get all metrics as a string
   */
  public async getMetrics(): Promise<string> {
    return register.metrics()
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    register.clear()
  }
}
