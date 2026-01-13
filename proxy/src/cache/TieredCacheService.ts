import type { CacheService } from './CacheService.js'

export class TieredCacheService implements CacheService {
  private readonly localCache: CacheService
  private readonly remoteCache?: CacheService

  constructor(localCache: CacheService, remoteCache?: CacheService) {
    this.localCache = localCache
    this.remoteCache = remoteCache
  }

  async get(key: string): Promise<string | null> {
    // Try local cache first
    const localValue = await this.localCache.get(key)
    if (localValue !== null) {
      return localValue
    }

    // If not in local and remote is available, try remote
    if (this.remoteCache) {
      const remoteValue = await this.remoteCache.get(key)
      if (remoteValue !== null) {
        // Populate local cache with remote value
        await this.localCache.set(key, remoteValue).catch((err) => {
          console.error('Failed to populate local cache:', err)
        })
        return remoteValue
      }
    }

    return null
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    // Write to both local and remote (write-through)
    const promises: Promise<void>[] = [
      this.localCache.set(key, value, ttlSeconds),
    ]

    if (this.remoteCache) {
      promises.push(this.remoteCache.set(key, value, ttlSeconds))
    }

    await Promise.all(promises)
  }

  async del(key: string): Promise<void> {
    // Delete from both local and remote
    const promises: Promise<void>[] = [
      this.localCache.del(key),
    ]

    if (this.remoteCache) {
      promises.push(this.remoteCache.del(key))
    }

    await Promise.all(promises)
  }

  async exists(key: string): Promise<boolean> {
    // Check local first
    const localExists = await this.localCache.exists(key)
    if (localExists) {
      return true
    }

    // Check remote if available
    if (this.remoteCache) {
      return this.remoteCache.exists(key)
    }

    return false
  }

  async close(): Promise<void> {
    const promises: Promise<void>[] = [
      this.localCache.close(),
    ]

    if (this.remoteCache) {
      promises.push(this.remoteCache.close())
    }

    await Promise.all(promises)
  }
}
