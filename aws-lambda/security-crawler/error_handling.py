"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  AiVedha Guard - Professional Error Handling & Circuit Breaker System        ║
║  Version: 5.1.0 "QUANTUM FORTRESS PRO"                                       ║
║                                                                              ║
║  Enterprise-grade error handling with:                                       ║
║  - Circuit breaker pattern for external service resilience                   ║
║  - Exponential backoff retry logic                                           ║
║  - Graceful degradation strategies                                           ║
║  - Comprehensive error categorization                                        ║
║  - Automatic credit refund on failure                                        ║
║                                                                              ║
║  Owner: Aravind Jayamohan                                                    ║
║  Company: AiVibe Software Services Pvt Ltd                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import functools
import logging
import random
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from threading import Lock
from typing import Any, Callable, Dict, Generic, Optional, TypeVar, Union

# ============================================================================
# LOGGING
# ============================================================================

logger = logging.getLogger('AiVedhaErrors')
logger.setLevel(logging.INFO)

# ============================================================================
# TYPE VARIABLES
# ============================================================================

T = TypeVar('T')
ExceptionType = TypeVar('ExceptionType', bound=Exception)

# ============================================================================
# ERROR CODES
# ============================================================================


class ErrorCode(Enum):
    """Standardized error codes for the application."""
    
    # Validation Errors (1000-1999)
    INVALID_URL = ("E1001", "Invalid URL provided")
    INVALID_USER_ID = ("E1002", "Invalid or missing user ID")
    INVALID_REPORT_ID = ("E1003", "Invalid or missing report ID")
    INVALID_PARAMETERS = ("E1004", "Invalid request parameters")
    URL_NOT_ACCESSIBLE = ("E1005", "URL is not accessible")
    BLOCKED_URL = ("E1006", "URL is blocked or blacklisted")
    INVALID_DOMAIN = ("E1007", "Invalid domain name")
    
    # Authentication/Authorization Errors (2000-2999)
    INSUFFICIENT_CREDITS = ("E2001", "Insufficient credits for audit")
    INVALID_SUBSCRIPTION = ("E2002", "Invalid or expired subscription")
    UNAUTHORIZED = ("E2003", "Unauthorized access")
    SESSION_EXPIRED = ("E2004", "Session has expired")
    RATE_LIMITED = ("E2005", "Rate limit exceeded")
    
    # External Service Errors (3000-3999)
    DNS_RESOLUTION_FAILED = ("E3001", "DNS resolution failed")
    SSL_CONNECTION_FAILED = ("E3002", "SSL/TLS connection failed")
    HTTP_REQUEST_FAILED = ("E3003", "HTTP request failed")
    API_TIMEOUT = ("E3004", "External API timeout")
    SERVICE_UNAVAILABLE = ("E3005", "External service unavailable")
    GEMINI_API_ERROR = ("E3006", "Gemini AI API error")
    S3_UPLOAD_FAILED = ("E3007", "S3 upload failed")
    DYNAMODB_ERROR = ("E3008", "DynamoDB operation failed")
    SES_EMAIL_FAILED = ("E3009", "Email sending failed")
    
    # Scan Errors (4000-4999)
    SCAN_TIMEOUT = ("E4001", "Scan timeout exceeded")
    SCAN_DEPTH_EXCEEDED = ("E4002", "Maximum scan depth exceeded")
    PAGES_LIMIT_EXCEEDED = ("E4003", "Maximum pages limit exceeded")
    CRAWLER_BLOCKED = ("E4004", "Crawler blocked by robots.txt or WAF")
    CONTENT_TOO_LARGE = ("E4005", "Content too large to process")
    UNSUPPORTED_CONTENT = ("E4006", "Unsupported content type")
    
    # PDF Generation Errors (5000-5999)
    PDF_GENERATION_FAILED = ("E5001", "PDF report generation failed")
    PDF_TEMPLATE_ERROR = ("E5002", "PDF template error")
    LOGO_LOAD_FAILED = ("E5003", "Failed to load logo for PDF")
    PDF_TOO_LARGE = ("E5004", "Generated PDF exceeds size limit")
    
    # Internal Errors (9000-9999)
    INTERNAL_ERROR = ("E9001", "Internal server error")
    CONFIGURATION_ERROR = ("E9002", "Configuration error")
    DEPENDENCY_ERROR = ("E9003", "Dependency not available")
    UNEXPECTED_ERROR = ("E9999", "Unexpected error occurred")
    
    def __init__(self, code: str, message: str):
        self._code = code
        self._message = message
    
    @property
    def code(self) -> str:
        return self._code
    
    @property
    def message(self) -> str:
        return self._message


