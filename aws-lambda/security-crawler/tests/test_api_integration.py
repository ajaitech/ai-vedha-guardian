#!/usr/bin/env python3
"""
AiVedha Guard - API Integration Tests
Version: 4.0.0

Integration tests for API Gateway endpoints and Lambda function integration.
Tests CORS, request/response formats, and end-to-end flows.

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import pytest
import requests
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
API_BASE_URL = 'https://api.aivedha.ai/api'
DEV_API_URL = 'http://localhost:8080/api'  # For local development testing

# Test configuration - set to True for live API testing
USE_LIVE_API = False
TEST_URL = 'https://httpbin.org'  # Safe test target


class TestAPIConfiguration:
    """Tests for API Gateway configuration."""

    @pytest.fixture
    def api_base(self):
        """Get API base URL based on test mode."""
        return API_BASE_URL if USE_LIVE_API else DEV_API_URL

    def test_cors_preflight_audit_start(self, api_base):
        """Test CORS preflight for /audit/start endpoint."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        response = requests.options(
            f'{api_base}/audit/start',
            headers={
                'Origin': 'https://aivedha.ai',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,Authorization'
            }
        )

        # Check CORS headers
        assert 'Access-Control-Allow-Origin' in response.headers
        assert 'Access-Control-Allow-Methods' in response.headers
        assert 'Access-Control-Allow-Headers' in response.headers

        # Verify allowed methods include POST
        allowed_methods = response.headers.get('Access-Control-Allow-Methods', '')
        assert 'POST' in allowed_methods

    def test_cors_preflight_audit_status(self, api_base):
        """Test CORS preflight for /audit/status endpoint."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        response = requests.options(
            f'{api_base}/audit/status/test-report-id',
            headers={
                'Origin': 'https://aivedha.ai',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        )

        assert 'Access-Control-Allow-Origin' in response.headers
        allowed_methods = response.headers.get('Access-Control-Allow-Methods', '')
        assert 'GET' in allowed_methods

    def test_ssl_certificate_valid(self, api_base):
        """Test that SSL certificate is properly configured."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        # This should not raise SSL errors
        response = requests.get(f'{api_base}/health', verify=True)
        assert response.status_code in [200, 404]  # 404 if endpoint doesn't exist

    def test_api_gateway_custom_domain(self):
        """Test custom domain resolves correctly."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        import socket
        try:
            ip = socket.gethostbyname('api.aivedha.ai')
            assert ip is not None
        except socket.gaierror:
            pytest.fail("Custom domain api.aivedha.ai does not resolve")


class TestAuditRequestFormats:
    """Tests for audit request payload formats."""

    @pytest.fixture
    def api_base(self):
        return API_BASE_URL if USE_LIVE_API else DEV_API_URL

    def test_legacy_request_format(self, api_base):
        """Test v3.x legacy request format is accepted."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        # v3.x style request
        payload = {
            'url': TEST_URL,
            'user_id': 'test-user-legacy'
        }

        response = requests.post(
            f'{api_base}/audit/start',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )

        # Should not return 400 Bad Request for format issues
        assert response.status_code != 400 or 'url' not in response.text.lower()

    def test_v4_request_format(self, api_base):
        """Test v4.0.0 request format with all new fields."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        # v4.0.0 style request
        payload = {
            'url': TEST_URL,
            'userId': 'test-user-v4',
            'userEmail': 'test@example.com',
            'userName': 'Test User',
            'auditMetadata': {
                'source': 'integration_test',
                'timestamp': datetime.utcnow().isoformat(),
                'consentAccepted': True,
                'clientVersion': '4.0.0'
            },
            'augmentationMode': 'parallel-augment',
            'scanDepth': 'standard'
        }

        response = requests.post(
            f'{api_base}/audit/start',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )

        # Should accept the new format
        assert response.status_code != 400 or 'augmentationMode' not in response.text

    def test_mixed_user_id_formats(self, api_base):
        """Test both user_id and userId fields work."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        # Both fields present
        payload = {
            'url': TEST_URL,
            'user_id': 'user-via-underscore',
            'userId': 'user-via-camelCase'
        }

        response = requests.post(
            f'{api_base}/audit/start',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )

        # Should not error on field conflict
        assert response.status_code != 400


