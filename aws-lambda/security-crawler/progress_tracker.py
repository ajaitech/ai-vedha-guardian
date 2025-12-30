"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  AiVedha Guard - Real-Time Progress Tracking System                          ║
║  Version: 5.1.0 "QUANTUM FORTRESS PRO"                                       ║
║                                                                              ║
║  Provides granular, real-time progress updates for security audits           ║
║  with WebSocket-compatible event emission and DynamoDB persistence.          ║
║                                                                              ║
║  Owner: Aravind Jayamohan                                                    ║
║  Company: AiVibe Software Services Pvt Ltd                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logger = logging.getLogger('AiVedhaProgress')
logger.setLevel(logging.INFO)

# ============================================================================
# ENUMS
# ============================================================================


class ScanStage(Enum):
    """Enumeration of all scan stages with metadata."""
    
    # Initialization Phase (0-10%)
    QUEUED = ("queued", 0, "Audit queued for processing")
    INITIALIZING = ("initializing", 2, "Initializing scan environment")
    VALIDATING_URL = ("validating_url", 5, "Validating target URL")
    CHECKING_CREDITS = ("checking_credits", 7, "Verifying account credits")
    
    # Discovery Phase (10-40%)
    DNS_RESOLUTION = ("dns_resolution", 10, "Resolving DNS records")
    DNS_SECURITY = ("dns_security", 15, "Analyzing DNS security (SPF, DKIM, DMARC)")
    SSL_HANDSHAKE = ("ssl_handshake", 18, "Establishing SSL/TLS connection")
    SSL_ANALYSIS = ("ssl_analysis", 22, "Deep SSL/TLS configuration analysis")
    CERTIFICATE_CHAIN = ("certificate_chain", 25, "Validating certificate chain")
    
    # Crawling Phase (40-55%)
    CRAWLING_INIT = ("crawling_init", 40, "Initializing web crawler")
    CRAWLING = ("crawling", 45, "Crawling website pages")
    ASSET_DISCOVERY = ("asset_discovery", 50, "Discovering assets and endpoints")
    API_DISCOVERY = ("api_discovery", 55, "Discovering API endpoints")
    
    # Analysis Phase (55-85%)
    HEADER_ANALYSIS = ("header_analysis", 58, "Analyzing security headers")
    COOKIE_ANALYSIS = ("cookie_analysis", 61, "Analyzing cookie security")
    FORM_ANALYSIS = ("form_analysis", 64, "Analyzing form security")
    JS_ANALYSIS = ("js_analysis", 67, "Analyzing JavaScript libraries")
    SENSITIVE_FILES = ("sensitive_files", 70, "Scanning for exposed files")
    VULNERABILITY_SCAN = ("vulnerability_scan", 75, "Running vulnerability detectors")
    XSS_DETECTION = ("xss_detection", 78, "Testing for XSS vulnerabilities")
    SQLI_DETECTION = ("sqli_detection", 81, "Testing for SQL injection")
    CORS_ANALYSIS = ("cors_analysis", 84, "Analyzing CORS configuration")
    
    # AI Analysis Phase (85-92%)
    AI_ANALYSIS = ("ai_analysis", 87, "AI-powered vulnerability analysis")
    ATTACK_CHAIN = ("attack_chain", 90, "Synthesizing attack chains")
    
    # Completion Phase (92-100%)
    SCORING = ("scoring", 92, "Calculating security score")
    GENERATING_REPORT = ("generating_report", 94, "Generating PDF report")
    UPLOADING_REPORT = ("uploading_report", 97, "Uploading report to cloud")
    SENDING_EMAIL = ("sending_email", 98, "Sending notification email")
    COMPLETED = ("completed", 100, "Audit completed successfully")
    FAILED = ("failed", -1, "Audit failed")
    
    def __init__(self, stage_id: str, base_progress: int, description: str):
        self.stage_id = stage_id
        self.base_progress = base_progress
        self.description = description
    
    @property
    def is_terminal(self) -> bool:
        """Check if this is a terminal stage."""
        return self in (ScanStage.COMPLETED, ScanStage.FAILED)


