import type { RedisClientType } from 'redis'
import type { CacheService } from './CacheService.js'
import type { RedisConfig } from './RedisCacheService.js'
import { createClient } from 'redis'

export class N8nRedisCache implements CacheService {
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
      console.error('N8n Redis cache client error:', err)
    })

    await this.client.connect()
    this.connected = true
    console.warn(`N8n Redis cache connected to ${this.config.host}:${this.config.port}`)
  }

  // CacheService interface implementation
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

  // Direct Redis commands for n8n operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    await this.ensureConnected()
    return this.client!.lPush(key, values)
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    await this.ensureConnected()
    return this.client!.rPush(key, values)
  }

  async lpop(key: string): Promise<string | null> {
    await this.ensureConnected()
    return this.client!.lPop(key)
  }

  async rpop(key: string): Promise<string | null> {
    await this.ensureConnected()
    return this.client!.rPop(key)
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.ensureConnected()
    return this.client!.lRange(key, start, stop)
  }

  async llen(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.lLen(key)
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.zAdd(key, { score, value: member })
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.ensureConnected()
    return this.client!.zRange(key, start, stop)
  }

  async zrangeByScore(key: string, min: number, max: number): Promise<string[]> {
    await this.ensureConnected()
    return this.client!.zRangeByScore(key, min, max)
  }

  async zrem(key: string, member: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.zRem(key, member)
  }

  async zcard(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.zCard(key)
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.hSet(key, field, value)
  }

  async hget(key: string, field: string): Promise<string | null> {
    await this.ensureConnected()
    return this.client!.hGet(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnected()
    return this.client!.hGetAll(key)
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    await this.ensureConnected()
    return this.client!.hDel(key, fields)
  }

  async incr(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.incr(key)
  }

  async decr(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.decr(key)
  }

  async expire(key: string, seconds: number): Promise<number> {
    await this.ensureConnected()
    return this.client!.expire(key, seconds)
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected()
    return this.client!.ttl(key)
  }

  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnected()
    return this.client!.keys(pattern)
  }

  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    await this.ensureConnected()
    return this.client!.eval(script, {
      keys,
      arguments: args,
    })
  }

  async ping(): Promise<string> {
    await this.ensureConnected()
    return this.client!.ping()
  }

  async flushDb(): Promise<void> {
    await this.ensureConnected()
    await this.client!.flushDb()
  }

  // Get the raw Redis client for advanced operations
  getClient(): RedisClientType | null {
    return this.client
  }
}