# ============================================================================
# CUSTOM EXCEPTIONS
# ============================================================================


@dataclass
class AuditError(Exception):
    """Base exception for all audit-related errors."""
    
    error_code: ErrorCode
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    cause: Optional[Exception] = None
    recoverable: bool = True
    should_refund_credit: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def __post_init__(self):
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            'error': True,
            'errorCode': self.error_code.code,
            'errorType': self.error_code.name,
            'message': self.message,
            'details': self.details,
            'recoverable': self.recoverable,
            'creditRefunded': self.should_refund_credit,
            'timestamp': self.timestamp
        }
    
    def __str__(self) -> str:
        return f"[{self.error_code.code}] {self.message}"


class ValidationError(AuditError):
    """Raised when input validation fails."""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        field: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.pop('details', {})
        if field:
            details['field'] = field
        super().__init__(
            error_code=error_code,
            message=message,
            details=details,
            recoverable=False,
            should_refund_credit=True,
            **kwargs
        )


class ExternalServiceError(AuditError):
    """Raised when an external service fails."""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        service: str,
        status_code: Optional[int] = None,
        **kwargs
    ):
        details = kwargs.pop('details', {})
        details['service'] = service
        if status_code:
            details['statusCode'] = status_code
        super().__init__(
            error_code=error_code,
            message=message,
            details=details,
            recoverable=True,
            should_refund_credit=True,
            **kwargs
        )


class ScanError(AuditError):
    """Raised when a scan operation fails."""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        stage: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.pop('details', {})
        if stage:
            details['stage'] = stage
        super().__init__(
            error_code=error_code,
            message=message,
            details=details,
            recoverable=True,
            should_refund_credit=True,
            **kwargs
        )


class PDFGenerationError(AuditError):
    """Raised when PDF generation fails."""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        **kwargs
    ):
        super().__init__(
            error_code=error_code,
            message=message,
            recoverable=False,
            should_refund_credit=True,
            **kwargs
        )


class CreditError(AuditError):
    """Raised when credit operations fail."""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        credits_available: int = 0,
        credits_required: int = 1,
        **kwargs
    ):
        details = kwargs.pop('details', {})
        details['creditsAvailable'] = credits_available
        details['creditsRequired'] = credits_required
        super().__init__(
            error_code=error_code,
            message=message,
            details=details,
            recoverable=False,
            should_refund_credit=False,
            **kwargs
        )


# ============================================================================
# CIRCUIT BREAKER
# ============================================================================


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5          # Failures before opening
    success_threshold: int = 2          # Successes to close from half-open
    timeout_seconds: float = 30.0       # Time before trying half-open
    excluded_exceptions: tuple = ()     # Exceptions that don't count as failures


