import type { ProxyConfig } from './proxy/ProxyServer'
import process from 'node:process'
import { N8nRedisCache } from './cache/index.js'
import { LoggerService } from './logger/index.js'
import { MetricService } from './metrics/index.js'
import { DataModifier } from './modifiers/modifier'
import { Detector } from './proxy/Detector'
import { Parser } from './proxy/Parser'
import { ProxyServer } from './proxy/ProxyServer'

// Initialize logger first
const logger = new LoggerService()

// Configuration
const config: ProxyConfig = {
  proxyPort: +(process.env.PROXY_PORT as string) || 6379,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: +(process.env.REDIS_PORT as string) || 6379,
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  dumpData: process.env.DUMP_DATA === 'true',
}

// Metrics configuration
const metricsPort = +(process.env.METRICS_PORT as string) || 9090
const metricsDisabled = process.env.METRICS_DISABLED === 'true'

const metricService = new MetricService({
  port: metricsPort,
  disabled: metricsDisabled,
}, logger)

// Cache configuration
let cacheType = (process.env.CACHE_TYPE as 'local' | 'redis' | 'tiered') || 'tiered'
if (!['local', 'redis', 'tiered'].includes(cacheType)) {
  logger.error(`Invalid CACHE_TYPE: ${cacheType}. Must be one of 'local', 'redis', 'tiered'. Use local by default.`)
  cacheType = 'local'
}

// N8n Redis cache for direct Redis operations
const n8nCache = new N8nRedisCache({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
})

// Dependency injection setup
const dataModifier = new DataModifier(n8nCache, metricService, logger)
const detector = new Detector(dataModifier, metricService, logger)
const parser = new Parser(detector)
const proxyServer = new ProxyServer(config, parser, metricService, logger)

// Start the metrics server
metricService.start()

// Log startup information
logger.info('Starting n8n-ratelimiter proxy server')
logger.info({ config: { ...config, redisPassword: config.redisPassword ? '***' : undefined } }, 'Proxy configuration')
logger.info({ metricsPort, metricsDisabled, cacheType }, 'Service configuration')

// Start the proxy server
proxyServer.start()
