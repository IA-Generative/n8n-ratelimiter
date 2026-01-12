import type { CacheService } from './CacheService.js'
import type { RedisConfig } from './RedisCacheService.js'
import { LocalCacheService } from './LocalCacheService.js'
import { RedisCacheService } from './RedisCacheService.js'
import { TieredCacheService } from './TieredCacheService.js'

export type CacheType = 'local' | 'redis' | 'tiered'

export interface CacheFactoryConfig {
  type: CacheType
  redis?: RedisConfig
  localCleanupIntervalMs?: number
  enableTiered?: boolean
}

export class CacheFactory {
  static create(config: CacheFactoryConfig): CacheService {
    switch (config.type) {
      case 'local':
        return new LocalCacheService(config.localCleanupIntervalMs)
      case 'redis':
        if (!config.redis) {
          throw new Error('Redis configuration is required for redis cache type')
        }
        return new RedisCacheService(config.redis)
      case 'tiered':
        if (!config.redis) {
          throw new Error('Redis configuration is required for tiered cache type')
        }
        return new TieredCacheService(
          new LocalCacheService(config.localCleanupIntervalMs),
          new RedisCacheService(config.redis),
        )
      default:
        throw new Error(`Unknown cache type: ${config.type}`)
    }
  }
}