@dataclass
class ProgressEvent:
    """Represents a single progress update event."""
    
    report_id: str
    stage: ScanStage
    progress: int
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    details: Dict[str, Any] = field(default_factory=dict)
    substep: Optional[str] = None
    substep_progress: float = 0.0
    items_processed: int = 0
    items_total: int = 0
    eta_seconds: Optional[int] = None
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'reportId': self.report_id,
            'stage': self.stage.stage_id,
            'progress': self.progress,
            'message': self.message,
            'timestamp': self.timestamp,
            'details': self.details,
            'substep': self.substep,
            'substepProgress': self.substep_progress,
            'itemsProcessed': self.items_processed,
            'itemsTotal': self.items_total,
            'etaSeconds': self.eta_seconds,
            'correlationId': self.correlation_id
        }
    
    def to_dynamodb_item(self) -> Dict[str, Any]:
        """Convert to DynamoDB item format."""
        return {
            'reportId': self.report_id,
            'currentStage': self.stage.stage_id,
            'stageDescription': self.stage.description,
            'progress': self.progress,
            'message': self.message,
            'updatedAt': self.timestamp,
            'progressDetails': json.dumps(self.details),
            'substep': self.substep or '',
            'substepProgress': Decimal(str(self.substep_progress)),
            'itemsProcessed': self.items_processed,
            'itemsTotal': self.items_total,
            'etaSeconds': self.eta_seconds,
            'correlationId': self.correlation_id
        }