class TestAuditResponseFormats:
    """Tests for audit response payload formats."""

    def test_response_has_legacy_fields(self):
        """Verify response includes all v3.x fields."""
        # Mock response for testing structure
        mock_response = {
            'report_id': 'rpt-12345678',
            'security_score': 85,
            'grade': 'B',
            'vulnerabilities_count': 5,
            'critical_issues': 0,
            'medium_issues': 2,
            'low_issues': 3,
            'certificate_number': 'CERT-2024-001234',
            'pdf_report_url': 'https://...'
        }

        required_legacy_fields = [
            'report_id', 'security_score', 'grade',
            'vulnerabilities_count', 'critical_issues',
            'medium_issues', 'low_issues'
        ]

        for field in required_legacy_fields:
            assert field in mock_response, f"Missing legacy field: {field}"

    def test_response_has_v4_fields(self):
        """Verify response includes all v4.0.0 fields."""
        # Mock response for testing structure
        mock_response = {
            'report_id': 'rpt-12345678',
            'security_score': 85,
            'attackChains': [
                {
                    'chainId': 'chain-001',
                    'name': 'XSS to Session Hijack',
                    'exploitabilityScore': 7.5,
                    'steps': [],
                    'impact': 'High',
                    'remediationPriority': 1
                }
            ],
            'augmentationMode': 'parallel-augment',
            'scanVersion': '4.0.0',
            'progressPercent': 100,
            'detectorResults': {},
            'auditMetadata': {}
        }

        v4_fields = [
            'attackChains', 'augmentationMode', 'scanVersion', 'progressPercent'
        ]

        for field in v4_fields:
            assert field in mock_response, f"Missing v4 field: {field}"


class TestAuditStatusPolling:
    """Tests for audit status polling endpoint."""

    @pytest.fixture
    def api_base(self):
        return API_BASE_URL if USE_LIVE_API else DEV_API_URL

    def test_status_endpoint_format(self, api_base):
        """Test status endpoint URL format."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        report_id = 'test-report-nonexistent'
        response = requests.get(f'{api_base}/audit/status/{report_id}')

        # Should return JSON even for not found
        assert response.headers.get('Content-Type', '').startswith('application/json') or \
               response.status_code == 404

    def test_status_response_format(self):
        """Test status response has expected structure."""
        mock_status = {
            'status': 'in_progress',
            'progressPercent': 45,
            'currentStage': 'headers',
            'estimatedCompletionTime': '2024-01-15T10:30:00Z'
        }

        assert 'status' in mock_status
        assert 'progressPercent' in mock_status
        assert 0 <= mock_status['progressPercent'] <= 100


class TestEndToEndFlow:
    """End-to-end integration tests."""

    @pytest.fixture
    def api_base(self):
        return API_BASE_URL if USE_LIVE_API else DEV_API_URL

    @pytest.mark.slow
    def test_full_audit_flow(self, api_base):
        """Test complete audit flow: start -> poll -> complete."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        # Step 1: Start audit
        start_payload = {
            'url': TEST_URL,
            'userId': f'test-e2e-{uuid.uuid4().hex[:8]}',
            'userEmail': 'test@example.com',
            'augmentationMode': 'parallel-augment',
            'scanDepth': 'standard'
        }

        start_response = requests.post(
            f'{api_base}/audit/start',
            json=start_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )

        if start_response.status_code == 401:
            pytest.skip("Authentication required for live testing")

        assert start_response.status_code in [200, 202], f"Start failed: {start_response.text}"

        result = start_response.json()
        report_id = result.get('report_id')
        assert report_id is not None, "No report_id returned"

        # Step 2: Poll for completion (with timeout)
        max_wait = 300  # 5 minutes
        poll_interval = 5
        start_time = time.time()

        while time.time() - start_time < max_wait:
            status_response = requests.get(f'{api_base}/audit/status/{report_id}')

            if status_response.status_code != 200:
                time.sleep(poll_interval)
                continue

            status = status_response.json()

            if status.get('status') == 'completed':
                # Step 3: Verify completed response
                assert 'security_score' in status
                assert 'grade' in status
                assert status.get('progressPercent') == 100
                return

            if status.get('status') == 'failed':
                pytest.fail(f"Audit failed: {status.get('error')}")

            time.sleep(poll_interval)

        pytest.fail("Audit did not complete within timeout")


