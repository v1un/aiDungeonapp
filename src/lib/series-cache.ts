'use client';
/**
 * Simple cache system for series details to serve as a fallback when AI API is unavailable
 */

import type { SeriesDetails } from "@/types";

// Define cache key format
const CACHE_KEY_PREFIX = 'mysticChatways_series_cache_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Save series details to the cache
 */
export function cacheSeriesDetails(seriesName: string, seriesDetails: SeriesDetails): void {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    const normalized = seriesName.toLowerCase().trim();
    const cacheKey = `${CACHE_KEY_PREFIX}${normalized}`;
    
    const cacheEntry = {
      seriesDetails,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error('Failed to cache series details:', error);
    // Fail silently - caching is just an enhancement
  }
}

/**
 * Get cached series details if available
 * @returns SeriesDetails if found and valid, null otherwise
 */
export function getCachedSeriesDetails(seriesName: string): SeriesDetails | null {
  if (typeof window === 'undefined') return null; // Server-side guard
  
  try {
    const normalized = seriesName.toLowerCase().trim();
    const cacheKey = `${CACHE_KEY_PREFIX}${normalized}`;
    
    const cacheEntryRaw = localStorage.getItem(cacheKey);
    if (!cacheEntryRaw) return null;
    
    const cacheEntry = JSON.parse(cacheEntryRaw);
    
    // Check if cache entry is still valid (within TTL)
    if (Date.now() - cacheEntry.timestamp > CACHE_TTL_MS) {
      // Cache expired, remove it and return null
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return cacheEntry.seriesDetails;
  } catch (error) {
    console.error('Failed to retrieve cached series details:', error);
    return null;
  }
}

/**
 * Get all cached series names
 * @returns Array of series names that are cached
 */
export function getCachedSeriesNames(): string[] {
  if (typeof window === 'undefined') return []; // Server-side guard
  
  try {
    const cachedSeries: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        const seriesName = key.substring(CACHE_KEY_PREFIX.length);
        cachedSeries.push(seriesName);
      }
    }
    
    return cachedSeries;
  } catch (error) {
    console.error('Failed to retrieve cached series names:', error);
    return [];
  }
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache(): void {
  if (typeof window === 'undefined') return; // Server-side guard
  
  try {
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cacheEntryRaw = localStorage.getItem(key);
          if (cacheEntryRaw) {
            const cacheEntry = JSON.parse(cacheEntryRaw);
            if (now - cacheEntry.timestamp > CACHE_TTL_MS) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // If there's any issue with this entry, just skip it
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup expired cache entries:', error);
  }
}
