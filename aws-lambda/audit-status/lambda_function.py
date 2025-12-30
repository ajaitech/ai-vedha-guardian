"""
AiVedha Guard - Audit Status Lambda
Version: 1.0.0
Copyright (c) 2025 AiVibe Software Services Pvt Ltd

Returns the status and results of a security audit from DynamoDB.
"""

import json
import boto3
from decimal import Decimal

# Initialize AWS services
# CRITICAL: Always use us-east-1 for DynamoDB (single source of truth)
# This allows India region Lambda to access US region data
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
REPORTS_TABLE = 'aivedha-guardian-audit-reports'

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal types from DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj) if obj % 1 else int(obj)
        return super(DecimalEncoder, self).default(obj)

def create_response(status_code, body):
    """Create standardized API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://aivedha.ai',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event, context):
    """
    Get audit status and results by report_id
    """
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {'message': 'OK'})

    # Get report_id from path parameters
    report_id = None

    # Try pathParameters first (API Gateway proxy integration)
    if event.get('pathParameters'):
        report_id = event['pathParameters'].get('reportId')

    # Also check queryStringParameters
    if not report_id and event.get('queryStringParameters'):
        report_id = event['queryStringParameters'].get('reportId')

    # Also check direct event
    if not report_id:
        report_id = event.get('report_id') or event.get('reportId')

    if not report_id:
        return create_response(400, {
            'error': 'Missing required parameter: reportId'
        })

    try:
        # Fetch report from DynamoDB
        reports_table = dynamodb.Table(REPORTS_TABLE)
        response = reports_table.get_item(Key={'report_id': report_id})

        if 'Item' not in response:
            return create_response(404, {
                'error': 'Report not found',
                'report_id': report_id
            })

        report = response['Item']
        status = report.get('status', 'unknown')

        # Build response based on status
        result = {
            'report_id': report_id,
            'status': status,
            'url': report.get('url', ''),
            'created_at': report.get('created_at', ''),
            # Region routing info (v5.0.0)
            'scan_region': report.get('scan_region', ''),
            'scanRegion': report.get('scan_region', ''),
            'region_name': report.get('region_name', ''),
            'regionName': report.get('region_name', ''),
            'static_ip': report.get('static_ip', ''),
            'staticIP': report.get('static_ip', '')
        }

        # If completed, include full results
        if status == 'completed':
            # Parse scan_results JSON to get vulnerabilities and other detailed data
            scan_results = {}
            scan_results_str = report.get('scan_results', '{}')
            if scan_results_str:
                try:
                    scan_results = json.loads(scan_results_str) if isinstance(scan_results_str, str) else scan_results_str
                except json.JSONDecodeError:
                    scan_results = {}

            # Get vulnerabilities from report directly or from scan_results
            vulnerabilities = report.get('vulnerabilities', scan_results.get('vulnerabilities', []))

            # Ensure vulnerabilities is a list
            if isinstance(vulnerabilities, str):
                try:
                    vulnerabilities = json.loads(vulnerabilities)
                except:
                    vulnerabilities = []

            # Calculate severity counts from vulnerabilities array
            # This ensures counts are accurate even if not stored in DynamoDB
            critical_count = 0
            high_count = 0
            medium_count = 0
            low_count = 0
            info_count = 0

            for vuln in vulnerabilities:
                severity = (vuln.get('severity') or '').upper()
                if severity == 'CRITICAL':
                    critical_count += 1
                elif severity == 'HIGH':
                    high_count += 1
                elif severity == 'MEDIUM':
                    medium_count += 1
                elif severity == 'LOW':
                    low_count += 1
                elif severity in ('INFO', 'INFORMATIONAL', 'INFORMATION'):
                    info_count += 1

            # Use calculated counts, or fall back to stored values (stored as *_issues)
            critical_count = critical_count or report.get('critical_issues', report.get('critical_count', 0))
            high_count = high_count or report.get('high_issues', report.get('high_count', 0))
            medium_count = medium_count or report.get('medium_issues', report.get('medium_count', 0))
            low_count = low_count or report.get('low_issues', report.get('low_count', 0))
            info_count = info_count or report.get('info_issues', report.get('info_count', 0))

            total_vulnerabilities = len(vulnerabilities) if vulnerabilities else report.get('vulnerabilities_count', 0)

            # Security score is stored as int (x10), convert back to float
            raw_score = report.get('security_score', 0)
            security_score = raw_score / 10 if raw_score > 10 else raw_score

            # Calculate headers_score
            headers_score = report.get('headers_score', 0)
            if headers_score == 0 and scan_results.get('security_headers'):
                headers_score = scan_results['security_headers'].get('score', 0)

            # SSL status from report or scan_results
            ssl_valid = report.get('ssl_valid', False)
            ssl_info = report.get('ssl_info', scan_results.get('ssl_info', {}))
            ssl_status = 'Valid' if ssl_valid else 'Invalid'
            if ssl_info:
                ssl_status = 'Valid' if ssl_info.get('valid', ssl_valid) else 'Invalid'

            # Get security headers from report or scan_results
            raw_security_headers = report.get('security_headers', scan_results.get('security_headers', {}))

            # Transform security_headers to array format for frontend
            security_headers_array = []
            if isinstance(raw_security_headers, dict):
                # Process present headers
                present_headers = raw_security_headers.get('present', {})
                for name, details in present_headers.items():
                    security_headers_array.append({
                        'name': name,
                        'value': details.get('value', '') if isinstance(details, dict) else str(details),
                        'present': True,
                        'status': 'good',
                        'recommendation': ''
                    })

                # Process missing headers
                missing_headers = raw_security_headers.get('missing', {})
                for name, details in missing_headers.items():
                    if isinstance(details, dict):
                        severity = details.get('severity', 'LOW').upper()
                        status = 'bad' if severity in ('HIGH', 'CRITICAL') else 'warning' if severity == 'MEDIUM' else 'missing'
                        security_headers_array.append({
                            'name': name,
                            'value': '',
                            'present': False,
                            'status': status,
                            'recommendation': f"Add header: {name}: {details.get('recommended', '')}"
                        })

            # Build security_headers object with both formats
            security_headers = {
                'score': raw_security_headers.get('score', 0) if isinstance(raw_security_headers, dict) else 0,
                'grade': raw_security_headers.get('grade', 'F') if isinstance(raw_security_headers, dict) else 'F',
                'headers': security_headers_array,
                'missing': raw_security_headers.get('missing', {}) if isinstance(raw_security_headers, dict) else {},
                'present': raw_security_headers.get('present', {}) if isinstance(raw_security_headers, dict) else {}
            }

            # Get DNS security from report or scan_results
            dns_security = report.get('dns_security', scan_results.get('dns_security', {}))

            # Get additional scan data for other tabs
            waf_detection = report.get('waf_detection', scan_results.get('waf_detection', None))
            cors_analysis = report.get('cors_analysis', scan_results.get('cors_analysis', None))
            cloud_security = report.get('cloud_security', scan_results.get('cloud_security', None))
            subdomain_enumeration = report.get('subdomain_enumeration', scan_results.get('subdomain_enumeration', None))
            technology_stack = report.get('technology_stack', scan_results.get('technology_stack', []))
            sensitive_files = report.get('sensitive_files', scan_results.get('sensitive_files', []))
            content_analysis = report.get('content_analysis', scan_results.get('content_analysis', None))

            # Get progress fields even for completed status
            progress_raw = report.get('progress', 100)
            if isinstance(progress_raw, dict):
                progress_val = progress_raw.get('overall_progress', progress_raw.get('percentage', 100))
            elif isinstance(progress_raw, Decimal):
                progress_val = float(progress_raw)
            else:
                progress_val = progress_raw if progress_raw else 100

            # Get additional analysis data from scan_results
            analysis_results = scan_results.get('analysis_results', [])
            compliance_status = scan_results.get('compliance_status', {})
            executive_summary = scan_results.get('executive_summary', '')
            attack_chains = scan_results.get('attack_chains', [])
            remediation_priority = scan_results.get('remediation_priority', [])
            security_assessment = scan_results.get('security_assessment', {})
            scan_statistics = scan_results.get('scan_statistics', {})

            result.update({
                'security_score': security_score,
                'grade': report.get('grade', 'F'),
                'vulnerabilities_count': total_vulnerabilities,
                # Calculated severity counts
                'critical_issues': critical_count,
                'high_issues': high_count,
                'medium_issues': medium_count,
                'low_issues': low_count,
                'info_issues': info_count,
                'ssl_status': ssl_status,
                'ssl_grade': report.get('ssl_grade', ssl_info.get('grade', 'N/A')),
                'ssl_valid': ssl_valid,
                'headers_score': headers_score,
                'pdf_report_url': report.get('pdf_report_url', scan_results.get('pdf_report_url', '')),
                'certificate_number': report.get('certificate_number', scan_results.get('certificate_number', '')),
                'vulnerabilities': vulnerabilities,
                'ssl_info': ssl_info,
                'security_headers': security_headers,
                'dns_security': dns_security,
                # Additional scan data for tabs
                'waf_detection': waf_detection,
                'cors_analysis': cors_analysis,
                'cloud_security': cloud_security,
                'subdomain_enumeration': subdomain_enumeration,
                'technology_stack': technology_stack,
                'sensitive_files': sensitive_files,
                'content_analysis': content_analysis,
                # NEW: Additional analysis data from scan_results
                'analysis_results': analysis_results,  # Module pass/fail status
                'compliance_status': compliance_status,  # PCI-DSS, GDPR, etc.
                'executive_summary': executive_summary,  # AI-generated summary
                'attack_chains': attack_chains,  # Potential attack paths
                'remediation_priority': remediation_priority,  # Prioritized fixes
                'security_assessment': security_assessment,  # Full assessment details
                'scan_statistics': scan_statistics,  # Pages crawled, assets, etc.
                'scan_timestamp': scan_results.get('scan_timestamp', report.get('created_at', '')),
                'message': 'Security audit completed successfully',
                'credit_used': True,
                # Progress fields for consistency
                'progressPercent': progress_val,
                'currentStage': report.get('currentStage', 'completed'),
                'stageDescription': report.get('stageDescription', 'Security audit completed'),
                'updatedAt': report.get('updatedAt', report.get('completedAt', ''))
            })
        elif status == 'failed' or status == 'error':
            result['error'] = report.get('error', 'Unknown error occurred')
            result['message'] = 'Security audit failed'
            result['credit_refunded'] = report.get('credit_refunded', False)
            # Add progress fields for consistency - failed at whatever progress it reached
            progress_raw = report.get('progress', report.get('progressPercent', 0))
            if isinstance(progress_raw, dict):
                progress_val = progress_raw.get('overall_progress', progress_raw.get('percentage', 0))
            elif isinstance(progress_raw, Decimal):
                progress_val = float(progress_raw)
            else:
                progress_val = progress_raw if progress_raw else 0
            result['progressPercent'] = progress_val
            result['currentStage'] = 'failed'
            result['stageDescription'] = report.get('error', 'Audit failed - please try again')
        elif status == 'pending' or status == 'queued' or status == 'initializing':
            # Newly created audit waiting to start
            result['progressPercent'] = 0
            result['currentStage'] = status
            result['stageDescription'] = 'Audit queued and waiting to start...'
            result['message'] = 'Security audit is queued'
            result['updatedAt'] = report.get('updatedAt', report.get('created_at', ''))
        elif status == 'processing' or status == 'in_progress':
            # Check for stuck/stale audits - only mark as timed out after 1 hour (3600 seconds)
            # This allows unlimited processing time within practical limits
            from datetime import datetime, timedelta
            created_at_str = report.get('created_at', '')
            is_stuck = False
            try:
                if created_at_str:
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                    now = datetime.now(created_at.tzinfo) if created_at.tzinfo else datetime.utcnow()
                    time_elapsed = (now - created_at.replace(tzinfo=None)).total_seconds()
                    # If more than 1 hour (3600 seconds), mark as stuck
                    if time_elapsed > 3600:
                        is_stuck = True
            except:
                pass

            if is_stuck:
                # Mark as timed out and update DynamoDB
                result['status'] = 'timed_out'
                result['message'] = 'Security audit timed out - please try again'
                result['error'] = 'Audit exceeded maximum processing time'
                # Update the DynamoDB record to reflect timeout
                try:
                    reports_table.update_item(
                        Key={'report_id': report_id},
                        UpdateExpression='SET #s = :status, #e = :error',
                        ExpressionAttributeNames={'#s': 'status', '#e': 'error'},
                        ExpressionAttributeValues={
                            ':status': 'timed_out',
                            ':error': 'Audit exceeded maximum processing time'
                        }
                    )
                except:
                    pass
                return create_response(200, result)

            # Get real progress data from enhanced progress tracking
            # Note: security-crawler may store as 'progress' (dict or int) or 'progressPercent' (int)
            progress_raw = report.get('progress', report.get('progressPercent', 0))
            # Handle progress stored as dict (from ScanProgress.to_dict())
            audit_items = []
            current_item = 0
            total_items = 41
            findings_count = 0
            if isinstance(progress_raw, dict):
                progress_percent = progress_raw.get('overall_progress', progress_raw.get('percentage', 0))
                # Extract per-item tracking data (v6.0.0)
                audit_items = progress_raw.get('audit_items', [])
                current_item = progress_raw.get('current_item', 0)
                total_items = progress_raw.get('total_items', 41)
                findings_count = progress_raw.get('findings_count', 0)
            elif isinstance(progress_raw, Decimal):
                progress_percent = float(progress_raw)
            else:
                progress_percent = progress_raw if progress_raw else 0
            # Also check progress_percent field directly
            if not progress_percent:
                progress_percent = report.get('progress_percent', 0)
                if isinstance(progress_percent, Decimal):
                    progress_percent = float(progress_percent)

            current_stage = report.get('currentStage', 'initialization')
            stage_description = report.get('stageDescription', 'Starting security scan...')
            updated_at = report.get('updatedAt', report.get('created_at', ''))

            # Provide meaningful progress information with real-time data
            result['progressPercent'] = progress_percent if progress_percent > 0 else 5
            result['currentStage'] = current_stage.lower() if current_stage else 'processing'
            result['updatedAt'] = updated_at
            result['message'] = stage_description or 'Security audit in progress...'
            # Per-item tracking (v6.0.0)
            result['audit_items'] = audit_items
            result['current_item'] = current_item
            result['total_items'] = total_items
            result['findings_count'] = findings_count
            
            # Stage details for frontend to display
            # Maps stage names from security-crawler to human-readable descriptions
            stage_descriptions = {
                # Lowercase stages (actual from security-crawler)
                'initialization': 'Initializing security scan...',
                'validating_target': 'Validating target URL accessibility...',
                'dns_resolution': 'Analyzing DNS security & records...',
                'ssl_analysis': 'Deep SSL/TLS certificate analysis...',
                'crawling': 'Discovering pages & endpoints...',
                'header_analysis': 'Analyzing HTTP security headers...',
                'cookie_analysis': 'Auditing cookie security settings...',
                'form_analysis': 'Scanning forms for vulnerabilities...',
                'javascript_analysis': 'Analyzing JavaScript security...',
                'sensitive_files': 'Scanning for exposed sensitive files...',
                'api_discovery': 'Discovering & testing API endpoints...',
                'vulnerability_detection': 'Running vulnerability detectors...',
                'ai_analysis': 'AI analyzing all findings (this takes time)...',
                'completed': 'Security audit completed!',
                'failed': 'Audit encountered an error',
                # Legacy uppercase stages (backwards compatibility)
                'INITIALIZATION': 'Initializing security scan...',
                'URL_VALIDATION': 'Validating target URL...',
                'DNS_ANALYSIS': 'Analyzing DNS security configuration...',
                'SSL_ANALYSIS': 'Performing deep SSL/TLS analysis...',
                'HEADERS_ANALYSIS': 'Analyzing security headers...',
                'CONTENT_ANALYSIS': 'Scanning content for vulnerabilities...',
                'TECHNOLOGY_DETECTION': 'Fingerprinting technologies...',
                'SENSITIVE_FILES': 'Checking for exposed sensitive files...',
                'CRAWLING': 'Crawling website for additional pages...',
                'AI_ANALYSIS': 'Running AI-powered vulnerability analysis...',
                'REPORT_GENERATION': 'Generating PDF report...',
                'COMPLETION': 'Finalizing audit report...',
                'ERROR': 'An error occurred during the scan'
            }

            # Get stage description - check both the stored description and the mapping
            result['stageDescription'] = stage_description or stage_descriptions.get(
                current_stage,
                stage_descriptions.get(current_stage.upper() if current_stage else '', 'Processing security audit...')
            )
        elif status == 'timed_out' or status == 'timeout':
            # Audit timed out
            progress_raw = report.get('progress', report.get('progressPercent', 0))
            if isinstance(progress_raw, dict):
                progress_val = progress_raw.get('overall_progress', progress_raw.get('percentage', 0))
            elif isinstance(progress_raw, Decimal):
                progress_val = float(progress_raw)
            else:
                progress_val = progress_raw if progress_raw else 0
            result['progressPercent'] = progress_val
            result['currentStage'] = 'timed_out'
            result['stageDescription'] = 'Audit timed out - the scan took too long'
            result['message'] = 'Security audit timed out - please try again'
            result['error'] = report.get('error', 'Audit exceeded maximum processing time')
        elif status == 'cancelled':
            result['progressPercent'] = 0
            result['currentStage'] = 'cancelled'
            result['stageDescription'] = 'Audit was cancelled'
            result['message'] = 'Security audit was cancelled'
        else:
            # Unknown status - treat as processing with minimal progress
            progress_raw = report.get('progress', report.get('progressPercent', 0))
            if isinstance(progress_raw, dict):
                progress_val = progress_raw.get('overall_progress', progress_raw.get('percentage', 0))
            elif isinstance(progress_raw, Decimal):
                progress_val = float(progress_raw)
            else:
                progress_val = progress_raw if progress_raw else 0
            result['progressPercent'] = progress_val if progress_val > 0 else 5
            result['currentStage'] = status or 'unknown'
            result['stageDescription'] = report.get('stageDescription', 'Processing...')
            result['message'] = f'Audit status: {status}'

        return create_response(200, result)

    except Exception as e:
        print(f"Error fetching report: {str(e)}")
        return create_response(500, {
            'error': 'Failed to fetch report status',
            'details': str(e)
        })
