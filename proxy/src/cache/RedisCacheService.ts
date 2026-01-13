import type { RedisClientType } from 'redis'
import type { CacheService } from './CacheService.js'
import { createClient } from 'redis'

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
}

export class RedisCacheService implements CacheService {
  private client: RedisClientType | null = null
  private readonly config: RedisConfig
  private connected = false

  constructor(config: RedisConfig) {
    this.config = config
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected && this.client) {
      return
    }

    this.client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
      },
      password: this.config.password,
      database: this.config.db,
    })

    this.client.on('error', (err) => {
      console.error('Redis cache client error:', err)
    })

    await this.client.connect()
    this.connected = true
    console.warn(`Redis cache connected to ${this.config.host}:${this.config.port}`)
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected()
    return this.client!.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.ensureConnected()
    if (ttlSeconds) {
      await this.client!.setEx(key, ttlSeconds, value)
    }
    else {
      await this.client!.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected()
    await this.client!.del(key)
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureConnected()
    const result = await this.client!.exists(key)
    return result === 1
  }

  async close(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit()
      this.connected = false
      this.client = null
    }
  }

  // Additional Redis-specific methods
  async ping(): Promise<string> {
    await this.ensureConnected()
    return this.client!.ping()
  }

  async flushDb(): Promise<void> {
    await this.ensureConnected()
    await this.client!.flushDb()
  }
}