class ProgressTracker:
    """
    Real-time progress tracking system for security audits.
    
    Features:
    - Granular stage-by-stage progress updates
    - Substep tracking within stages
    - ETA calculation
    - DynamoDB persistence
    - WebSocket-compatible event emission
    - Automatic progress interpolation
    """
    
    def __init__(
        self,
        report_id: str,
        user_id: str,
        dynamodb_table: str = 'aivedha-guardian-audit-reports',
        enable_persistence: bool = True,
        on_progress: Optional[Callable[[ProgressEvent], None]] = None
    ):
        """
        Initialize the progress tracker.
        
        Args:
            report_id: Unique identifier for the audit report
            user_id: User ID for the audit
            dynamodb_table: DynamoDB table name for persistence
            enable_persistence: Whether to persist updates to DynamoDB
            on_progress: Optional callback for progress updates
        """
        self.report_id = report_id
        self.user_id = user_id
        self.dynamodb_table = dynamodb_table
        self.enable_persistence = enable_persistence
        self.on_progress = on_progress
        
        # State tracking
        self.current_stage = ScanStage.QUEUED
        self.current_progress = 0
        self.start_time = time.time()
        self.stage_start_time = time.time()
        self.history: List[ProgressEvent] = []
        
        # Stage timing for ETA calculation
        self.stage_timings: Dict[str, float] = {}
        self.average_stage_duration: float = 5.0  # Default 5 seconds per stage
        
        # AWS clients (lazy initialization)
        self._dynamodb = None
        self._table = None
    
    @property
    def dynamodb(self):
        """Lazy-load DynamoDB resource."""
        if self._dynamodb is None:
            config = BotoConfig(
                retries={'max_attempts': 3, 'mode': 'adaptive'},
                connect_timeout=5,
                read_timeout=10
            )
            # CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
            self._dynamodb = boto3.resource('dynamodb', region_name='us-east-1', config=config)
        return self._dynamodb
    
    @property
    def table(self):
        """Lazy-load DynamoDB table."""
        if self._table is None:
            self._table = self.dynamodb.Table(self.dynamodb_table)
        return self._table
    
    def calculate_progress(
        self,
        stage: ScanStage,
        substep_progress: float = 0.0
    ) -> int:
        """
        Calculate overall progress based on stage and substep.
        
        Args:
            stage: Current scan stage
            substep_progress: Progress within current stage (0.0 to 1.0)
        
        Returns:
            Overall progress percentage (0-100)
        """
        if stage == ScanStage.FAILED:
            return self.current_progress  # Keep last known progress
        
        if stage == ScanStage.COMPLETED:
            return 100
        
        # Get base progress for current stage
        base = stage.base_progress
        
        # Find next stage to calculate range
        stages = list(ScanStage)
        current_idx = stages.index(stage)
        
        if current_idx < len(stages) - 2:  # Not at terminal stages
            next_stage = stages[current_idx + 1]
            if next_stage.base_progress > 0:
                progress_range = next_stage.base_progress - base
                interpolated = base + int(progress_range * substep_progress)
                return min(interpolated, 99)  # Never reach 100 until completed
        
        return base
    
    def calculate_eta(self) -> Optional[int]:
        """
        Calculate estimated time to completion in seconds.
        
        Returns:
            Estimated seconds remaining, or None if unable to calculate
        """
        if not self.stage_timings:
            # Default estimate based on average stage duration
            remaining_stages = 100 - self.current_progress
            return int((remaining_stages / 5) * self.average_stage_duration)
        
        # Calculate based on historical stage timings
        elapsed = time.time() - self.start_time
        if self.current_progress > 0:
            rate = elapsed / self.current_progress
            remaining = 100 - self.current_progress
            return int(rate * remaining)
        
        return None
    
    def update(
        self,
        stage: ScanStage,
        message: Optional[str] = None,
        substep: Optional[str] = None,
        substep_progress: float = 0.0,
        items_processed: int = 0,
        items_total: int = 0,
        details: Optional[Dict[str, Any]] = None
    ) -> ProgressEvent:
        """
        Update progress with a new stage or substep.
        
        Args:
            stage: Current scan stage
            message: Optional custom message
            substep: Optional substep description
            substep_progress: Progress within current stage (0.0 to 1.0)
            items_processed: Number of items processed in current stage
            items_total: Total items to process in current stage
            details: Optional additional details
        
        Returns:
            The created ProgressEvent
        """
        # Track stage timing
        if stage != self.current_stage:
            stage_duration = time.time() - self.stage_start_time
            self.stage_timings[self.current_stage.stage_id] = stage_duration
            self.stage_start_time = time.time()
            
            # Update average stage duration
            if self.stage_timings:
                self.average_stage_duration = sum(self.stage_timings.values()) / len(self.stage_timings)
        
        self.current_stage = stage
        
        # Calculate overall progress
        progress = self.calculate_progress(stage, substep_progress)
        self.current_progress = progress
        
        # Calculate ETA
        eta = self.calculate_eta()
        
        # Create event
        event = ProgressEvent(
            report_id=self.report_id,
            stage=stage,
            progress=progress,
            message=message or stage.description,
            details=details or {},
            substep=substep,
            substep_progress=substep_progress,
            items_processed=items_processed,
            items_total=items_total,
            eta_seconds=eta
        )
        
        # Record in history
        self.history.append(event)
        
        # Persist to DynamoDB
        if self.enable_persistence:
            self._persist_progress(event)
        
        # Emit callback
        if self.on_progress:
            try:
                self.on_progress(event)
            except Exception as e:
                logger.warning(f"Progress callback failed: {e}")
        
        # Log progress
        logger.info(
            f"[{self.report_id}] {progress}% - {stage.stage_id}: {message or stage.description}"
            f"{f' ({items_processed}/{items_total})' if items_total > 0 else ''}"
        )
        
        return event
    
    def _persist_progress(self, event: ProgressEvent) -> bool:
        """
        Persist progress update to DynamoDB.
        
        Args:
            event: Progress event to persist
        
        Returns:
            True if successful, False otherwise
        """
        try:
            update_expression = """
                SET currentStage = :stage,
                    stageDescription = :stageDesc,
                    progress = :progress,
                    #msg = :message,
                    updatedAt = :updatedAt,
                    progressDetails = :details,
                    substep = :substep,
                    substepProgress = :substepProgress,
                    itemsProcessed = :itemsProcessed,
                    itemsTotal = :itemsTotal,
                    etaSeconds = :eta
            """
            
            expression_values = {
                ':stage': event.stage.stage_id,
                ':stageDesc': event.stage.description,
                ':progress': event.progress,
                ':message': event.message,
                ':updatedAt': event.timestamp,
                ':details': json.dumps(event.details) if event.details else '{}',
                ':substep': event.substep or '',
                ':substepProgress': Decimal(str(event.substep_progress)),
                ':itemsProcessed': event.items_processed,
                ':itemsTotal': event.items_total,
                ':eta': event.eta_seconds
            }
            
            self.table.update_item(
                Key={'report_id': self.report_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames={'#msg': 'message'},
                ExpressionAttributeValues=expression_values
            )
            
            return True
            
        except ClientError as e:
            logger.error(f"Failed to persist progress to DynamoDB: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error persisting progress: {e}")
            return False
    
    def complete(
        self,
        security_score: float,
        grade: str,
        vulnerabilities_count: int,
        pdf_url: Optional[str] = None
    ) -> ProgressEvent:
        """
        Mark the audit as completed.
        
        Args:
            security_score: Final security score
            grade: Final security grade
            vulnerabilities_count: Total vulnerabilities found
            pdf_url: URL to the PDF report
        
        Returns:
            Final ProgressEvent
        """
        duration = time.time() - self.start_time
        
        return self.update(
            stage=ScanStage.COMPLETED,
            message=f"Audit completed successfully in {duration:.1f}s",
            details={
                'securityScore': security_score,
                'grade': grade,
                'vulnerabilitiesCount': vulnerabilities_count,
                'pdfUrl': pdf_url,
                'durationSeconds': round(duration, 2),
                'stageTimings': {k: round(v, 2) for k, v in self.stage_timings.items()}
            }
        )
    
    def fail(
        self,
        error_message: str,
        error_code: Optional[str] = None,
        failed_stage: Optional[str] = None,
        credit_refunded: bool = False
    ) -> ProgressEvent:
        """
        Mark the audit as failed.
        
        Args:
            error_message: Human-readable error message
            error_code: Optional error code
            failed_stage: Stage where failure occurred
            credit_refunded: Whether credits were refunded
        
        Returns:
            Final ProgressEvent
        """
        duration = time.time() - self.start_time
        
        return self.update(
            stage=ScanStage.FAILED,
            message=f"Audit failed: {error_message}",
            details={
                'errorMessage': error_message,
                'errorCode': error_code,
                'failedStage': failed_stage or self.current_stage.stage_id,
                'creditRefunded': credit_refunded,
                'durationSeconds': round(duration, 2)
            }
        )
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of the progress tracking.
        
        Returns:
            Summary dictionary
        """
        return {
            'reportId': self.report_id,
            'userId': self.user_id,
            'currentStage': self.current_stage.stage_id,
            'currentProgress': self.current_progress,
            'stageDescription': self.current_stage.description,
            'durationSeconds': round(time.time() - self.start_time, 2),
            'stageCount': len(self.history),
            'stageTimings': {k: round(v, 2) for k, v in self.stage_timings.items()},
            'isComplete': self.current_stage.is_terminal
        }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================


def create_progress_tracker(
    report_id: str,
    user_id: str,
    on_progress: Optional[Callable[[ProgressEvent], None]] = None
) -> ProgressTracker:
    """
    Factory function to create a ProgressTracker instance.
    
    Args:
        report_id: Unique report identifier
        user_id: User identifier
        on_progress: Optional callback for progress updates
    
    Returns:
        Configured ProgressTracker instance
    """
    return ProgressTracker(
        report_id=report_id,
        user_id=user_id,
        enable_persistence=True,
        on_progress=on_progress
    )


def get_progress_from_dynamodb(report_id: str, table_name: str = 'aivedha-guardian-audit-reports') -> Optional[Dict[str, Any]]:
    """
    Get current progress for a report from DynamoDB.
    
    Args:
        report_id: Report identifier
        table_name: DynamoDB table name
    
    Returns:
        Progress data or None if not found
    """
    try:
        # CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.Table(table_name)
        
        response = table.get_item(
            Key={'report_id': report_id},
            ProjectionExpression='currentStage, progress, stageDescription, #msg, updatedAt, etaSeconds',
            ExpressionAttributeNames={'#msg': 'message'}
        )
        
        if 'Item' in response:
            return response['Item']
        return None
        
    except Exception as e:
        logger.error(f"Failed to get progress from DynamoDB: {e}")
        return None


# ============================================================================
# STAGE HELPERS - Convenience methods for common stage updates
# ============================================================================


class StageHelpers:
    """Helper methods for updating specific stages with appropriate details."""
    
    @staticmethod
    def crawling(
        tracker: ProgressTracker,
        pages_crawled: int,
        pages_total: int,
        current_url: Optional[str] = None
    ) -> ProgressEvent:
        """Update crawling progress."""
        substep_progress = pages_crawled / max(pages_total, 1)
        return tracker.update(
            stage=ScanStage.CRAWLING,
            message=f"Crawling pages ({pages_crawled}/{pages_total})",
            substep=current_url,
            substep_progress=substep_progress,
            items_processed=pages_crawled,
            items_total=pages_total,
            details={'currentUrl': current_url}
        )
    
    @staticmethod
    def vulnerability_scan(
        tracker: ProgressTracker,
        detectors_run: int,
        detectors_total: int,
        current_detector: str
    ) -> ProgressEvent:
        """Update vulnerability scanning progress."""
        substep_progress = detectors_run / max(detectors_total, 1)
        return tracker.update(
            stage=ScanStage.VULNERABILITY_SCAN,
            message=f"Running {current_detector} detector",
            substep=current_detector,
            substep_progress=substep_progress,
            items_processed=detectors_run,
            items_total=detectors_total
        )
    
    @staticmethod
    def sensitive_files(
        tracker: ProgressTracker,
        files_checked: int,
        files_total: int,
        files_found: int
    ) -> ProgressEvent:
        """Update sensitive file scanning progress."""
        substep_progress = files_checked / max(files_total, 1)
        return tracker.update(
            stage=ScanStage.SENSITIVE_FILES,
            message=f"Checking sensitive paths ({files_checked}/{files_total})",
            substep_progress=substep_progress,
            items_processed=files_checked,
            items_total=files_total,
            details={'sensitiveFilesFound': files_found}
        )


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'ScanStage',
    'ProgressEvent',
    'ProgressTracker',
    'StageHelpers',
    'create_progress_tracker',
    'get_progress_from_dynamodb'
]