class CircuitBreaker:
    """
    Circuit breaker pattern implementation for external service resilience.
    
    Prevents cascading failures by stopping calls to failing services
    and allowing them time to recover.
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ):
        """
        Initialize circuit breaker.
        
        Args:
            name: Name identifier for this circuit breaker
            config: Configuration options
        """
        self.name = name
        self.config = config or CircuitBreakerConfig()
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._lock = Lock()
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if timeout has passed
                if self._last_failure_time:
                    elapsed = time.time() - self._last_failure_time
                    if elapsed >= self.config.timeout_seconds:
                        self._state = CircuitState.HALF_OPEN
                        self._success_count = 0
                        logger.info(f"Circuit '{self.name}' transitioning to HALF_OPEN")
            return self._state
    
    def record_success(self) -> None:
        """Record a successful call."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.config.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    logger.info(f"Circuit '{self.name}' CLOSED after recovery")
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                self._failure_count = 0
    
    def record_failure(self, exception: Exception) -> None:
        """Record a failed call."""
        # Check if exception should be excluded
        if isinstance(exception, self.config.excluded_exceptions):
            return
        
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._state == CircuitState.HALF_OPEN:
                # Immediately open on failure in half-open
                self._state = CircuitState.OPEN
                logger.warning(f"Circuit '{self.name}' OPENED (failed in half-open)")
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.config.failure_threshold:
                    self._state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit '{self.name}' OPENED after {self._failure_count} failures"
                    )
    
    def is_available(self) -> bool:
        """Check if the circuit allows calls."""
        current_state = self.state  # This may transition state
        return current_state != CircuitState.OPEN
    
    def __call__(self, func: Callable[..., T]) -> Callable[..., T]:
        """Decorator to wrap function with circuit breaker."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            if not self.is_available():
                raise ExternalServiceError(
                    error_code=ErrorCode.SERVICE_UNAVAILABLE,
                    message=f"Circuit breaker '{self.name}' is OPEN",
                    service=self.name
                )
            
            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                self.record_failure(e)
                raise
        
        return wrapper
    
    def reset(self) -> None:
        """Manually reset the circuit breaker."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = None
            logger.info(f"Circuit '{self.name}' manually reset")


