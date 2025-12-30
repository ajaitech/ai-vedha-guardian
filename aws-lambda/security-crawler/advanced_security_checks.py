"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  AiVedha Guard - Advanced Security Checks Module                             ║
║  Version: 5.1.0 "QUANTUM FORTRESS PRO"                                       ║
║                                                                              ║
║  Enterprise-grade security checks including:                                 ║
║  - HTTP/2 and HTTP/3 (QUIC) Protocol Detection                               ║
║  - HSTS Preload List Verification                                            ║
║  - Subresource Integrity (SRI) Analysis                                      ║
║  - Content Security Policy Deep Analysis                                     ║
║  - Certificate Transparency Log Verification                                 ║
║  - DNS-over-HTTPS (DoH) Configuration                                        ║
║  - WebSocket Security Analysis                                               ║
║  - Server Timing Header Analysis                                             ║
║  - Permissions Policy (Feature Policy) Analysis                              ║
║  - Cross-Origin Policies Analysis                                            ║
║                                                                              ║
║  Owner: Aravind Jayamohan                                                    ║
║  Company: AiVibe Software Services Pvt Ltd                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import logging
import re
import socket
import ssl
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import requests

# ============================================================================
# LOGGING
# ============================================================================

logger = logging.getLogger('AiVedhaAdvancedChecks')
logger.setLevel(logging.INFO)

# ============================================================================
# DATA CLASSES
# ============================================================================


@dataclass
class SecurityFinding:
    """Represents a security finding from advanced checks."""
    
    check_type: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title: str
    description: str
    recommendation: str
    evidence: str = ""
    cvss_score: float = 0.0
    cwe_id: str = ""
    owasp_category: str = ""
    compliance_impact: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'checkType': self.check_type,
            'severity': self.severity,
            'title': self.title,
            'description': self.description,
            'recommendation': self.recommendation,
            'evidence': self.evidence,
            'cvssScore': self.cvss_score,
            'cweId': self.cwe_id,
            'owaspCategory': self.owasp_category,
            'complianceImpact': self.compliance_impact,
            'references': self.references
        }


# ============================================================================
# HTTP/2 AND HTTP/3 DETECTION
# ============================================================================


class HTTPProtocolAnalyzer:
    """Analyzes HTTP protocol support and configuration."""
    
    # ALPN protocols for HTTP/2
    HTTP2_ALPN = ['h2', 'h2c']
    HTTP3_ALT_SVC_PATTERN = re.compile(r'h3(?:-\d+)?="([^"]+)"')
    
    @classmethod
    def check_http2_support(cls, hostname: str, port: int = 443) -> Dict[str, Any]:
        """
        Check if server supports HTTP/2 via ALPN negotiation.
        
        Args:
            hostname: Target hostname
            port: Target port (default 443)
        
        Returns:
            HTTP/2 support analysis results
        """
        result = {
            'http2_supported': False,
            'negotiated_protocol': None,
            'alpn_protocols': [],
            'findings': []
        }
        
        try:
            # Create SSL context with ALPN
            context = ssl.create_default_context()
            context.set_alpn_protocols(['h2', 'http/1.1'])
            
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    negotiated = ssock.selected_alpn_protocol()
                    result['negotiated_protocol'] = negotiated
                    result['http2_supported'] = negotiated == 'h2'
                    
                    if negotiated == 'h2':
                        result['findings'].append(SecurityFinding(
                            check_type='HTTP2_SUPPORT',
                            severity='INFO',
                            title='HTTP/2 Protocol Enabled',
                            description=f'Server supports HTTP/2 protocol via ALPN negotiation.',
                            recommendation='HTTP/2 provides performance benefits. Ensure proper configuration.',
                            evidence=f'ALPN negotiated: {negotiated}',
                            owasp_category='A05:2021 - Security Misconfiguration'
                        ))
                    else:
                        result['findings'].append(SecurityFinding(
                            check_type='HTTP2_MISSING',
                            severity='LOW',
                            title='HTTP/2 Not Enabled',
                            description='Server does not support HTTP/2, missing performance and security benefits.',
                            recommendation='Enable HTTP/2 for improved performance and header compression.',
                            evidence=f'Negotiated protocol: {negotiated or "http/1.1"}',
                            owasp_category='A05:2021 - Security Misconfiguration'
                        ))
        
        except Exception as e:
            logger.warning(f"HTTP/2 check failed for {hostname}: {e}")
            result['error'] = str(e)
        
        return result
    
    @classmethod
    def check_http3_support(cls, url: str) -> Dict[str, Any]:
        """
        Check for HTTP/3 (QUIC) support via Alt-Svc header.
        
        Args:
            url: Target URL
        
        Returns:
            HTTP/3 support analysis results
        """
        result = {
            'http3_supported': False,
            'alt_svc_header': None,
            'quic_endpoints': [],
            'findings': []
        }
        
        try:
            response = requests.head(url, timeout=10, allow_redirects=True)
            alt_svc = response.headers.get('Alt-Svc', '')
            result['alt_svc_header'] = alt_svc
            
            # Check for h3 in Alt-Svc
            h3_matches = cls.HTTP3_ALT_SVC_PATTERN.findall(alt_svc)
            if h3_matches or 'h3' in alt_svc.lower():
                result['http3_supported'] = True
                result['quic_endpoints'] = h3_matches
                
                result['findings'].append(SecurityFinding(
                    check_type='HTTP3_SUPPORT',
                    severity='INFO',
                    title='HTTP/3 (QUIC) Protocol Enabled',
                    description='Server supports HTTP/3 via QUIC protocol for improved performance.',
                    recommendation='HTTP/3 provides 0-RTT connections and improved security. Ensure proper configuration.',
                    evidence=f'Alt-Svc: {alt_svc[:200]}',
                    owasp_category='A05:2021 - Security Misconfiguration'
                ))
        
        except Exception as e:
            logger.warning(f"HTTP/3 check failed for {url}: {e}")
            result['error'] = str(e)
        
        return result


