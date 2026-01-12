import type { CacheService } from './CacheService.js'

interface CacheEntry {
  value: string
  expiresAt?: number
}

export class LocalCacheService implements CacheService {
  private cache: Map<string, CacheEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(cleanupIntervalMs = 60000) {
    // Run cleanup every minute by default
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs)
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry = {
      value,
      expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined,
    }
    this.cache.set(key, entry)
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  // Additional methods for local cache
  size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }
}