# ============================================================================
# CIRCUIT BREAKER REGISTRY
# ============================================================================


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers."""

    _instance: Optional['CircuitBreakerRegistry'] = None
    _lock = Lock()
    _breakers: Dict[str, 'CircuitBreaker']

    def __new__(cls) -> 'CircuitBreakerRegistry':
        """Singleton pattern."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._breakers = {}
        return cls._instance
    
    def get(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Get or create a circuit breaker."""
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(name, config)
        return self._breakers[name]
    
    def get_all_states(self) -> Dict[str, str]:
        """Get states of all circuit breakers."""
        return {name: cb.state.value for name, cb in self._breakers.items()}
    
    def reset_all(self) -> None:
        """Reset all circuit breakers."""
        for cb in self._breakers.values():
            cb.reset()


# Global registry instance
circuit_registry = CircuitBreakerRegistry()


# ============================================================================
# RETRY DECORATOR WITH EXPONENTIAL BACKOFF
# ============================================================================


@dataclass
class RetryConfig:
    """Configuration for retry logic."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    exponential_base: float = 2.0
    jitter: bool = True
    retryable_exceptions: tuple = (Exception,)
    non_retryable_exceptions: tuple = ()


def calculate_backoff(
    attempt: int,
    base_delay: float,
    max_delay: float,
    exponential_base: float,
    jitter: bool
) -> float:
    """Calculate backoff delay for retry attempt."""
    delay = min(base_delay * (exponential_base ** attempt), max_delay)
    if jitter:
        delay = delay * (0.5 + random.random())
    return delay


def retry_with_backoff(
    config: Optional[RetryConfig] = None,
    **config_kwargs
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for retrying functions with exponential backoff.
    
    Args:
        config: RetryConfig instance
        **config_kwargs: Individual config options
    
    Returns:
        Decorated function
    """
    if config is None:
        config = RetryConfig(**config_kwargs)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception: Optional[Exception] = None
            
            for attempt in range(config.max_attempts):
                try:
                    return func(*args, **kwargs)
                except config.non_retryable_exceptions as e:
                    # Don't retry these exceptions
                    raise
                except config.retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt < config.max_attempts - 1:
                        delay = calculate_backoff(
                            attempt,
                            config.base_delay,
                            config.max_delay,
                            config.exponential_base,
                            config.jitter
                        )
                        logger.warning(
                            f"Retry {attempt + 1}/{config.max_attempts} for {func.__name__} "
                            f"after {delay:.2f}s: {e}"
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"All {config.max_attempts} retries failed for {func.__name__}: {e}"
                        )
            
            if last_exception:
                raise last_exception
            raise RuntimeError(f"Retry failed for {func.__name__}")
        
        return wrapper
    
    return decorator


# ============================================================================
# GRACEFUL DEGRADATION
# ============================================================================


class GracefulDegradation(Generic[T]):
    """
    Provides fallback values when operations fail.
    
    Example:
        @graceful_degradation.with_fallback({'score': 0, 'grade': 'N/A'})
        def get_security_score():
            ...
    """
    
    def with_fallback(
        self,
        fallback_value: T,
        log_warning: bool = True
    ) -> Callable[[Callable[..., T]], Callable[..., T]]:
        """
        Decorator that provides a fallback value on failure.
        
        Args:
            fallback_value: Value to return if function fails
            log_warning: Whether to log a warning on fallback
        
        Returns:
            Decorated function
        """
        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @functools.wraps(func)
            def wrapper(*args, **kwargs) -> T:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if log_warning:
                        logger.warning(
                            f"Function {func.__name__} failed, using fallback: {e}"
                        )
                    return fallback_value
            
            return wrapper
        
        return decorator
    
    def with_factory(
        self,
        fallback_factory: Callable[[], T],
        log_warning: bool = True
    ) -> Callable[[Callable[..., T]], Callable[..., T]]:
        """
        Decorator that provides a fallback from a factory function.
        
        Args:
            fallback_factory: Function that creates fallback value
            log_warning: Whether to log a warning on fallback
        
        Returns:
            Decorated function
        """
        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @functools.wraps(func)
            def wrapper(*args, **kwargs) -> T:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if log_warning:
                        logger.warning(
                            f"Function {func.__name__} failed, using fallback factory: {e}"
                        )
                    return fallback_factory()
            
            return wrapper
        
        return decorator


graceful_degradation = GracefulDegradation()


# ============================================================================
# ERROR HANDLER CONTEXT MANAGER
# ============================================================================


class ErrorHandler:
    """
    Context manager for comprehensive error handling.
    
    Example:
        with ErrorHandler(report_id, user_id) as handler:
            handler.stage = 'ssl_analysis'
            ... perform operations ...
    """
    
    def __init__(
        self,
        report_id: str,
        user_id: str,
        refund_on_error: bool = True,
        log_errors: bool = True
    ):
        """
        Initialize error handler.
        
        Args:
            report_id: Report identifier for context
            user_id: User identifier for credit refunds
            refund_on_error: Whether to trigger credit refund on error
            log_errors: Whether to log errors
        """
        self.report_id = report_id
        self.user_id = user_id
        self.refund_on_error = refund_on_error
        self.log_errors = log_errors
        self.stage: Optional[str] = None
        self.error: Optional[AuditError] = None
        self._refund_callback: Optional[Callable[[str, str, str], bool]] = None
    
    def set_refund_callback(
        self,
        callback: Callable[[str, str, str], bool]
    ) -> 'ErrorHandler':
        """Set the callback for credit refunds."""
        self._refund_callback = callback
        return self
    
    def __enter__(self) -> 'ErrorHandler':
        return self
    
    def __exit__(
        self,
        _exc_type: Optional[type],
        exc_val: Optional[Exception],
        _exc_tb: Optional[Any]
    ) -> bool:
        """Handle any exceptions that occurred."""
        if exc_val is None:
            return False
        
        # Convert to AuditError if needed
        if isinstance(exc_val, AuditError):
            self.error = exc_val
        else:
            self.error = AuditError(
                error_code=ErrorCode.UNEXPECTED_ERROR,
                message=str(exc_val),
                details={
                    'exceptionType': type(exc_val).__name__,
                    'stage': self.stage,
                    'traceback': traceback.format_exc()
                },
                cause=exc_val,
                recoverable=False,
                should_refund_credit=True
            )
        
        # Log the error
        if self.log_errors:
            logger.error(
                f"[{self.report_id}] Error in stage '{self.stage}': {self.error}",
                exc_info=True
            )
        
        # Attempt credit refund
        if self.refund_on_error and self.error.should_refund_credit:
            if self._refund_callback:
                try:
                    refunded = self._refund_callback(
                        self.user_id,
                        self.report_id,
                        f"Error: {self.error.error_code.code}"
                    )
                    self.error.details['creditRefunded'] = refunded
                    if refunded:
                        logger.info(f"[{self.report_id}] Credit refunded for user {self.user_id}")
                except Exception as refund_error:
                    logger.error(f"[{self.report_id}] Failed to refund credit: {refund_error}")
                    self.error.details['creditRefunded'] = False
                    self.error.details['refundError'] = str(refund_error)
        
        # Don't suppress the exception
        return False


# ============================================================================
# SAFE EXECUTION UTILITIES
# ============================================================================


def safe_execute(
    func: Callable[..., T],
    *args,
    default: T = None,
    error_handler: Optional[Callable[[Exception], None]] = None,
    **kwargs
) -> T:
    """
    Safely execute a function, returning default on failure.
    
    Args:
        func: Function to execute
        *args: Positional arguments
        default: Default value on failure
        error_handler: Optional callback for errors
        **kwargs: Keyword arguments
    
    Returns:
        Function result or default value
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        if error_handler:
            error_handler(e)
        else:
            logger.warning(f"safe_execute caught exception in {func.__name__}: {e}")
        return default


async def async_safe_execute(
    func: Callable[..., T],
    *args,
    default: T = None,
    error_handler: Optional[Callable[[Exception], None]] = None,
    **kwargs
) -> T:
    """Async version of safe_execute."""
    try:
        return await func(*args, **kwargs)
    except Exception as e:
        if error_handler:
            error_handler(e)
        else:
            logger.warning(f"async_safe_execute caught exception in {func.__name__}: {e}")
        return default


# ============================================================================
# ERROR RESPONSE BUILDER
# ============================================================================


def build_error_response(
    error: Union[AuditError, Exception],
    report_id: Optional[str] = None,
    status_code: int = 500
) -> Dict[str, Any]:
    """
    Build a standardized error response for API Gateway.
    
    Args:
        error: The error to convert
        report_id: Optional report ID for context
        status_code: HTTP status code
    
    Returns:
        Error response dictionary
    """
    if isinstance(error, AuditError):
        body = error.to_dict()
    else:
        body = {
            'error': True,
            'errorCode': ErrorCode.UNEXPECTED_ERROR.code,
            'errorType': 'UNEXPECTED_ERROR',
            'message': str(error),
            'details': {
                'exceptionType': type(error).__name__
            },
            'recoverable': False,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    if report_id:
        body['reportId'] = report_id
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://aivedha.ai',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': body
    }


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Enums
    'ErrorCode',
    'CircuitState',
    
    # Exceptions
    'AuditError',
    'ValidationError',
    'ExternalServiceError',
    'ScanError',
    'PDFGenerationError',
    'CreditError',
    
    # Circuit Breaker
    'CircuitBreaker',
    'CircuitBreakerConfig',
    'CircuitBreakerRegistry',
    'circuit_registry',
    
    # Retry
    'RetryConfig',
    'retry_with_backoff',
    'calculate_backoff',
    
    # Graceful Degradation
    'GracefulDegradation',
    'graceful_degradation',
    
    # Error Handler
    'ErrorHandler',
    
    # Utilities
    'safe_execute',
    'async_safe_execute',
    'build_error_response'
]
