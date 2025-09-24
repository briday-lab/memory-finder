// Simple in-memory cache for development
// In production, you'd use Redis or similar

interface CacheItem<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expiresAt })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return item.value as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
const cache = new MemoryCache()

// Clean up expired entries every 10 minutes
setInterval(() => {
  cache.cleanup()
}, 10 * 60 * 1000)

export default cache

// Cache key generators
export const CacheKeys = {
  // User-related cache keys
  userProjects: (userId: string) => `user:${userId}:projects`,
  userFiles: (userId: string, projectId?: string) => 
    projectId ? `user:${userId}:project:${projectId}:files` : `user:${userId}:files`,
  
  // Project-related cache keys
  project: (projectId: string) => `project:${projectId}`,
  projectFiles: (projectId: string) => `project:${projectId}:files`,
  
  // Search-related cache keys
  searchResults: (query: string, projectId: string) => `search:${projectId}:${query}`,
  searchSuggestions: (projectId: string) => `search:suggestions:${projectId}`,
  
  // Analytics cache keys
  analytics: (userId: string, type: string) => `analytics:${userId}:${type}`,
  
  // Video URL cache keys
  videoUrl: (fileId: string) => `video:url:${fileId}`,
  
  // Processing status cache keys
  processingStatus: (fileId: string) => `processing:${fileId}`,
}

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
}

// Cache utility functions
export const cacheUtils = {
  // Cache with automatic key generation
  async cacheOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await fetchFn()
    cache.set(key, result, ttl)
    return result
  },

  // Invalidate related cache entries
  invalidateUser(userId: string): void {
    const stats = cache.getStats()
    stats.keys.forEach(key => {
      if (key.includes(`user:${userId}`)) {
        cache.delete(key)
      }
    })
  },

  // Invalidate project-related cache
  invalidateProject(projectId: string): void {
    const stats = cache.getStats()
    stats.keys.forEach(key => {
      if (key.includes(`project:${projectId}`) || key.includes(`search:${projectId}`)) {
        cache.delete(key)
      }
    })
  },

  // Invalidate file-related cache
  invalidateFile(fileId: string): void {
    cache.delete(CacheKeys.videoUrl(fileId))
    cache.delete(CacheKeys.processingStatus(fileId))
  },

  // Warm up cache with common data
  async warmup(userId: string): Promise<void> {
    try {
      // Pre-load user projects
      const projectsKey = CacheKeys.userProjects(userId)
      if (!cache.get(projectsKey)) {
        // This would typically fetch from API
        console.log(`Warming up cache for user ${userId}`)
      }
    } catch (error) {
      console.warn('Cache warmup failed:', error)
    }
  }
}

// Cache middleware for API routes
export function withCache<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args)
    
    const cached = cache.get<R>(key)
    if (cached !== null) {
      return cached
    }

    const result = await fn(...args)
    cache.set(key, result, ttl)
    return result
  }
}

// Cache decorator for class methods
export function cached(ttl?: number, keyGenerator?: (args: unknown[]) => string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const key = keyGenerator ? keyGenerator(args) : `${(target as { constructor: { name: string } }).constructor.name}:${propertyName}:${JSON.stringify(args)}`
      
      const cached = cache.get(key)
      if (cached !== null) {
        return cached
      }

      const result = await method.apply(this, args)
      cache.set(key, result, ttl)
      return result
    }

    return descriptor
  }
}