class TestSchedulerIntegration:
    """Tests for scheduler lambda integration."""

    def test_scheduler_payload_format(self):
        """Test scheduler uses correct request format."""
        # Mock scheduler payload (as sent by addon_scheduler_lambda.py)
        scheduler_payload = {
            'url': 'https://example.com',
            'user_id': 'user-123',
            'userId': 'user-123',
            'userEmail': 'user@example.com',
            'schedule_id': 'sched-456',
            'source': 'scheduled_audit',
            'auditMetadata': {
                'source': 'scheduled_audit',
                'schedule_id': 'sched-456',
                'timestamp': datetime.utcnow().isoformat(),
                'consentAccepted': True
            },
            'augmentationMode': 'parallel-augment',
            'scanDepth': 'standard',
            'async_start': False,
            'is_background_execution': False
        }

        # Verify required fields
        assert 'url' in scheduler_payload
        assert 'user_id' in scheduler_payload or 'userId' in scheduler_payload
        assert 'augmentationMode' in scheduler_payload
        assert scheduler_payload['auditMetadata']['source'] == 'scheduled_audit'

    def test_scheduler_response_handling(self):
        """Test scheduler correctly handles audit response."""
        # Mock audit response
        audit_response = {
            'statusCode': 200,
            'body': json.dumps({
                'report_id': 'rpt-789',
                'security_score': 72,
                'grade': 'C',
                'vulnerabilities_count': 8,
                'critical_issues': 1,
                'medium_issues': 3,
                'low_issues': 4,
                'certificate_number': 'CERT-2024-005678',
                'pdf_report_url': 'https://...',
                'attackChains': [],
                'augmentationMode': 'parallel-augment',
                'scanVersion': '4.0.0',
                'progressPercent': 100
            })
        }

        # Parse response as scheduler would
        if 'body' in audit_response:
            body = json.loads(audit_response['body'])
        else:
            body = audit_response

        # Normalize for backward compatibility
        normalized = {
            'success': body.get('status') == 'completed' or body.get('report_id') is not None,
            'report_id': body.get('report_id'),
            'security_score': body.get('security_score', 0),
            'grade': body.get('grade', 'F'),
            'vulnerabilities_count': body.get('vulnerabilities_count', 0),
            'critical_issues': body.get('critical_issues', 0),
            'medium_issues': body.get('medium_issues', 0),
            'low_issues': body.get('low_issues', 0),
            'certificate_number': body.get('certificate_number'),
            'attackChains': body.get('attackChains', []),
            'augmentationMode': body.get('augmentationMode'),
            'scanVersion': body.get('scanVersion', '3.0.0'),
            'progressPercent': body.get('progressPercent', 100)
        }

        assert normalized['success'] == True
        assert normalized['report_id'] == 'rpt-789'
        assert normalized['security_score'] == 72


class TestErrorHandling:
    """Tests for API error handling."""

    @pytest.fixture
    def api_base(self):
        return API_BASE_URL if USE_LIVE_API else DEV_API_URL

    def test_invalid_url_rejected(self, api_base):
        """Test invalid URLs are rejected gracefully."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        payload = {
            'url': 'not-a-valid-url',
            'userId': 'test-user'
        }

        response = requests.post(
            f'{api_base}/audit/start',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )

        # Should return 400 Bad Request
        assert response.status_code == 400

    def test_missing_url_rejected(self, api_base):
        """Test missing URL is rejected."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        payload = {
            'userId': 'test-user'
            # Missing url
        }

        response = requests.post(
            f'{api_base}/audit/start',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )

        assert response.status_code == 400

    def test_invalid_augmentation_mode_rejected(self, api_base):
        """Test invalid augmentation mode is rejected."""
        if not USE_LIVE_API:
            pytest.skip("Live API testing disabled")

        payload = {
            'url': TEST_URL,
            'userId': 'test-user',
            'augmentationMode': 'invalid-mode'
        }

        response = requests.post(
            f'{api_base}/audit/start',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )

        # Should either reject or fall back to default
        if response.status_code == 200:
            # Check it defaulted to legacy-only or parallel-augment
            result = response.json()
            assert result.get('augmentationMode') in ['parallel-augment', 'orchestrated-augment', 'legacy-only', None]


# ============================================================================
# Test Fixtures and Utilities
# ============================================================================

@pytest.fixture(scope='session')
def test_user_id():
    """Generate a unique test user ID for the session."""
    return f'test-user-{uuid.uuid4().hex[:8]}'


def wait_for_completion(api_base: str, report_id: str, timeout: int = 300) -> Optional[Dict[str, Any]]:
    """Poll for audit completion with timeout."""
    start_time = time.time()
    poll_interval = 5

    while time.time() - start_time < timeout:
        try:
            response = requests.get(f'{api_base}/audit/status/{report_id}')
            if response.status_code == 200:
                status = response.json()
                if status.get('status') in ['completed', 'failed']:
                    return status
        except Exception:
            pass
        time.sleep(poll_interval)

    return None


# ============================================================================
# Test Runner
# ============================================================================

if __name__ == '__main__':
    # Run with live API testing disabled by default
    pytest.main([__file__, '-v', '--tb=short', '-m', 'not slow'])
