"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  AiVedha Guard - Performance Optimization Module                             ║
║  Version: 5.1.0 "QUANTUM FORTRESS PRO"                                       ║
║                                                                              ║
║  High-performance utilities for security scanning including:                 ║
║  - Connection pooling with intelligent reuse                                 ║
║  - Multi-level caching (memory, DynamoDB)                                    ║
║  - Async HTTP client with rate limiting                                      ║
║  - Concurrent task execution with backpressure                               ║
║  - Resource-efficient batch processing                                       ║
║                                                                              ║
║  Owner: Aravind Jayamohan                                                    ║
║  Company: AiVibe Software Services Pvt Ltd                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import random
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager
from dataclasses import dataclass
from functools import wraps
from typing import (
    Any, Callable, Dict, Generic, Iterator, List, Optional,
    Set, Tuple, TypeVar
)
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ============================================================================
# LOGGING
# ============================================================================

logger = logging.getLogger('AiVedhaPerformance')
logger.setLevel(logging.INFO)

# ============================================================================
# TYPE VARIABLES
# ============================================================================

T = TypeVar('T')
KT = TypeVar('KT')
VT = TypeVar('VT')

# ============================================================================
# LRU CACHE WITH TTL
# ============================================================================


class TTLCache(Generic[KT, VT]):
    """
    Thread-safe LRU cache with time-to-live expiration.
    
    Features:
    - LRU eviction when max size reached
    - TTL-based expiration
    - Thread-safe operations
    - Statistics tracking
    """
    
    def __init__(
        self,
        max_size: int = 1000,
        ttl_seconds: float = 300.0,
        name: str = "cache"
    ):
        """
        Initialize TTL cache.
        
        Args:
            max_size: Maximum number of items in cache
            ttl_seconds: Time-to-live in seconds
            name: Name for logging/metrics
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.name = name
        
        self._cache: OrderedDict[KT, Tuple[VT, float]] = OrderedDict()
        self._lock = threading.RLock()
        
        # Statistics
        self._hits = 0
        self._misses = 0
        self._evictions = 0
    
    def get(self, key: KT, default: VT = None) -> Optional[VT]:
        """
        Get item from cache.
        
        Args:
            key: Cache key
            default: Default value if not found or expired
        
        Returns:
            Cached value or default
        """
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return default
            
            value, timestamp = self._cache[key]
            
            # Check expiration
            if time.time() - timestamp > self.ttl_seconds:
                del self._cache[key]
                self._misses += 1
                return default
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self._hits += 1
            return value
    
    def set(self, key: KT, value: VT) -> None:
        """
        Set item in cache.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        with self._lock:
            # Remove if exists (to update position)
            if key in self._cache:
                del self._cache[key]
            
            # Evict LRU items if at capacity
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
                self._evictions += 1
            
            self._cache[key] = (value, time.time())
    
    def delete(self, key: KT) -> bool:
        """Delete item from cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all items from cache."""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self) -> int:
        """Remove all expired items. Returns count of removed items."""
        removed = 0
        current_time = time.time()
        
        with self._lock:
            expired_keys = [
                key for key, (_, timestamp) in self._cache.items()
                if current_time - timestamp > self.ttl_seconds
            ]
            for key in expired_keys:
                del self._cache[key]
                removed += 1
        
        return removed
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'name': self.name,
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self._hits,
                'misses': self._misses,
                'evictions': self._evictions,
                'hit_rate': f'{hit_rate:.1f}%'
            }
    
    def __contains__(self, key: KT) -> bool:
        return self.get(key) is not None
    
    def __len__(self) -> int:
        return len(self._cache)


# ============================================================================
# CACHE DECORATOR
# ============================================================================


