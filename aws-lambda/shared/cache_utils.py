"""
AiVedha Guard - Lambda In-Memory Cache Utility
================================================

Provides simple TTL-based caching for Lambda functions.
Uses Lambda's execution context to cache data across warm invocations.

Benefits:
- Zero cost (uses Lambda memory)
- Reduces DynamoDB read capacity usage
- Faster response times for frequently accessed data

Usage:
    from cache_utils import LambdaCache

    cache = LambdaCache(default_ttl=300)  # 5 minute TTL

    # Get or compute
    user = cache.get_or_compute(
        key=f"user:{user_id}",
        compute_fn=lambda: users_table.get_item(Key={'user_id': user_id})['Item'],
        ttl=600  # Optional: override TTL for this item
    )

Note: Cache is cleared when Lambda container is recycled (~15 min idle)
"""

import time
from typing import Any, Callable, Optional, Dict
import hashlib
import json


class LambdaCache:
    """Simple in-memory cache for Lambda functions."""

    # Class-level cache persists across invocations in same container
    _cache: Dict[str, Dict[str, Any]] = {}

    def __init__(self, default_ttl: int = 300):
        """
        Initialize cache with default TTL.

        Args:
            default_ttl: Default time-to-live in seconds (default: 300 = 5 minutes)
        """
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        if key not in self._cache:
            return None

        entry = self._cache[key]
        if time.time() > entry['expires_at']:
            # Expired - remove and return None
            del self._cache[key]
            return None

        return entry['value']

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not specified)
        """
        ttl = ttl or self.default_ttl
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'cached_at': time.time()
        }

    def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            True if key was deleted, False if not found
        """
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl: Optional[int] = None
    ) -> Any:
        """
        Get value from cache or compute and cache it.

        Args:
            key: Cache key
            compute_fn: Function to compute value if not cached
            ttl: Time-to-live in seconds

        Returns:
            Cached or computed value
        """
        value = self.get(key)
        if value is not None:
            return value

        # Compute and cache
        value = compute_fn()
        if value is not None:
            self.set(key, value, ttl)

        return value

    def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching a pattern.

        Args:
            pattern: Key prefix to match (e.g., "user:" invalidates all user:* keys)

        Returns:
            Number of keys invalidated
        """
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)

    def clear(self) -> None:
        """Clear entire cache."""
        self._cache.clear()

    def stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dict with cache stats
        """
        now = time.time()
        valid_entries = sum(1 for e in self._cache.values() if e['expires_at'] > now)
        expired_entries = len(self._cache) - valid_entries

        return {
            'total_entries': len(self._cache),
            'valid_entries': valid_entries,
            'expired_entries': expired_entries,
            'memory_keys': list(self._cache.keys())[:10]  # Sample
        }


# Global cache instances for different use cases
user_cache = LambdaCache(default_ttl=300)      # 5 min for user data
settings_cache = LambdaCache(default_ttl=600)  # 10 min for settings
blog_cache = LambdaCache(default_ttl=900)      # 15 min for blog content


def make_cache_key(*args) -> str:
    """
    Create a cache key from multiple arguments.

    Args:
        *args: Values to combine into key

    Returns:
        Hash-based cache key
    """
    key_data = json.dumps(args, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()
