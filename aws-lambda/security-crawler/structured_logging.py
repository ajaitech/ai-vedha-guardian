"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  AiVedha Guard - Comprehensive Structured Logging System                     ║
║  Version: 5.1.0 "QUANTUM FORTRESS PRO"                                       ║
║                                                                              ║
║  Enterprise-grade logging with:                                              ║
║  - Structured JSON logging for CloudWatch                                    ║
║  - Correlation IDs for request tracing                                       ║
║  - Performance metrics collection                                            ║
║  - Automatic sensitive data masking                                          ║
║  - Log aggregation and analysis support                                      ║
║                                                                              ║
║  Owner: Aravind Jayamohan                                                    ║
║  Company: AiVibe Software Services Pvt Ltd                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import functools
import json
import logging
import os
import re
import sys
import time
import traceback
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from threading import local
from typing import Any, Callable, Dict, Iterator, List, Optional, TypeVar

# ============================================================================
# CONSTANTS
# ============================================================================

VERSION = "5.1.0"
SERVICE_NAME = "aivedha-guard"
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'production')

# Sensitive data patterns to mask
SENSITIVE_PATTERNS = [
    (r'(api[_-]?key)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-]{8,})', r'\1="***MASKED***"'),
    (r'(secret)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-]{8,})', r'\1="***MASKED***"'),
    (r'(password)["\']?\s*[:=]\s*["\']?([^\s"\']+)', r'\1="***MASKED***"'),
    (r'(token)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.]{20,})', r'\1="***MASKED***"'),
    (r'(bearer)\s+([a-zA-Z0-9_\-\.]+)', r'\1 ***MASKED***'),
    (r'AKIA[0-9A-Z]{16}', 'AKIA***MASKED***'),
    (r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', r'***EMAIL***'),
]

# ============================================================================
# TYPE VARIABLES
# ============================================================================

T = TypeVar('T')

# ============================================================================
# THREAD LOCAL CONTEXT
# ============================================================================

_context = local()


def get_correlation_id() -> str:
    """Get current correlation ID from context."""
    return getattr(_context, 'correlation_id', None) or str(uuid.uuid4())[:12]


def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID in context."""
    _context.correlation_id = correlation_id


def get_request_context() -> Dict[str, Any]:
    """Get current request context."""
    return getattr(_context, 'request_context', {})


def set_request_context(context: Dict[str, Any]) -> None:
    """Set request context."""
    _context.request_context = context


@contextmanager
def logging_context(
    correlation_id: Optional[str] = None,
    **extra_context
) -> Iterator[str]:
    """
    Context manager for setting logging context.
    
    Args:
        correlation_id: Optional correlation ID (generated if not provided)
        **extra_context: Additional context to include
    
    Yields:
        The correlation ID being used
    """
    old_correlation_id = getattr(_context, 'correlation_id', None)
    old_context = getattr(_context, 'request_context', {})
    
    new_correlation_id = correlation_id or str(uuid.uuid4())[:12]
    _context.correlation_id = new_correlation_id
    _context.request_context = {**old_context, **extra_context}
    
    try:
        yield new_correlation_id
    finally:
        _context.correlation_id = old_correlation_id
        _context.request_context = old_context


# ============================================================================
# SENSITIVE DATA MASKING
# ============================================================================


def mask_sensitive_data(message: str) -> str:
    """
    Mask sensitive data in log messages.
    
    Args:
        message: Log message that may contain sensitive data
    
    Returns:
        Message with sensitive data masked
    """
    if not isinstance(message, str):
        message = str(message)
    
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = re.sub(pattern, replacement, message, flags=re.IGNORECASE)
    
    return message


def mask_dict_values(data: Dict[str, Any], sensitive_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Mask sensitive values in a dictionary.
    
    Args:
        data: Dictionary to mask
        sensitive_keys: List of keys to mask (default: common sensitive keys)
    
    Returns:
        Dictionary with sensitive values masked
    """
    if sensitive_keys is None:
        sensitive_keys = [
            'password', 'secret', 'token', 'api_key', 'apiKey',
            'authorization', 'auth', 'credential', 'private_key'
        ]
    
    masked = {}
    for key, value in data.items():
        key_lower = key.lower()
        
        if any(sk in key_lower for sk in sensitive_keys):
            masked[key] = '***MASKED***'
        elif isinstance(value, dict):
            masked[key] = mask_dict_values(value, sensitive_keys)
        elif isinstance(value, str):
            masked[key] = mask_sensitive_data(value)
        else:
            masked[key] = value
    
    return masked


# ============================================================================
# LOG LEVELS
# ============================================================================


class LogLevel:
    """Log level constants with numeric values."""
    TRACE = 5
    DEBUG = logging.DEBUG      # 10
    INFO = logging.INFO        # 20
    WARNING = logging.WARNING  # 30
    ERROR = logging.ERROR      # 40
    CRITICAL = logging.CRITICAL  # 50
    AUDIT = 25  # Between INFO and WARNING for audit trail


# Add custom AUDIT level
logging.addLevelName(LogLevel.AUDIT, 'AUDIT')
logging.addLevelName(LogLevel.TRACE, 'TRACE')


# ============================================================================
# STRUCTURED LOG RECORD
# ============================================================================


@dataclass
class StructuredLogRecord:
    """Structured log record for CloudWatch and analysis."""
    
    timestamp: str
    level: str
    message: str
    logger: str
    correlation_id: str
    
    # Optional fields
    service: str = SERVICE_NAME
    version: str = VERSION
    environment: str = ENVIRONMENT
    
    # Context
    report_id: Optional[str] = None
    user_id: Optional[str] = None
    url: Optional[str] = None
    stage: Optional[str] = None
    
    # Performance
    duration_ms: Optional[float] = None
    
    # Error info
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    
    # Extra data
    extra: Dict[str, Any] = field(default_factory=dict)
    
    def to_json(self) -> str:
        """Convert to JSON string for CloudWatch."""
        data = {k: v for k, v in asdict(self).items() if v is not None}
        return json.dumps(data, default=str, ensure_ascii=False)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {k: v for k, v in asdict(self).items() if v is not None}


# ============================================================================
# JSON FORMATTER
# ============================================================================


class JSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.
    
    Outputs each log record as a single JSON line for CloudWatch Logs.
    """
    
    def __init__(self, mask_sensitive: bool = True):
        """
        Initialize JSON formatter.
        
        Args:
            mask_sensitive: Whether to mask sensitive data
        """
        super().__init__()
        self.mask_sensitive = mask_sensitive
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Get message
        message = record.getMessage()
        if self.mask_sensitive:
            message = mask_sensitive_data(message)
        
        # Build structured record
        log_record = StructuredLogRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=record.levelname,
            message=message,
            logger=record.name,
            correlation_id=get_correlation_id()
        )
        
        # Add request context
        context = get_request_context()
        if context:
            log_record.report_id = context.get('report_id')
            log_record.user_id = context.get('user_id')
            log_record.url = context.get('url')
            log_record.stage = context.get('stage')
        
        # Add extra attributes from record
        extra = {}
        for key in ['report_id', 'user_id', 'url', 'stage', 'duration_ms']:
            if hasattr(record, key):
                value = getattr(record, key)
                if value is not None:
                    if key == 'report_id':
                        log_record.report_id = value
                    elif key == 'user_id':
                        log_record.user_id = value
                    elif key == 'url':
                        log_record.url = value
                    elif key == 'stage':
                        log_record.stage = value
                    elif key == 'duration_ms':
                        log_record.duration_ms = value
        
        # Add exception info
        if record.exc_info:
            log_record.error_type = record.exc_info[0].__name__ if record.exc_info[0] else None
            log_record.error_message = str(record.exc_info[1]) if record.exc_info[1] else None
            log_record.stack_trace = ''.join(traceback.format_exception(*record.exc_info))
        
        # Add any remaining extra data
        skip_keys = {
            'message', 'args', 'created', 'filename', 'funcName',
            'levelname', 'levelno', 'lineno', 'module', 'msecs',
            'msg', 'name', 'pathname', 'process', 'processName',
            'relativeCreated', 'stack_info', 'thread', 'threadName',
            'exc_info', 'exc_text', 'report_id', 'user_id', 'url',
            'stage', 'duration_ms'
        }
        
        for key, value in record.__dict__.items():
            if key not in skip_keys and not key.startswith('_'):
                extra[key] = value
        
        if extra:
            log_record.extra = mask_dict_values(extra) if self.mask_sensitive else extra
        
        return log_record.to_json()


# ============================================================================
# STRUCTURED LOGGER
# ============================================================================


class StructuredLogger:
    """
    Structured logger with CloudWatch integration.
    
    Features:
    - JSON formatted output
    - Correlation ID tracking
    - Context propagation
    - Performance timing
    - Audit logging
    """
    
    def __init__(
        self,
        name: str,
        level: int = logging.INFO,
        json_output: bool = True,
        mask_sensitive: bool = True
    ):
        """
        Initialize structured logger.
        
        Args:
            name: Logger name
            level: Log level
            json_output: Output JSON format
            mask_sensitive: Mask sensitive data
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        self.logger.handlers = []  # Clear existing handlers
        
        # Configure handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        
        if json_output:
            handler.setFormatter(JSONFormatter(mask_sensitive=mask_sensitive))
        else:
            handler.setFormatter(logging.Formatter(
                '%(asctime)s | %(name)s | %(levelname)s | [%(correlation_id)s] %(message)s'
            ))
        
        self.logger.addHandler(handler)
        self.logger.propagate = False
    
    def _log(
        self,
        level: int,
        message: str,
        exc_info: bool = False,
        **kwargs
    ) -> None:
        """Internal log method with extra context."""
        # Add correlation ID to record
        kwargs['correlation_id'] = get_correlation_id()
        
        # Merge request context
        context = get_request_context()
        for key in ['report_id', 'user_id', 'url', 'stage']:
            if key not in kwargs and key in context:
                kwargs[key] = context[key]
        
        self.logger.log(level, message, exc_info=exc_info, extra=kwargs)
    
    def trace(self, message: str, **kwargs) -> None:
        """Log at TRACE level."""
        self._log(LogLevel.TRACE, message, **kwargs)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log at DEBUG level."""
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log at INFO level."""
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log at WARNING level."""
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, exc_info: bool = True, **kwargs) -> None:
        """Log at ERROR level."""
        self._log(logging.ERROR, message, exc_info=exc_info, **kwargs)
    
    def critical(self, message: str, exc_info: bool = True, **kwargs) -> None:
        """Log at CRITICAL level."""
        self._log(logging.CRITICAL, message, exc_info=exc_info, **kwargs)
    
    def audit(self, message: str, **kwargs) -> None:
        """Log at AUDIT level for compliance trail."""
        self._log(LogLevel.AUDIT, message, **kwargs)
    
    def exception(self, message: str, **kwargs) -> None:
        """Log exception with stack trace."""
        self._log(logging.ERROR, message, exc_info=True, **kwargs)
    
    @contextmanager
    def timed(
        self,
        operation: str,
        level: int = logging.INFO,
        **extra
    ) -> Iterator[None]:
        """
        Context manager for timing operations.
        
        Args:
            operation: Name of the operation being timed
            level: Log level for the timing message
            **extra: Extra context to include
        
        Yields:
            None
        """
        start_time = time.time()
        self._log(level, f"Starting: {operation}", **extra)
        
        try:
            yield
            duration_ms = (time.time() - start_time) * 1000
            self._log(
                level,
                f"Completed: {operation}",
                duration_ms=duration_ms,
                **extra
            )
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            self._log(
                logging.ERROR,
                f"Failed: {operation} - {str(e)}",
                duration_ms=duration_ms,
                exc_info=True,
                **extra
            )
            raise
    
    def log_scan_start(
        self,
        report_id: str,
        user_id: str,
        url: str,
        scan_config: Optional[Dict] = None
    ) -> None:
        """Log scan start event."""
        self.audit(
            f"Security audit started for {url}",
            report_id=report_id,
            user_id=user_id,
            url=url,
            event_type='scan_started',
            scan_config=scan_config
        )
    
    def log_scan_complete(
        self,
        report_id: str,
        user_id: str,
        url: str,
        security_score: float,
        grade: str,
        vulnerabilities_count: int,
        duration_seconds: float
    ) -> None:
        """Log scan completion event."""
        self.audit(
            f"Security audit completed for {url} - Grade: {grade}, Score: {security_score}",
            report_id=report_id,
            user_id=user_id,
            url=url,
            event_type='scan_completed',
            security_score=security_score,
            grade=grade,
            vulnerabilities_count=vulnerabilities_count,
            duration_ms=duration_seconds * 1000
        )
    
    def log_scan_failed(
        self,
        report_id: str,
        user_id: str,
        url: str,
        error: str,
        stage: str,
        credit_refunded: bool = False
    ) -> None:
        """Log scan failure event."""
        self.error(
            f"Security audit failed for {url} at stage '{stage}': {error}",
            report_id=report_id,
            user_id=user_id,
            url=url,
            event_type='scan_failed',
            stage=stage,
            error_message=error,
            credit_refunded=credit_refunded,
            exc_info=False
        )
    
    def log_stage_progress(
        self,
        report_id: str,
        stage: str,
        progress: int,
        message: str
    ) -> None:
        """Log stage progress update."""
        self.info(
            f"[{progress}%] {stage}: {message}",
            report_id=report_id,
            stage=stage,
            progress=progress
        )
    
    def log_vulnerability_found(
        self,
        report_id: str,
        vuln_type: str,
        severity: str,
        url: str,
        title: str
    ) -> None:
        """Log vulnerability discovery."""
        self.info(
            f"Vulnerability found: [{severity}] {vuln_type} - {title}",
            report_id=report_id,
            vulnerability_type=vuln_type,
            severity=severity,
            affected_url=url,
            title=title
        )


# ============================================================================
# DECORATOR FOR FUNCTION LOGGING
# ============================================================================


def log_function_call(
    logger: Optional[StructuredLogger] = None,
    level: int = logging.DEBUG,
    log_args: bool = True,
    log_result: bool = False,
    mask_args: bool = True
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to log function calls.
    
    Args:
        logger: Logger to use (creates default if not provided)
        level: Log level
        log_args: Whether to log function arguments
        log_result: Whether to log function result
        mask_args: Whether to mask sensitive data in arguments
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        nonlocal logger
        if logger is None:
            logger = StructuredLogger(func.__module__)
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            func_name = f"{func.__module__}.{func.__name__}"
            
            # Log function entry
            if log_args:
                logged_kwargs = mask_dict_values(kwargs) if mask_args else kwargs
                logger._log(
                    level,
                    f"Calling {func_name}",
                    function=func_name,
                    kwargs=logged_kwargs
                )
            else:
                logger._log(level, f"Calling {func_name}", function=func_name)
            
            # Execute function
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                # Log success
                if log_result:
                    logger._log(
                        level,
                        f"Completed {func_name}",
                        function=func_name,
                        duration_ms=duration_ms,
                        result=str(result)[:200]
                    )
                else:
                    logger._log(
                        level,
                        f"Completed {func_name}",
                        function=func_name,
                        duration_ms=duration_ms
                    )
                
                return result
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger._log(
                    logging.ERROR,
                    f"Failed {func_name}: {str(e)}",
                    function=func_name,
                    duration_ms=duration_ms,
                    exc_info=True
                )
                raise
        
        return wrapper
    
    return decorator


# ============================================================================
# METRICS COLLECTOR
# ============================================================================


class MetricsCollector:
    """
    Collect and aggregate metrics for monitoring.
    
    Features:
    - Counter metrics
    - Timing metrics
    - Gauge metrics
    - Periodic flushing
    """
    
    def __init__(self, logger: Optional[StructuredLogger] = None):
        """Initialize metrics collector."""
        self.logger = logger or StructuredLogger('metrics')
        self._counters: Dict[str, int] = {}
        self._timings: Dict[str, List[float]] = {}
        self._gauges: Dict[str, float] = {}
    
    def increment(self, metric: str, value: int = 1, tags: Optional[Dict] = None) -> None:
        """Increment a counter metric."""
        key = f"{metric}:{json.dumps(tags or {}, sort_keys=True)}"
        self._counters[key] = self._counters.get(key, 0) + value
    
    def timing(self, metric: str, value_ms: float, tags: Optional[Dict] = None) -> None:
        """Record a timing metric."""
        key = f"{metric}:{json.dumps(tags or {}, sort_keys=True)}"
        if key not in self._timings:
            self._timings[key] = []
        self._timings[key].append(value_ms)
    
    def gauge(self, metric: str, value: float, tags: Optional[Dict] = None) -> None:
        """Set a gauge metric."""
        key = f"{metric}:{json.dumps(tags or {}, sort_keys=True)}"
        self._gauges[key] = value
    
    @contextmanager
    def timed(self, metric: str, tags: Optional[Dict] = None) -> Iterator[None]:
        """Context manager for timing operations."""
        start_time = time.time()
        try:
            yield
        finally:
            duration_ms = (time.time() - start_time) * 1000
            self.timing(metric, duration_ms, tags)
    
    def flush(self) -> Dict[str, Any]:
        """Flush and return all metrics."""
        metrics = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'counters': dict(self._counters),
            'timings': {},
            'gauges': dict(self._gauges)
        }
        
        # Calculate timing statistics
        for key, values in self._timings.items():
            if values:
                metrics['timings'][key] = {
                    'count': len(values),
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                    'sum': sum(values)
                }
        
        # Log metrics
        self.logger.info(
            "Metrics flush",
            metrics=metrics
        )
        
        # Reset
        self._counters.clear()
        self._timings.clear()
        
        return metrics


# ============================================================================
# FACTORY FUNCTIONS
# ============================================================================


def get_logger(name: str = 'aivedha-guard') -> StructuredLogger:
    """
    Get or create a structured logger.
    
    Args:
        name: Logger name
    
    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(
        name=name,
        level=logging.DEBUG if ENVIRONMENT == 'development' else logging.INFO,
        json_output=ENVIRONMENT != 'development',
        mask_sensitive=True
    )


# Global logger instance
_default_logger: Optional[StructuredLogger] = None


def get_default_logger() -> StructuredLogger:
    """Get the default application logger."""
    global _default_logger
    if _default_logger is None:
        _default_logger = get_logger()
    return _default_logger


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Context management
    'get_correlation_id',
    'set_correlation_id',
    'get_request_context',
    'set_request_context',
    'logging_context',
    
    # Data masking
    'mask_sensitive_data',
    'mask_dict_values',
    
    # Log levels
    'LogLevel',
    
    # Structured logging
    'StructuredLogRecord',
    'JSONFormatter',
    'StructuredLogger',
    
    # Decorators
    'log_function_call',
    
    # Metrics
    'MetricsCollector',
    
    # Factory functions
    'get_logger',
    'get_default_logger'
]