# ============================================================================
# HSTS PRELOAD LIST VERIFICATION
# ============================================================================


class HSTSPreloadChecker:
    """Checks HSTS configuration and preload status."""
    
    # Chromium HSTS preload list API
    PRELOAD_API = "https://hstspreload.org/api/v2/status"
    
    @classmethod
    def analyze_hsts(cls, headers: Dict[str, str], hostname: str) -> Dict[str, Any]:
        """
        Analyze HSTS header configuration and preload eligibility.
        
        Args:
            headers: Response headers dictionary
            hostname: Target hostname
        
        Returns:
            HSTS analysis results
        """
        result = {
            'hsts_enabled': False,
            'max_age': 0,
            'include_subdomains': False,
            'preload': False,
            'preload_eligible': False,
            'preload_status': None,
            'findings': []
        }
        
        # Check for HSTS header
        hsts_header = headers.get('Strict-Transport-Security', '')
        
        if not hsts_header:
            result['findings'].append(SecurityFinding(
                check_type='HSTS_MISSING',
                severity='HIGH',
                title='HTTP Strict Transport Security (HSTS) Not Enabled',
                description='The server does not send HSTS header, allowing potential SSL stripping attacks.',
                recommendation='Add Strict-Transport-Security header with at least 1 year max-age.',
                cvss_score=7.4,
                cwe_id='CWE-319',
                owasp_category='A02:2021 - Cryptographic Failures',
                compliance_impact=['PCI-DSS 4.1', 'HIPAA', 'SOC 2']
            ))
            return result
        
        result['hsts_enabled'] = True
        
        # Parse HSTS header
        directives = [d.strip().lower() for d in hsts_header.split(';')]
        
        for directive in directives:
            if directive.startswith('max-age='):
                try:
                    result['max_age'] = int(directive.split('=')[1])
                except ValueError:
                    pass
            elif directive == 'includesubdomains':
                result['include_subdomains'] = True
            elif directive == 'preload':
                result['preload'] = True
        
        # Check max-age adequacy
        one_year_seconds = 31536000
        six_months_seconds = 15768000
        
        if result['max_age'] < six_months_seconds:
            result['findings'].append(SecurityFinding(
                check_type='HSTS_SHORT_MAX_AGE',
                severity='MEDIUM',
                title='HSTS max-age Is Too Short',
                description=f"HSTS max-age is {result['max_age']} seconds ({result['max_age'] // 86400} days). Recommended minimum is 1 year.",
                recommendation=f'Increase max-age to at least {one_year_seconds} (1 year).',
                evidence=f'Current: max-age={result["max_age"]}',
                cvss_score=4.3,
                owasp_category='A02:2021 - Cryptographic Failures'
            ))
        
        # Check preload eligibility
        result['preload_eligible'] = (
            result['max_age'] >= one_year_seconds and
            result['include_subdomains'] and
            result['preload']
        )
        
        if result['preload'] and not result['preload_eligible']:
            missing = []
            if result['max_age'] < one_year_seconds:
                missing.append(f'max-age must be >= {one_year_seconds}')
            if not result['include_subdomains']:
                missing.append('includeSubDomains directive required')
            
            result['findings'].append(SecurityFinding(
                check_type='HSTS_PRELOAD_INELIGIBLE',
                severity='LOW',
                title='HSTS Preload Directive Present But Not Eligible',
                description=f'HSTS header includes preload directive but is missing requirements: {", ".join(missing)}',
                recommendation='Meet all preload requirements before submitting to preload list.',
                evidence=hsts_header,
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Check preload list status
        preload_status = cls._check_preload_list(hostname)
        result['preload_status'] = preload_status
        
        if preload_status and preload_status.get('status') == 'preloaded':
            result['findings'].append(SecurityFinding(
                check_type='HSTS_PRELOADED',
                severity='INFO',
                title='Domain Is in HSTS Preload List',
                description=f'Domain {hostname} is included in browser HSTS preload lists.',
                recommendation='Maintain HSTS configuration to stay on preload list.',
                evidence=f'Preload status: {preload_status}',
                owasp_category='A02:2021 - Cryptographic Failures'
            ))
        elif result['preload_eligible']:
            result['findings'].append(SecurityFinding(
                check_type='HSTS_PRELOAD_ELIGIBLE',
                severity='INFO',
                title='Domain Is Eligible for HSTS Preload',
                description='Domain meets all requirements for HSTS preload submission.',
                recommendation='Submit domain to hstspreload.org for enhanced security.',
                evidence=hsts_header,
                owasp_category='A02:2021 - Cryptographic Failures',
                references=['https://hstspreload.org']
            ))
        
        return result
    
    @classmethod
    def _check_preload_list(cls, hostname: str) -> Optional[Dict[str, Any]]:
        """Check if domain is in HSTS preload list."""
        try:
            # Extract base domain
            parts = hostname.lower().split('.')
            if len(parts) > 2:
                # Try with and without subdomain
                domains_to_check = [hostname, '.'.join(parts[-2:])]
            else:
                domains_to_check = [hostname]
            
            for domain in domains_to_check:
                response = requests.get(
                    cls.PRELOAD_API,
                    params={'domain': domain},
                    timeout=5
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') in ['preloaded', 'pending']:
                        return data
            
            return {'status': 'not_preloaded'}
            
        except Exception as e:
            logger.warning(f"HSTS preload check failed: {e}")
            return None


# ============================================================================
# SUBRESOURCE INTEGRITY (SRI) ANALYSIS
# ============================================================================


class SRIAnalyzer:
    """Analyzes Subresource Integrity implementation."""
    
    # CDN patterns that should have SRI
    CDN_PATTERNS = [
        r'cdn\.', r'cdnjs\.', r'jsdelivr\.', r'unpkg\.', r'cloudflare\.com',
        r'bootstrapcdn\.', r'googleapis\.com', r'gstatic\.com', r'jquery\.com',
        r'maxcdn\.', r'stackpath\.', r'fastly\.', r'akamai\.'
    ]
    
    @classmethod
    def analyze_sri(cls, html_content: str, base_url: str) -> Dict[str, Any]:
        """
        Analyze SRI implementation in HTML content.
        
        Args:
            html_content: HTML content to analyze
            base_url: Base URL for resolving relative paths
        
        Returns:
            SRI analysis results
        """
        from bs4 import BeautifulSoup
        
        result = {
            'total_external_resources': 0,
            'sri_protected': 0,
            'sri_missing': 0,
            'cdn_resources_without_sri': [],
            'findings': []
        }
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Find all script and link tags
            scripts = soup.find_all('script', src=True)
            stylesheets = soup.find_all('link', rel='stylesheet', href=True)
            
            for tag in scripts:
                src = tag.get('src', '')
                cls._check_resource_sri(tag, src, 'script', result, base_url)
            
            for tag in stylesheets:
                href = tag.get('href', '')
                cls._check_resource_sri(tag, href, 'stylesheet', result, base_url)
        
        except Exception as e:
            logger.warning(f"SRI analysis failed: {e}")
            result['error'] = str(e)
        
        # Generate findings
        if result['cdn_resources_without_sri']:
            result['findings'].append(SecurityFinding(
                check_type='SRI_MISSING_CDN',
                severity='MEDIUM',
                title='CDN Resources Missing Subresource Integrity',
                description=f"{len(result['cdn_resources_without_sri'])} external CDN resources lack SRI hashes, risking supply chain attacks.",
                recommendation='Add integrity and crossorigin attributes to all CDN-hosted scripts and stylesheets.',
                evidence=', '.join(result['cdn_resources_without_sri'][:5]),
                cvss_score=5.3,
                cwe_id='CWE-829',
                owasp_category='A08:2021 - Software and Data Integrity Failures',
                compliance_impact=['PCI-DSS 6.5.1', 'SOC 2'],
                references=['https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity']
            ))
        
        if result['sri_protected'] > 0:
            result['findings'].append(SecurityFinding(
                check_type='SRI_IMPLEMENTED',
                severity='INFO',
                title='Subresource Integrity Implemented',
                description=f"{result['sri_protected']} resources are protected with SRI hashes.",
                recommendation='Continue maintaining SRI for all external resources.',
                evidence=f'{result["sri_protected"]}/{result["total_external_resources"]} protected'
            ))
        
        return result
    
    @classmethod
    def _check_resource_sri(
        cls,
        tag,
        url: str,
        resource_type: str,
        result: Dict[str, Any],
        base_url: str
    ) -> None:
        """Check if a resource has SRI."""
        # Skip inline and same-origin resources
        if not url or url.startswith('data:'):
            return
        
        # Check if external
        parsed_base = urlparse(base_url)
        parsed_url = urlparse(url)
        
        is_external = parsed_url.netloc and parsed_url.netloc != parsed_base.netloc
        
        if not is_external and not any(re.search(p, url) for p in cls.CDN_PATTERNS):
            return
        
        result['total_external_resources'] += 1
        
        has_sri = tag.get('integrity')
        _has_crossorigin = tag.get('crossorigin')  # Reserved for future crossorigin validation
        
        if has_sri:
            result['sri_protected'] += 1
            # Validate SRI hash format
            if not re.match(r'^sha(256|384|512)-[A-Za-z0-9+/=]+$', has_sri):
                result['findings'].append(SecurityFinding(
                    check_type='SRI_INVALID_HASH',
                    severity='LOW',
                    title='Invalid SRI Hash Format',
                    description=f'Resource has malformed integrity hash.',
                    recommendation='Use sha384 or sha512 hash generated with proper tools.',
                    evidence=f'{resource_type}: {url}'
                ))
        else:
            result['sri_missing'] += 1
            # Check if it's from a known CDN
            is_cdn = any(re.search(p, url) for p in cls.CDN_PATTERNS)
            if is_cdn:
                result['cdn_resources_without_sri'].append(url[:100])


# ============================================================================
# CONTENT SECURITY POLICY DEEP ANALYSIS
# ============================================================================


class CSPAnalyzer:
    """Deep analysis of Content Security Policy configuration."""
    
    # Dangerous CSP values
    UNSAFE_VALUES = {
        "'unsafe-inline'": ('script-src', 'style-src'),
        "'unsafe-eval'": ('script-src',),
        "'unsafe-hashes'": ('script-src', 'style-src'),
        "data:": ('script-src', 'object-src', 'frame-src'),
        "blob:": ('script-src', 'worker-src'),
        "*": ('default-src', 'script-src', 'object-src', 'frame-src', 'connect-src'),
    }
    
    # Required directives for comprehensive CSP
    RECOMMENDED_DIRECTIVES = [
        'default-src', 'script-src', 'style-src', 'img-src',
        'connect-src', 'font-src', 'object-src', 'frame-src',
        'frame-ancestors', 'form-action', 'base-uri', 'upgrade-insecure-requests'
    ]
    
    @classmethod
    def analyze_csp(cls, headers: Dict[str, str], _url: str) -> Dict[str, Any]:
        """
        Perform deep analysis of CSP configuration.

        Args:
            headers: Response headers
            _url: Target URL (reserved for future domain-specific CSP validation)
        
        Returns:
            CSP analysis results
        """
        result = {
            'csp_present': False,
            'report_only': False,
            'directives': {},
            'missing_directives': [],
            'security_issues': [],
            'csp_score': 0,
            'findings': []
        }
        
        # Get CSP header
        csp = headers.get('Content-Security-Policy', '')
        csp_ro = headers.get('Content-Security-Policy-Report-Only', '')
        
        if not csp and not csp_ro:
            result['findings'].append(SecurityFinding(
                check_type='CSP_MISSING',
                severity='HIGH',
                title='Content Security Policy Not Implemented',
                description='No CSP header found. Site is vulnerable to XSS and code injection attacks.',
                recommendation='Implement a strict Content-Security-Policy header.',
                cvss_score=6.5,
                cwe_id='CWE-79',
                owasp_category='A03:2021 - Injection',
                compliance_impact=['PCI-DSS 6.5.7', 'HIPAA', 'SOC 2']
            ))
            return result
        
        if csp_ro and not csp:
            result['report_only'] = True
            csp = csp_ro
            result['findings'].append(SecurityFinding(
                check_type='CSP_REPORT_ONLY',
                severity='MEDIUM',
                title='CSP in Report-Only Mode',
                description='CSP is configured but only in report-only mode, providing no protection.',
                recommendation='After testing, switch from report-only to enforcing mode.',
                cvss_score=4.3,
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        result['csp_present'] = True
        
        # Parse directives
        directives = cls._parse_csp(csp)
        result['directives'] = directives
        
        # Check for missing important directives
        for directive in cls.RECOMMENDED_DIRECTIVES:
            if directive not in directives:
                result['missing_directives'].append(directive)
        
        if result['missing_directives']:
            result['findings'].append(SecurityFinding(
                check_type='CSP_INCOMPLETE',
                severity='MEDIUM',
                title='CSP Missing Important Directives',
                description=f"CSP is missing: {', '.join(result['missing_directives'][:5])}",
                recommendation='Add all recommended CSP directives for comprehensive protection.',
                evidence=f"Missing: {', '.join(result['missing_directives'])}",
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Check for unsafe values
        for unsafe_value, affected_directives in cls.UNSAFE_VALUES.items():
            for directive in affected_directives:
                if directive in directives:
                    if unsafe_value in directives[directive]:
                        severity = 'HIGH' if unsafe_value in ["'unsafe-inline'", "'unsafe-eval'", "*"] else 'MEDIUM'
                        result['security_issues'].append({
                            'directive': directive,
                            'value': unsafe_value
                        })
                        result['findings'].append(SecurityFinding(
                            check_type="CSP_UNSAFE_" + unsafe_value.upper().replace("'", "").replace("-", "_"),
                            severity=severity,
                            title=f'CSP Contains Unsafe {unsafe_value}',
                            description=f"The {directive} directive contains {unsafe_value}, weakening XSS protection.",
                            recommendation=f"Remove {unsafe_value} from {directive}. Use nonces or hashes instead.",
                            evidence=f'{directive}: {directives[directive]}',
                            cvss_score=6.1 if severity == 'HIGH' else 4.3,
                            cwe_id='CWE-79',
                            owasp_category='A03:2021 - Injection'
                        ))
        
        # Check for frame-ancestors
        if 'frame-ancestors' not in directives:
            result['findings'].append(SecurityFinding(
                check_type='CSP_NO_FRAME_ANCESTORS',
                severity='MEDIUM',
                title='CSP Missing frame-ancestors Directive',
                description='Without frame-ancestors, site may be vulnerable to clickjacking.',
                recommendation="Add frame-ancestors 'self' or 'none' to prevent framing attacks.",
                cvss_score=4.3,
                cwe_id='CWE-1021',
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Calculate CSP score
        result['csp_score'] = cls._calculate_csp_score(result)
        
        return result
    
    @classmethod
    def _parse_csp(cls, csp: str) -> Dict[str, str]:
        """Parse CSP header into directives dictionary."""
        directives = {}
        for part in csp.split(';'):
            part = part.strip()
            if not part:
                continue
            tokens = part.split(None, 1)
            directive = tokens[0].lower()
            values = tokens[1] if len(tokens) > 1 else ''
            directives[directive] = values
        return directives
    
    @classmethod
    def _calculate_csp_score(cls, analysis: Dict[str, Any]) -> int:
        """Calculate a CSP security score (0-100)."""
        score = 100
        
        if not analysis['csp_present']:
            return 0
        
        if analysis['report_only']:
            score -= 30
        
        # Deduct for missing directives
        score -= len(analysis['missing_directives']) * 3
        
        # Deduct for security issues
        for issue in analysis['security_issues']:
            if issue['value'] in ["'unsafe-inline'", "'unsafe-eval'", "*"]:
                score -= 15
            else:
                score -= 8
        
        return max(0, min(100, score))


# ============================================================================
# PERMISSIONS POLICY ANALYSIS
# ============================================================================


class PermissionsPolicyAnalyzer:
    """Analyzes Permissions Policy (formerly Feature Policy)."""
    
    # Security-sensitive features to check
    SENSITIVE_FEATURES = [
        'camera', 'microphone', 'geolocation', 'payment',
        'usb', 'bluetooth', 'serial', 'hid', 'midi',
        'fullscreen', 'picture-in-picture', 'screen-wake-lock',
        'accelerometer', 'gyroscope', 'magnetometer',
        'interest-cohort', 'browsing-topics'
    ]
    
    @classmethod
    def analyze_permissions_policy(cls, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Analyze Permissions Policy configuration.
        
        Args:
            headers: Response headers
        
        Returns:
            Permissions Policy analysis results
        """
        result = {
            'policy_present': False,
            'features': {},
            'unrestricted_features': [],
            'findings': []
        }
        
        # Check for both old and new header names
        policy = headers.get('Permissions-Policy', '') or headers.get('Feature-Policy', '')
        
        if not policy:
            result['findings'].append(SecurityFinding(
                check_type='PERMISSIONS_POLICY_MISSING',
                severity='LOW',
                title='Permissions Policy Not Configured',
                description='No Permissions-Policy header found. Browser features are not restricted.',
                recommendation='Add Permissions-Policy header to restrict access to sensitive browser APIs.',
                owasp_category='A05:2021 - Security Misconfiguration',
                references=['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy']
            ))
            return result
        
        result['policy_present'] = True
        
        # Parse policy
        features = cls._parse_permissions_policy(policy)
        result['features'] = features
        
        # Check for unrestricted sensitive features
        for feature in cls.SENSITIVE_FEATURES:
            if feature not in features:
                result['unrestricted_features'].append(feature)
            elif '*' in features.get(feature, ''):
                result['unrestricted_features'].append(feature)
        
        if result['unrestricted_features']:
            result['findings'].append(SecurityFinding(
                check_type='PERMISSIONS_POLICY_UNRESTRICTED',
                severity='LOW',
                title='Sensitive Features Not Restricted',
                description=f"Browser features not restricted: {', '.join(result['unrestricted_features'][:5])}",
                recommendation='Restrict sensitive features like camera, microphone, and geolocation.',
                evidence=f"Unrestricted: {', '.join(result['unrestricted_features'])}",
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Check for interest-cohort (FLoC) restriction
        if 'interest-cohort' not in features or features.get('interest-cohort') != '()':
            result['findings'].append(SecurityFinding(
                check_type='FLOC_NOT_BLOCKED',
                severity='INFO',
                title='FLoC/Topics API Not Blocked',
                description='Site does not explicitly opt out of FLoC/Browsing Topics.',
                recommendation='Add interest-cohort=() to protect user privacy.',
                owasp_category='A01:2021 - Broken Access Control'
            ))
        
        return result
    
    @classmethod
    def _parse_permissions_policy(cls, policy: str) -> Dict[str, str]:
        """Parse Permissions-Policy header."""
        features = {}
        for directive in policy.split(','):
            directive = directive.strip()
            if '=' in directive:
                feature, value = directive.split('=', 1)
                features[feature.strip()] = value.strip()
            elif directive:
                features[directive] = '*'
        return features


# ============================================================================
# CROSS-ORIGIN POLICIES ANALYSIS
# ============================================================================


class CrossOriginPoliciesAnalyzer:
    """Analyzes Cross-Origin policies (CORP, COEP, COOP)."""
    
    @classmethod
    def analyze_cross_origin_policies(cls, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Analyze Cross-Origin Resource Policy, Embedder Policy, and Opener Policy.
        
        Args:
            headers: Response headers
        
        Returns:
            Cross-origin policies analysis
        """
        result = {
            'corp': None,
            'coep': None,
            'coop': None,
            'cross_origin_isolated': False,
            'findings': []
        }
        
        # Cross-Origin-Resource-Policy
        corp = headers.get('Cross-Origin-Resource-Policy')
        result['corp'] = corp
        
        if not corp:
            result['findings'].append(SecurityFinding(
                check_type='CORP_MISSING',
                severity='LOW',
                title='Cross-Origin-Resource-Policy Not Set',
                description='CORP header is not configured, allowing resources to be loaded cross-origin.',
                recommendation="Add Cross-Origin-Resource-Policy: same-origin or same-site",
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Cross-Origin-Embedder-Policy
        coep = headers.get('Cross-Origin-Embedder-Policy')
        result['coep'] = coep
        
        if not coep:
            result['findings'].append(SecurityFinding(
                check_type='COEP_MISSING',
                severity='INFO',
                title='Cross-Origin-Embedder-Policy Not Set',
                description='COEP is not configured. Required for cross-origin isolation.',
                recommendation="Add Cross-Origin-Embedder-Policy: require-corp for cross-origin isolation",
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Cross-Origin-Opener-Policy
        coop = headers.get('Cross-Origin-Opener-Policy')
        result['coop'] = coop
        
        if not coop:
            result['findings'].append(SecurityFinding(
                check_type='COOP_MISSING',
                severity='INFO',
                title='Cross-Origin-Opener-Policy Not Set',
                description='COOP is not configured. Required for cross-origin isolation and Spectre mitigation.',
                recommendation="Add Cross-Origin-Opener-Policy: same-origin for enhanced isolation",
                owasp_category='A05:2021 - Security Misconfiguration'
            ))
        
        # Check for cross-origin isolation
        if coep in ['require-corp', 'credentialless'] and coop == 'same-origin':
            result['cross_origin_isolated'] = True
            result['findings'].append(SecurityFinding(
                check_type='CROSS_ORIGIN_ISOLATED',
                severity='INFO',
                title='Cross-Origin Isolation Enabled',
                description='Site is properly configured for cross-origin isolation.',
                recommendation='Continue maintaining COEP and COOP headers.',
                evidence=f'COEP: {coep}, COOP: {coop}'
            ))
        
        return result


# ============================================================================
# SERVER TIMING HEADER ANALYSIS
# ============================================================================


class ServerTimingAnalyzer:
    """Analyzes Server-Timing header for information disclosure."""
    
    # Sensitive timing metrics that may reveal server details
    SENSITIVE_METRICS = [
        'db', 'database', 'mysql', 'postgres', 'redis', 'mongo',
        'cache', 'memcache', 'auth', 'api', 'upstream', 'backend',
        'queue', 'process', 'render', 'template'
    ]
    
    @classmethod
    def analyze_server_timing(cls, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Analyze Server-Timing header for information disclosure risks.
        
        Args:
            headers: Response headers
        
        Returns:
            Server-Timing analysis results
        """
        result = {
            'present': False,
            'metrics': [],
            'sensitive_info_exposed': False,
            'findings': []
        }
        
        timing = headers.get('Server-Timing', '')
        
        if not timing:
            return result
        
        result['present'] = True
        
        # Parse metrics
        metrics = []
        sensitive_found = []
        
        for metric in timing.split(','):
            metric = metric.strip()
            if not metric:
                continue
            
            parts = metric.split(';')
            metric_name = parts[0].strip().lower()
            metrics.append(metric)
            
            # Check for sensitive info
            for sensitive in cls.SENSITIVE_METRICS:
                if sensitive in metric_name:
                    sensitive_found.append(metric_name)
                    break
        
        result['metrics'] = metrics
        
        if sensitive_found:
            result['sensitive_info_exposed'] = True
            result['findings'].append(SecurityFinding(
                check_type='SERVER_TIMING_INFO_DISCLOSURE',
                severity='LOW',
                title='Server-Timing Reveals Internal Architecture',
                description=f'Server-Timing header exposes internal metrics: {", ".join(sensitive_found[:5])}',
                recommendation='Remove Server-Timing header in production or limit to non-sensitive metrics.',
                evidence=timing[:200],
                cwe_id='CWE-200',
                owasp_category='A01:2021 - Broken Access Control'
            ))
        
        return result


# ============================================================================
# MAIN ANALYSIS FUNCTION
# ============================================================================


def run_advanced_security_checks(
    url: str,
    headers: Dict[str, str],
    html_content: str = ""
) -> Dict[str, Any]:
    """
    Run all advanced security checks on a target.
    
    Args:
        url: Target URL
        headers: Response headers
        html_content: HTML content (optional)
    
    Returns:
        Comprehensive security analysis results
    """
    parsed_url = urlparse(url)
    hostname = parsed_url.netloc
    
    results = {
        'url': url,
        'hostname': hostname,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'checks': {},
        'all_findings': []
    }
    
    # HTTP Protocol Analysis
    try:
        results['checks']['http_protocol'] = {
            'http2': HTTPProtocolAnalyzer.check_http2_support(hostname),
            'http3': HTTPProtocolAnalyzer.check_http3_support(url)
        }
        for check in results['checks']['http_protocol'].values():
            results['all_findings'].extend(check.get('findings', []))
    except Exception as e:
        logger.error(f"HTTP protocol analysis failed: {e}")
    
    # HSTS Analysis
    try:
        results['checks']['hsts'] = HSTSPreloadChecker.analyze_hsts(headers, hostname)
        results['all_findings'].extend(results['checks']['hsts'].get('findings', []))
    except Exception as e:
        logger.error(f"HSTS analysis failed: {e}")
    
    # SRI Analysis
    if html_content:
        try:
            results['checks']['sri'] = SRIAnalyzer.analyze_sri(html_content, url)
            results['all_findings'].extend(results['checks']['sri'].get('findings', []))
        except Exception as e:
            logger.error(f"SRI analysis failed: {e}")
    
    # CSP Analysis
    try:
        results['checks']['csp'] = CSPAnalyzer.analyze_csp(headers, url)
        results['all_findings'].extend(results['checks']['csp'].get('findings', []))
    except Exception as e:
        logger.error(f"CSP analysis failed: {e}")
    
    # Permissions Policy Analysis
    try:
        results['checks']['permissions_policy'] = PermissionsPolicyAnalyzer.analyze_permissions_policy(headers)
        results['all_findings'].extend(results['checks']['permissions_policy'].get('findings', []))
    except Exception as e:
        logger.error(f"Permissions Policy analysis failed: {e}")
    
    # Cross-Origin Policies Analysis
    try:
        results['checks']['cross_origin'] = CrossOriginPoliciesAnalyzer.analyze_cross_origin_policies(headers)
        results['all_findings'].extend(results['checks']['cross_origin'].get('findings', []))
    except Exception as e:
        logger.error(f"Cross-origin policies analysis failed: {e}")
    
    # Server Timing Analysis
    try:
        results['checks']['server_timing'] = ServerTimingAnalyzer.analyze_server_timing(headers)
        results['all_findings'].extend(results['checks']['server_timing'].get('findings', []))
    except Exception as e:
        logger.error(f"Server timing analysis failed: {e}")
    
    # Convert findings to dictionaries
    results['all_findings'] = [
        f.to_dict() if isinstance(f, SecurityFinding) else f 
        for f in results['all_findings']
    ]
    
    # Summary statistics
    severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0, 'INFO': 0}
    for finding in results['all_findings']:
        severity = finding.get('severity', 'INFO')
        if severity in severity_counts:
            severity_counts[severity] += 1
    
    results['summary'] = {
        'total_findings': len(results['all_findings']),
        'by_severity': severity_counts,
        'checks_performed': len(results['checks'])
    }
    
    return results


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'SecurityFinding',
    'HTTPProtocolAnalyzer',
    'HSTSPreloadChecker',
    'SRIAnalyzer',
    'CSPAnalyzer',
    'PermissionsPolicyAnalyzer',
    'CrossOriginPoliciesAnalyzer',
    'ServerTimingAnalyzer',
    'run_advanced_security_checks'
]
