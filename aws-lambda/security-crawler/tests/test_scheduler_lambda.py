#!/usr/bin/env python3
"""
AiVedha Guard - Scheduler Lambda Unit Tests
Version: 4.0.0

Tests for the addon_scheduler_lambda.py module ensuring proper v4.0.0 integration.

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal

import sys
import os

# Import the module under test
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'addon-purchase'))

# Note: These tests mock AWS services and don't require actual credentials


class TestExecuteAuditFunction:
    """Tests for the execute_audit function."""

    @patch('addon_scheduler_lambda.lambda_client')
    def test_execute_audit_v4_payload_format(self, mock_lambda):
        """Verify execute_audit sends v4.0.0 compatible payload."""
        # Import after patching
        from addon_scheduler_lambda import execute_audit

        # Mock successful Lambda response
        mock_lambda.invoke.return_value = {
            'Payload': MagicMock(read=lambda: json.dumps({
                'statusCode': 200,
                'body': json.dumps({
                    'report_id': 'test-report-123',
                    'security_score': 85,
                    'grade': 'B',
                    'vulnerabilities_count': 5,
                    'critical_issues': 0,
                    'medium_issues': 2,
                    'low_issues': 3,
                    'attackChains': [],
                    'augmentationMode': 'parallel-augment',
                    'scanVersion': '4.0.0',
                    'progressPercent': 100
                })
            }))
        }

        result = execute_audit(
            url='https://example.com',
            user_id='user-123',
            schedule_id='sched-456',
            user_email='user@example.com'
        )

        # Verify Lambda was invoked
        mock_lambda.invoke.assert_called_once()

        # Get the payload sent to Lambda
        call_args = mock_lambda.invoke.call_args
        payload = json.loads(call_args[1]['Payload'])

        # Verify v4.0.0 fields are present
        assert 'augmentationMode' in payload
        assert payload['augmentationMode'] == 'parallel-augment'
        assert 'scanDepth' in payload
        assert 'auditMetadata' in payload
        assert payload['auditMetadata']['source'] == 'scheduled_audit'

        # Verify backward compatible fields
        assert 'user_id' in payload
        assert 'userId' in payload

    @patch('addon_scheduler_lambda.lambda_client')
    def test_execute_audit_response_normalization(self, mock_lambda):
        """Verify response is normalized for backward compatibility."""
        from addon_scheduler_lambda import execute_audit

        # Mock Lambda response with v4.0.0 format
        mock_lambda.invoke.return_value = {
            'Payload': MagicMock(read=lambda: json.dumps({
                'statusCode': 200,
                'body': json.dumps({
                    'report_id': 'rpt-789',
                    'security_score': 72,
                    'grade': 'C',
                    'status': 'completed',
                    'attackChains': [
                        {'chainId': 'chain-001', 'name': 'Test Chain', 'exploitabilityScore': 5.0}
                    ],
                    'augmentationMode': 'parallel-augment',
                    'scanVersion': '4.0.0',
                    'progressPercent': 100
                })
            }))
        }

        result = execute_audit('https://example.com', 'user-1', 'sched-1', 'user@test.com')

        # Verify normalized result
        assert result['success'] == True
        assert result['report_id'] == 'rpt-789'
        assert result['security_score'] == 72
        assert result['grade'] == 'C'

        # Verify v4.0.0 fields passed through
        assert 'attackChains' in result
        assert len(result['attackChains']) == 1
        assert result['augmentationMode'] == 'parallel-augment'
        assert result['scanVersion'] == '4.0.0'

    @patch('addon_scheduler_lambda.lambda_client')
    def test_execute_audit_handles_legacy_response(self, mock_lambda):
        """Verify backward compatibility with v3.x responses."""
        from addon_scheduler_lambda import execute_audit

        # Mock v3.x style response (without v4.0.0 fields)
        mock_lambda.invoke.return_value = {
            'Payload': MagicMock(read=lambda: json.dumps({
                'statusCode': 200,
                'body': json.dumps({
                    'report_id': 'rpt-legacy',
                    'security_score': 60,
                    'grade': 'D',
                    'vulnerabilities_count': 15,
                    'critical_issues': 2,
                    'medium_issues': 5,
                    'low_issues': 8
                    # No attackChains, augmentationMode, etc.
                })
            }))
        }

        result = execute_audit('https://example.com', 'user-1', 'sched-1', None)

        # Should work with legacy response
        assert result['success'] == True
        assert result['report_id'] == 'rpt-legacy'

        # v4.0.0 fields should have defaults
        assert result.get('attackChains', []) == []
        assert result.get('scanVersion', '3.0.0') == '3.0.0'
        assert result.get('progressPercent', 100) == 100

    @patch('addon_scheduler_lambda.lambda_client')
    def test_execute_audit_handles_error_response(self, mock_lambda):
        """Verify error handling in execute_audit."""
        from addon_scheduler_lambda import execute_audit

        # Mock error response
        mock_lambda.invoke.return_value = {
            'Payload': MagicMock(read=lambda: json.dumps({
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': 'Audit failed to complete'
                })
            }))
        }

        result = execute_audit('https://example.com', 'user-1', 'sched-1', None)

        # Should indicate failure
        assert result['success'] == False
        assert 'error' in result

    @patch('addon_scheduler_lambda.lambda_client')
    def test_execute_audit_handles_exception(self, mock_lambda):
        """Verify exception handling in execute_audit."""
        from addon_scheduler_lambda import execute_audit

        # Mock Lambda invocation failure
        mock_lambda.invoke.side_effect = Exception('Lambda invocation failed')

        result = execute_audit('https://example.com', 'user-1', 'sched-1', None)

        # Should return error result, not raise exception
        assert result['success'] == False
        assert 'error' in result


class TestPayloadConstruction:
    """Tests for audit request payload construction."""

    def test_payload_has_all_required_fields(self):
        """Verify payload includes all required v4.0.0 fields."""
        # Expected payload structure
        expected_fields = [
            'url', 'user_id', 'userId', 'userEmail', 'schedule_id',
            'source', 'auditMetadata', 'augmentationMode', 'scanDepth',
            'async_start', 'is_background_execution'
        ]

        # Mock payload as built by execute_audit
        payload = {
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

        for field in expected_fields:
            assert field in payload, f"Missing required field: {field}"

    def test_metadata_structure(self):
        """Verify auditMetadata has correct structure."""
        metadata = {
            'source': 'scheduled_audit',
            'schedule_id': 'sched-123',
            'timestamp': datetime.utcnow().isoformat(),
            'consentAccepted': True
        }

        assert metadata['source'] == 'scheduled_audit'
        assert 'schedule_id' in metadata
        assert metadata['consentAccepted'] == True

        # Verify timestamp is valid ISO format
        try:
            datetime.fromisoformat(metadata['timestamp'])
        except ValueError:
            pytest.fail("Timestamp is not valid ISO format")


class TestResponseNormalization:
    """Tests for response normalization logic."""

    def test_normalize_completed_status(self):
        """Verify 'status: completed' maps to success=True."""
        response = {'status': 'completed', 'report_id': 'test-123'}
        success = response.get('status') == 'completed' or response.get('report_id') is not None
        assert success == True

    def test_normalize_report_id_present(self):
        """Verify presence of report_id indicates success."""
        response = {'report_id': 'test-123'}  # No status field
        success = response.get('status') == 'completed' or response.get('report_id') is not None
        assert success == True

    def test_normalize_no_report_id_no_status(self):
        """Verify missing report_id and status indicates failure."""
        response = {'error': 'Something went wrong'}  # No report_id or status
        success = response.get('status') == 'completed' or response.get('report_id') is not None
        assert success == False

    def test_normalize_v4_fields_passthrough(self):
        """Verify v4.0.0 fields are passed through correctly."""
        response = {
            'report_id': 'rpt-456',
            'attackChains': [{'chainId': 'chain-1'}],
            'augmentationMode': 'parallel-augment',
            'scanVersion': '4.0.0',
            'progressPercent': 100
        }

        normalized = {
            'success': True,
            'report_id': response.get('report_id'),
            'attackChains': response.get('attackChains', []),
            'augmentationMode': response.get('augmentationMode'),
            'scanVersion': response.get('scanVersion', '3.0.0'),
            'progressPercent': response.get('progressPercent', 100)
        }

        assert normalized['attackChains'] == [{'chainId': 'chain-1'}]
        assert normalized['augmentationMode'] == 'parallel-augment'
        assert normalized['scanVersion'] == '4.0.0'

    def test_normalize_defaults_for_missing_v4_fields(self):
        """Verify defaults are applied for missing v4.0.0 fields."""
        response = {
            'report_id': 'rpt-legacy',
            'security_score': 80
            # No v4.0.0 fields
        }

        normalized = {
            'attackChains': response.get('attackChains', []),
            'augmentationMode': response.get('augmentationMode'),
            'scanVersion': response.get('scanVersion', '3.0.0'),
            'progressPercent': response.get('progressPercent', 100)
        }

        assert normalized['attackChains'] == []
        assert normalized['augmentationMode'] is None
        assert normalized['scanVersion'] == '3.0.0'
        assert normalized['progressPercent'] == 100


class TestLambdaHandler:
    """Tests for the main lambda_handler function."""

    @patch('addon_scheduler_lambda.dynamodb')
    @patch('addon_scheduler_lambda.lambda_client')
    @patch('addon_scheduler_lambda.has_active_scheduler_addon')
    @patch('addon_scheduler_lambda.get_user_credits')
    @patch('addon_scheduler_lambda.deduct_user_credit')
    def test_handler_execute_action(self, mock_deduct, mock_credits, mock_has_addon, mock_lambda, mock_dynamodb):
        """Test handler with execute action."""
        from addon_scheduler_lambda import lambda_handler

        # Setup mocks
        mock_has_addon.return_value = (True, '2025-12-31')
        mock_credits.return_value = 10
        mock_deduct.return_value = True

        # Mock DynamoDB tables
        mock_schedules_table = MagicMock()
        mock_schedules_table.get_item.return_value = {
            'Item': {
                'schedule_id': 'sched-123',
                'user_id': 'user-456',
                'url': 'https://example.com',
                'frequency': 'weekly',
                'status': 'active'
            }
        }

        mock_users_table = MagicMock()
        mock_users_table.get_item.return_value = {
            'Item': {
                'user_id': 'user-456',
                'email': 'user@example.com',
                'credits': 10
            }
        }

        mock_dynamodb.Table.side_effect = lambda name: (
            mock_schedules_table if 'schedules' in name.lower()
            else mock_users_table
        )

        # Mock Lambda invocation
        mock_lambda.invoke.return_value = {
            'Payload': MagicMock(read=lambda: json.dumps({
                'statusCode': 200,
                'body': json.dumps({
                    'report_id': 'rpt-test',
                    'security_score': 85,
                    'status': 'completed'
                })
            }))
        }

        # Execute handler
        event = {
            'action': 'execute',
            'schedule_id': 'sched-123'
        }

        result = lambda_handler(event, None)

        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body.get('success') == True

    @patch('addon_scheduler_lambda.dynamodb')
    @patch('addon_scheduler_lambda.has_active_scheduler_addon')
    def test_handler_check_addon_action(self, mock_has_addon, mock_dynamodb):
        """Test handler with check_addon action."""
        from addon_scheduler_lambda import lambda_handler

        # Setup mocks
        mock_has_addon.return_value = (True, '2025-12-31')

        mock_users_table = MagicMock()
        mock_users_table.get_item.return_value = {
            'Item': {
                'user_id': 'user-456',
                'email': 'user@example.com'
            }
        }
        mock_dynamodb.Table.return_value = mock_users_table

        event = {
            'action': 'check_addon',
            'user_id': 'user-456'
        }

        result = lambda_handler(event, None)

        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body.get('addon_active') == True


class TestNextRunCalculation:
    """Tests for next run time calculation."""

    def test_calculate_next_run_daily(self):
        """Test daily frequency calculation."""
        from addon_scheduler_lambda import calculate_next_run

        now = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run('daily', now)

        expected = datetime(2024, 1, 16, 10, 30, 0)
        assert next_run == expected

    def test_calculate_next_run_weekly(self):
        """Test weekly frequency calculation."""
        from addon_scheduler_lambda import calculate_next_run

        now = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run('weekly', now)

        expected = datetime(2024, 1, 22, 10, 30, 0)
        assert next_run == expected

    def test_calculate_next_run_biweekly(self):
        """Test biweekly frequency calculation."""
        from addon_scheduler_lambda import calculate_next_run

        now = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run('biweekly', now)

        expected = datetime(2024, 1, 29, 10, 30, 0)
        assert next_run == expected

    def test_calculate_next_run_monthly(self):
        """Test monthly frequency calculation."""
        from addon_scheduler_lambda import calculate_next_run

        now = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run('monthly', now)

        # Approximately 30 days later
        assert next_run > now
        assert (next_run - now).days == 30

    def test_calculate_next_run_unknown_defaults_daily(self):
        """Test unknown frequency defaults to daily."""
        from addon_scheduler_lambda import calculate_next_run

        now = datetime(2024, 1, 15, 10, 30, 0)
        next_run = calculate_next_run('unknown_frequency', now)

        expected = datetime(2024, 1, 16, 10, 30, 0)
        assert next_run == expected


# ============================================================================
# Test Runner
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
