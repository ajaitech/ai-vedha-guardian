"""
AiVedha Guard - Pytest Shared Fixtures
Version: 4.0.0

Shared fixtures and configuration for all test modules.

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import pytest
import os
import json
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

# Set up environment variables for testing
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')
os.environ.setdefault('DYNAMODB_REPORTS_TABLE', 'aivedha-guardian-audit-reports')
os.environ.setdefault('S3_REPORTS_BUCKET', 'aivedha-guardian-reports-us-east-1')


# ============================================================================
# Session-Scoped Fixtures
# ============================================================================

@pytest.fixture(scope='session')
def test_user_id():
    """Generate a unique test user ID for the session."""
    return f'test-user-{uuid.uuid4().hex[:8]}'


@pytest.fixture(scope='session')
def test_audit_id():
    """Generate a unique test audit ID for the session."""
    return f'{uuid.uuid4()}'


# ============================================================================
# Function-Scoped Fixtures
# ============================================================================

@pytest.fixture
def sample_audit_request():
    """Sample v4.0.0 audit request."""
    return {
        'url': 'https://example.com',
        'userId': 'test-user-123',
        'userEmail': 'test@example.com',
        'userName': 'Test User',
        'auditMetadata': {
            'source': 'test_suite',
            'timestamp': datetime.utcnow().isoformat(),
            'consentAccepted': True,
            'clientVersion': '4.0.0'
        },
        'augmentationMode': 'parallel-augment',
        'scanDepth': 'standard'
    }


@pytest.fixture
def sample_legacy_request():
    """Sample v3.x legacy audit request."""
    return {
        'url': 'https://example.com',
        'user_id': 'test-user-legacy'
    }


@pytest.fixture
def sample_audit_response():
    """Sample v4.0.0 audit response."""
    return {
        'statusCode': 200,
        'body': json.dumps({
            'report_id': f'rpt-{uuid.uuid4().hex[:8]}',
            'security_score': 85,
            'grade': 'B',
            'vulnerabilities_count': 5,
            'critical_issues': 0,
            'medium_issues': 2,
            'low_issues': 3,
            'certificate_number': f'CERT-2024-{uuid.uuid4().hex[:6].upper()}',
            'pdf_report_url': 'https://example.com/report.pdf',
            'attackChains': [
                {
                    'chainId': 'chain-001',
                    'name': 'Test Attack Chain',
                    'exploitabilityScore': 5.0,
                    'steps': [
                        {
                            'stepNumber': 1,
                            'findingId': 'find-001',
                            'action': 'Exploit missing CSP',
                            'requiredAccess': 'none'
                        }
                    ],
                    'impact': 'Medium',
                    'remediationPriority': 2
                }
            ],
            'augmentationMode': 'parallel-augment',
            'scanVersion': '4.0.0',
            'progressPercent': 100
        })
    }


@pytest.fixture
def sample_finding():
    """Sample security finding."""
    return {
        'auditId': str(uuid.uuid4()),
        'findingId': f'find-ssl-{uuid.uuid4().hex[:8]}',
        'findingType': 'ssl_weak_cipher',
        'severity': 'high',
        'confidence': 0.95,
        'url': 'https://example.com',
        'evidence': {
            'cipher': 'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
            'protocol': 'TLSv1.0'
        },
        'remediation': 'Disable weak ciphers and use TLS 1.2+',
        'cweId': 'CWE-326',
        'owaspCategory': 'A02:2021',
        'dedupeFingerprint': 'a' * 64,
        'detectedAt': datetime.utcnow().isoformat() + 'Z'
    }


@pytest.fixture
def sample_attack_chain():
    """Sample attack chain."""
    return {
        'chainId': f'chain-{uuid.uuid4().hex[:8]}',
        'name': 'XSS to Session Hijacking',
        'exploitabilityScore': 7.5,
        'steps': [
            {
                'stepNumber': 1,
                'findingId': 'find-csp-001',
                'action': 'Exploit missing Content-Security-Policy',
                'requiredAccess': 'none'
            },
            {
                'stepNumber': 2,
                'findingId': 'find-xss-001',
                'action': 'Inject malicious script via reflected XSS',
                'requiredAccess': 'user_interaction'
            },
            {
                'stepNumber': 3,
                'findingId': 'find-cookie-001',
                'action': 'Steal session cookie (missing HttpOnly)',
                'requiredAccess': 'script_execution'
            }
        ],
        'impact': 'Account takeover, session hijacking',
        'remediationPriority': 1
    }


# ============================================================================
# Mock AWS Fixtures
# ============================================================================

@pytest.fixture
def mock_dynamodb():
    """Mock DynamoDB client."""
    with patch('boto3.client') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_lambda_client():
    """Mock Lambda client."""
    with patch('boto3.client') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_sqs():
    """Mock SQS client."""
    with patch('boto3.client') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_s3():
    """Mock S3 client."""
    with patch('boto3.client') as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


# ============================================================================
# Utility Functions
# ============================================================================

def create_mock_lambda_response(body: dict, status_code: int = 200) -> dict:
    """Create a mock Lambda response structure."""
    payload = MagicMock()
    payload.read.return_value = json.dumps({
        'statusCode': status_code,
        'body': json.dumps(body)
    })
    return {'Payload': payload}


def create_mock_dynamodb_item(item: dict) -> dict:
    """Create a mock DynamoDB get_item response."""
    return {'Item': item}


# ============================================================================
# Test Markers
# ============================================================================

def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "e2e: marks tests as end-to-end tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