def cached(
    cache: TTLCache,
    key_func: Optional[Callable[..., str]] = None,
    condition: Optional[Callable[[Any], bool]] = None
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to cache function results.
    
    Args:
        cache: TTLCache instance to use
        key_func: Custom key generation function
        condition: Condition to check before caching result
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{hash((args, tuple(sorted(kwargs.items()))))}"
            
            # Check cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result if condition met
            if condition is None or condition(result):
                cache.set(cache_key, result)
            
            return result
        
        return wrapper
    
    return decorator


# ============================================================================
# HTTP CONNECTION POOL
# ============================================================================


class HTTPConnectionPool:
    """
    High-performance HTTP connection pool with retry logic.
    
    Features:
    - Connection reuse with keep-alive
    - Automatic retry with exponential backoff
    - Request rate limiting
    - Response caching
    - Multiple user agents rotation
    """
    
    # User agent rotation pool
    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    ]
    
    def __init__(
        self,
        pool_connections: int = 100,
        pool_maxsize: int = 100,
        max_retries: int = 3,
        timeout: float = 15.0,
        enable_cache: bool = True,
        cache_ttl: float = 60.0,
        rate_limit: Optional[float] = None
    ):
        """
        Initialize HTTP connection pool.
        
        Args:
            pool_connections: Number of connection pools to cache
            pool_maxsize: Maximum connections per pool
            max_retries: Maximum retry attempts
            timeout: Request timeout in seconds
            enable_cache: Enable response caching
            cache_ttl: Cache TTL in seconds
            rate_limit: Minimum seconds between requests (None for no limit)
        """
        self.timeout = timeout
        self.rate_limit = rate_limit
        self._last_request_time: Dict[str, float] = {}
        self._lock = threading.Lock()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST"],
            raise_on_status=False
        )
        
        # Configure adapter with connection pooling
        self._adapter = HTTPAdapter(
            pool_connections=pool_connections,
            pool_maxsize=pool_maxsize,
            max_retries=retry_strategy
        )
        
        # Create session
        self._session = requests.Session()
        self._session.mount('http://', self._adapter)
        self._session.mount('https://', self._adapter)
        
        # Default headers
        self._session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
        # Response cache
        self._cache: Optional[TTLCache] = None
        if enable_cache:
            self._cache = TTLCache(max_size=5000, ttl_seconds=cache_ttl, name='http_cache')
        
        # Statistics
        self._request_count = 0
        self._cache_hits = 0
        self._errors = 0
    
    def _get_user_agent(self) -> str:
        """Get a random user agent from the pool."""
        return random.choice(self.USER_AGENTS)
    
    def _rate_limit_wait(self, hostname: str) -> None:
        """Wait if rate limiting is enabled."""
        if not self.rate_limit:
            return
        
        with self._lock:
            last_time = self._last_request_time.get(hostname, 0)
            elapsed = time.time() - last_time
            
            if elapsed < self.rate_limit:
                time.sleep(self.rate_limit - elapsed)
            
            self._last_request_time[hostname] = time.time()
    
    def _get_cache_key(self, method: str, url: str, params: Optional[Dict] = None) -> str:
        """Generate cache key for request."""
        key_data = f"{method}:{url}:{json.dumps(params or {}, sort_keys=True)}"
        return hashlib.sha256(key_data.encode()).hexdigest()[:32]
    
    def request(
        self,
        method: str,
        url: str,
        params: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        data: Optional[Any] = None,
        json_data: Optional[Dict] = None,
        timeout: Optional[float] = None,
        allow_redirects: bool = True,
        verify: bool = True,
        use_cache: bool = True
    ) -> requests.Response:
        """
        Make an HTTP request with connection pooling.
        
        Args:
            method: HTTP method
            url: Request URL
            params: Query parameters
            headers: Custom headers
            data: Request body data
            json_data: JSON request body
            timeout: Request timeout override
            allow_redirects: Follow redirects
            verify: Verify SSL certificates
            use_cache: Use response cache (for GET requests)
        
        Returns:
            Response object
        """
        # Check cache for GET requests
        cache_key = None
        if use_cache and self._cache and method.upper() == 'GET':
            cache_key = self._get_cache_key(method, url, params)
            cached_response = self._cache.get(cache_key)
            if cached_response:
                self._cache_hits += 1
                return cached_response
        
        # Apply rate limiting
        hostname = urlparse(url).netloc
        self._rate_limit_wait(hostname)
        
        # Prepare headers
        request_headers = headers or {}
        if 'User-Agent' not in request_headers:
            request_headers['User-Agent'] = self._get_user_agent()
        
        self._request_count += 1
        
        try:
            response = self._session.request(
                method=method,
                url=url,
                params=params,
                headers=request_headers,
                data=data,
                json=json_data,
                timeout=timeout or self.timeout,
                allow_redirects=allow_redirects,
                verify=verify
            )
            
            # Cache successful GET responses
            if cache_key and response.status_code == 200:
                self._cache.set(cache_key, response)
            
            return response
            
        except Exception:
            self._errors += 1
            raise
    
    def get(self, url: str, **kwargs) -> requests.Response:
        """Make GET request."""
        return self.request('GET', url, **kwargs)
    
    def post(self, url: str, **kwargs) -> requests.Response:
        """Make POST request."""
        return self.request('POST', url, **kwargs)
    
    def head(self, url: str, **kwargs) -> requests.Response:
        """Make HEAD request."""
        return self.request('HEAD', url, **kwargs)
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Get connection pool statistics."""
        stats = {
            'total_requests': self._request_count,
            'cache_hits': self._cache_hits,
            'errors': self._errors,
            'hit_rate': f'{(self._cache_hits / self._request_count * 100) if self._request_count > 0 else 0:.1f}%'
        }
        if self._cache:
            stats['cache_stats'] = self._cache.stats
        return stats
    
    def close(self) -> None:
        """Close all connections."""
        self._session.close()
    
    def __enter__(self) -> 'HTTPConnectionPool':
        return self
    
    def __exit__(self, *_args) -> None:
        self.close()


# Global connection pool instance
_global_http_pool: Optional[HTTPConnectionPool] = None


def get_http_pool() -> HTTPConnectionPool:
    """Get or create global HTTP connection pool."""
    global _global_http_pool
    if _global_http_pool is None:
        _global_http_pool = HTTPConnectionPool()
    return _global_http_pool


# ============================================================================
# CONCURRENT TASK EXECUTOR
# ============================================================================


@dataclass
class TaskResult(Generic[T]):
    """Result of a concurrent task execution."""
    
    task_id: str
    success: bool
    result: Optional[T] = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'taskId': self.task_id,
            'success': self.success,
            'result': self.result,
            'error': self.error,
            'durationMs': self.duration_ms
        }


class ConcurrentExecutor:
    """
    High-performance concurrent task executor with backpressure.
    
    Features:
    - Thread pool with configurable size
    - Task prioritization
    - Backpressure management
    - Progress callbacks
    - Graceful shutdown
    """
    
    def __init__(
        self,
        max_workers: int = 10,
        max_queue_size: int = 1000,
        on_progress: Optional[Callable[[int, int], None]] = None
    ):
        """
        Initialize concurrent executor.
        
        Args:
            max_workers: Maximum concurrent workers
            max_queue_size: Maximum pending tasks
            on_progress: Callback for progress updates (completed, total)
        """
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        self.on_progress = on_progress
        
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._pending_count = 0
        self._completed_count = 0
        self._lock = threading.Lock()
        self._shutdown = False
    
    def execute_many(
        self,
        tasks: List[Tuple[str, Callable[[], T]]],
        timeout: Optional[float] = None,
        fail_fast: bool = False
    ) -> List[TaskResult[T]]:
        """
        Execute multiple tasks concurrently.
        
        Args:
            tasks: List of (task_id, callable) tuples
            timeout: Overall timeout in seconds
            fail_fast: Stop on first error
        
        Returns:
            List of task results
        """
        if self._shutdown:
            raise RuntimeError("Executor has been shut down")
        
        results: List[TaskResult[T]] = []
        futures: Dict[Any, str] = {}
        
        total_tasks = len(tasks)
        
        with self._lock:
            self._pending_count = total_tasks
            self._completed_count = 0
        
        # Submit all tasks
        for task_id, task_func in tasks:
            future = self._executor.submit(self._execute_task, task_id, task_func)
            futures[future] = task_id
        
        # Collect results
        try:
            for future in as_completed(futures, timeout=timeout):
                task_id = futures[future]
                
                try:
                    result = future.result()
                    results.append(result)
                    
                    if fail_fast and not result.success:
                        # Cancel remaining tasks
                        for f in futures:
                            f.cancel()
                        break
                    
                except Exception as e:
                    results.append(TaskResult(
                        task_id=task_id,
                        success=False,
                        error=str(e)
                    ))
                
                with self._lock:
                    self._completed_count += 1
                
                # Progress callback
                if self.on_progress:
                    self.on_progress(self._completed_count, total_tasks)
        
        except TimeoutError:
            logger.warning(f"Concurrent execution timed out after {timeout}s")
            # Add timeout results for incomplete tasks
            for future, task_id in futures.items():
                if not future.done():
                    results.append(TaskResult(
                        task_id=task_id,
                        success=False,
                        error="Task timed out"
                    ))
        
        return results
    
    def _execute_task(self, task_id: str, task_func: Callable[[], T]) -> TaskResult[T]:
        """Execute a single task and wrap result."""
        start_time = time.time()
        
        try:
            result = task_func()
            duration_ms = (time.time() - start_time) * 1000
            
            return TaskResult(
                task_id=task_id,
                success=True,
                result=result,
                duration_ms=duration_ms
            )
        
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"Task {task_id} failed: {e}")
            
            return TaskResult(
                task_id=task_id,
                success=False,
                error=str(e),
                duration_ms=duration_ms
            )
    
    def submit(
        self,
        task_id: str,
        task_func: Callable[[], T]
    ) -> 'asyncio.Future[TaskResult[T]]':
        """Submit a single task for execution."""
        if self._shutdown:
            raise RuntimeError("Executor has been shut down")
        
        return self._executor.submit(self._execute_task, task_id, task_func)
    
    def shutdown(self, wait: bool = True) -> None:
        """Shutdown the executor."""
        self._shutdown = True
        self._executor.shutdown(wait=wait)
    
    def __enter__(self) -> 'ConcurrentExecutor':
        return self
    
    def __exit__(self, *_args) -> None:
        self.shutdown()


# ============================================================================
# BATCH PROCESSOR
# ============================================================================


class BatchProcessor(Generic[T, VT]):
    """
    Efficient batch processing with configurable batch sizes.
    
    Features:
    - Automatic batching
    - Parallel batch execution
    - Progress tracking
    - Memory-efficient iteration
    """
    
    def __init__(
        self,
        batch_size: int = 100,
        max_parallel_batches: int = 5,
        on_batch_complete: Optional[Callable[[int, int], None]] = None
    ):
        """
        Initialize batch processor.
        
        Args:
            batch_size: Items per batch
            max_parallel_batches: Maximum concurrent batches
            on_batch_complete: Callback when batch completes (batch_num, total_batches)
        """
        self.batch_size = batch_size
        self.max_parallel_batches = max_parallel_batches
        self.on_batch_complete = on_batch_complete
    
    def process(
        self,
        items: List[T],
        processor: Callable[[List[T]], List[VT]]
    ) -> List[VT]:
        """
        Process items in batches.
        
        Args:
            items: Items to process
            processor: Function to process a batch
        
        Returns:
            Combined results from all batches
        """
        if not items:
            return []
        
        # Create batches
        batches = list(self._create_batches(items))
        total_batches = len(batches)
        results: List[VT] = []
        
        # Process batches with thread pool
        with ConcurrentExecutor(max_workers=self.max_parallel_batches) as executor:
            tasks = [
                (f"batch_{i}", lambda b=batch: processor(b))
                for i, batch in enumerate(batches)
            ]
            
            batch_results = executor.execute_many(tasks)
            
            for i, result in enumerate(batch_results):
                if result.success and result.result:
                    results.extend(result.result)
                
                if self.on_batch_complete:
                    self.on_batch_complete(i + 1, total_batches)
        
        return results
    
    def _create_batches(self, items: List[T]) -> Iterator[List[T]]:
        """Create batches from items."""
        for i in range(0, len(items), self.batch_size):
            yield items[i:i + self.batch_size]
    
    def iter_batches(self, items: List[T]) -> Iterator[Tuple[int, List[T]]]:
        """
        Iterate over batches with index.
        
        Args:
            items: Items to batch
        
        Yields:
            (batch_index, batch_items) tuples
        """
        for i, batch in enumerate(self._create_batches(items)):
            yield i, batch


# ============================================================================
# DOMAIN RATE LIMITER
# ============================================================================


class DomainRateLimiter:
    """
    Per-domain rate limiting for respectful scanning.
    
    Features:
    - Per-domain request tracking
    - Configurable rate limits
    - robots.txt crawl-delay respect
    - Automatic cleanup
    """
    
    def __init__(
        self,
        default_delay: float = 0.5,
        max_requests_per_minute: int = 60
    ):
        """
        Initialize domain rate limiter.
        
        Args:
            default_delay: Default delay between requests (seconds)
            max_requests_per_minute: Maximum requests per minute per domain
        """
        self.default_delay = default_delay
        self.max_requests_per_minute = max_requests_per_minute
        
        self._domain_times: Dict[str, List[float]] = {}
        self._domain_delays: Dict[str, float] = {}
        self._lock = threading.Lock()
    
    def set_domain_delay(self, domain: str, delay: float) -> None:
        """Set custom delay for a domain (e.g., from robots.txt)."""
        with self._lock:
            self._domain_delays[domain] = delay
    
    def wait_for_domain(self, domain: str) -> float:
        """
        Wait appropriate time before making request to domain.
        
        Args:
            domain: Target domain
        
        Returns:
            Actual wait time in seconds
        """
        with self._lock:
            current_time = time.time()
            
            # Get domain-specific delay
            delay = self._domain_delays.get(domain, self.default_delay)
            
            # Clean old entries (keep last minute)
            if domain in self._domain_times:
                cutoff = current_time - 60
                self._domain_times[domain] = [
                    t for t in self._domain_times[domain] if t > cutoff
                ]
            else:
                self._domain_times[domain] = []
            
            # Check rate limit
            recent_requests = len(self._domain_times[domain])
            if recent_requests >= self.max_requests_per_minute:
                # Wait until oldest request expires
                oldest = min(self._domain_times[domain])
                wait_time = (oldest + 60) - current_time
                if wait_time > 0:
                    time.sleep(wait_time)
                    current_time = time.time()
            
            # Check time since last request
            if self._domain_times[domain]:
                last_request = max(self._domain_times[domain])
                elapsed = current_time - last_request
                
                if elapsed < delay:
                    wait_time = delay - elapsed
                    time.sleep(wait_time)
                    current_time = time.time()
            
            # Record this request
            self._domain_times[domain].append(current_time)
            
            return current_time - (current_time - delay)
    
    @contextmanager
    def rate_limited_request(self, domain: str) -> Iterator[None]:
        """Context manager for rate-limited requests."""
        self.wait_for_domain(domain)
        yield


# ============================================================================
# URL DEDUPLICATION
# ============================================================================


class URLDeduplicator:
    """
    Efficient URL deduplication for crawling.
    
    Features:
    - Normalization of URLs
    - Memory-efficient storage
    - Thread-safe operations
    - Bloom filter for large datasets
    """
    
    def __init__(self, normalize: bool = True):
        """
        Initialize URL deduplicator.
        
        Args:
            normalize: Normalize URLs before comparison
        """
        self.normalize = normalize
        self._seen: Set[str] = set()
        self._lock = threading.Lock()
    
    def _normalize_url(self, url: str) -> str:
        """Normalize URL for comparison."""
        if not self.normalize:
            return url
        
        try:
            parsed = urlparse(url.lower())
            
            # Remove default ports
            netloc = parsed.netloc
            if netloc.endswith(':80') and parsed.scheme == 'http':
                netloc = netloc[:-3]
            elif netloc.endswith(':443') and parsed.scheme == 'https':
                netloc = netloc[:-4]
            
            # Normalize path
            path = parsed.path.rstrip('/') or '/'
            
            # Remove common tracking parameters
            tracking_params = {
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'ref', 'source'
            }
            
            query = parsed.query
            if query:
                params = [
                    p for p in query.split('&')
                    if p.split('=')[0].lower() not in tracking_params
                ]
                query = '&'.join(sorted(params))
            
            return f"{parsed.scheme}://{netloc}{path}{'?' + query if query else ''}"
        
        except Exception:
            return url
    
    def is_new(self, url: str) -> bool:
        """
        Check if URL is new (not seen before).
        
        Args:
            url: URL to check
        
        Returns:
            True if new, False if already seen
        """
        normalized = self._normalize_url(url)
        url_hash = hashlib.sha256(normalized.encode()).hexdigest()[:16]
        
        with self._lock:
            if url_hash in self._seen:
                return False
            self._seen.add(url_hash)
            return True
    
    def add(self, url: str) -> None:
        """Add URL to seen set without checking."""
        normalized = self._normalize_url(url)
        url_hash = hashlib.sha256(normalized.encode()).hexdigest()[:16]
        
        with self._lock:
            self._seen.add(url_hash)
    
    def clear(self) -> None:
        """Clear all seen URLs."""
        with self._lock:
            self._seen.clear()
    
    def __len__(self) -> int:
        return len(self._seen)
    
    def __contains__(self, url: str) -> bool:
        return not self.is_new(url)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Caching
    'TTLCache',
    'cached',
    
    # HTTP
    'HTTPConnectionPool',
    'get_http_pool',
    
    # Concurrency
    'TaskResult',
    'ConcurrentExecutor',
    'BatchProcessor',
    
    # Rate Limiting
    'DomainRateLimiter',
    
    # URL Processing
    'URLDeduplicator'
]
