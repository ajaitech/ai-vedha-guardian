"""
AiVedha Guard - Advanced URL Validation Module
Version: 4.0.0

Comprehensive URL validation with support for all URL types:
- Standard HTTP/HTTPS URLs
- IP addresses (IPv4/IPv6)
- International Domain Names (IDN/Punycode)
- Custom ports
- Subdomains
- Query strings and fragments

Security Features:
- Blocks private/internal IP ranges
- Blocks localhost and loopback addresses
- Validates DNS resolution
- Prevents SSRF attacks

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import re
import socket
import ipaddress
from urllib.parse import urlparse, urlunparse
from typing import Tuple, Optional, Dict
import idna


class URLValidationError(Exception):
    """Custom exception for URL validation errors."""
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code
        self.message = message


class URLValidator:
    """
    Advanced URL validator with comprehensive checks for security auditing.
    """

    # Private IP ranges that should be blocked
    PRIVATE_IP_RANGES = [
        ipaddress.ip_network('10.0.0.0/8'),
        ipaddress.ip_network('172.16.0.0/12'),
        ipaddress.ip_network('192.168.0.0/16'),
        ipaddress.ip_network('127.0.0.0/8'),  # Loopback
        ipaddress.ip_network('169.254.0.0/16'),  # Link-local
        ipaddress.ip_network('0.0.0.0/8'),  # Current network
        ipaddress.ip_network('224.0.0.0/4'),  # Multicast
        ipaddress.ip_network('240.0.0.0/4'),  # Reserved
        ipaddress.ip_network('255.255.255.255/32'),  # Broadcast
    ]

    PRIVATE_IPV6_RANGES = [
        ipaddress.ip_network('::1/128'),  # Loopback
        ipaddress.ip_network('fc00::/7'),  # Unique local
        ipaddress.ip_network('fe80::/10'),  # Link-local
        ipaddress.ip_network('ff00::/8'),  # Multicast
    ]

    # Blocked hostnames
    BLOCKED_HOSTNAMES = [
        'localhost',
        'localhost.localdomain',
        'local',
        'broadcasthost',
        'ip6-localhost',
        'ip6-loopback',
    ]

    # Blocked TLDs (test/special use)
    BLOCKED_TLDS = [
        'test',
        'example',
        'invalid',
        'localhost',
        'local',
        'onion',  # Tor - requires special handling
    ]

    # Maximum URL length
    MAX_URL_LENGTH = 2048

    # Valid schemes
    VALID_SCHEMES = ['http', 'https']

    # Port range
    MIN_PORT = 1
    MAX_PORT = 65535
    COMMON_HTTP_PORTS = [80, 443, 8080, 8443, 8000, 8888, 3000, 5000]

    @classmethod
    def validate(cls, url: str, allow_ip: bool = True, resolve_dns: bool = True) -> Tuple[bool, str, Dict]:
        """
        Validate a URL for security auditing.

        Args:
            url: The URL to validate
            allow_ip: Whether to allow IP addresses as hosts
            resolve_dns: Whether to resolve DNS and validate the IP

        Returns:
            Tuple of (is_valid, normalized_url, metadata)

        Raises:
            URLValidationError: If URL is invalid or blocked
        """
        metadata = {
            'original_url': url,
            'is_ip': False,
            'is_ipv6': False,
            'is_idn': False,
            'port': None,
            'resolved_ips': [],
            'warnings': []
        }

        # Check URL length
        if len(url) > cls.MAX_URL_LENGTH:
            raise URLValidationError(
                f'URL exceeds maximum length of {cls.MAX_URL_LENGTH} characters',
                'URL_TOO_LONG'
            )

        # Strip whitespace
        url = url.strip()

        # Add scheme if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
            metadata['warnings'].append('Added https:// scheme')

        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception as e:
            raise URLValidationError(f'Invalid URL format: {str(e)}', 'INVALID_FORMAT')

        # Validate scheme
        if parsed.scheme.lower() not in cls.VALID_SCHEMES:
            raise URLValidationError(
                f'Invalid scheme: {parsed.scheme}. Only HTTP and HTTPS are allowed.',
                'INVALID_SCHEME'
            )

        # Get hostname
        hostname = parsed.hostname
        if not hostname:
            raise URLValidationError('URL must have a valid hostname', 'MISSING_HOSTNAME')

        hostname = hostname.lower()

        # Check for blocked hostnames
        if hostname in cls.BLOCKED_HOSTNAMES:
            raise URLValidationError(
                f'Hostname "{hostname}" is not allowed for security audits',
                'BLOCKED_HOSTNAME'
            )

        # Check for blocked TLDs
        tld = hostname.split('.')[-1] if '.' in hostname else hostname
        if tld in cls.BLOCKED_TLDS:
            raise URLValidationError(
                f'TLD ".{tld}" is not allowed for security audits',
                'BLOCKED_TLD'
            )

        # Check port
        port = parsed.port
        if port:
            metadata['port'] = port
            if not (cls.MIN_PORT <= port <= cls.MAX_PORT):
                raise URLValidationError(
                    f'Port {port} is out of valid range (1-65535)',
                    'INVALID_PORT'
                )
            if port not in cls.COMMON_HTTP_PORTS:
                metadata['warnings'].append(f'Uncommon port {port} specified')

        # Check if hostname is an IP address
        ip_address = cls._parse_ip_address(hostname)

        if ip_address:
            metadata['is_ip'] = True
            metadata['is_ipv6'] = ip_address.version == 6

            if not allow_ip:
                raise URLValidationError(
                    'IP addresses are not allowed. Please use a domain name.',
                    'IP_NOT_ALLOWED'
                )

            # Check if IP is private/blocked
            cls._check_ip_blocked(ip_address)
            metadata['resolved_ips'] = [str(ip_address)]

        else:
            # Handle IDN (International Domain Names)
            try:
                ascii_hostname = idna.encode(hostname).decode('ascii')
                if ascii_hostname != hostname:
                    metadata['is_idn'] = True
                    metadata['idn_ascii'] = ascii_hostname
                    hostname = ascii_hostname
            except idna.core.InvalidCodepoint:
                raise URLValidationError(
                    'Invalid characters in domain name',
                    'INVALID_DOMAIN_CHARS'
                )
            except Exception:
                pass  # Continue with original hostname

            # Validate domain format
            if not cls._is_valid_domain(hostname):
                raise URLValidationError(
                    f'Invalid domain format: {hostname}',
                    'INVALID_DOMAIN_FORMAT'
                )

            # DNS resolution check
            if resolve_dns:
                try:
                    resolved_ips = cls._resolve_hostname(hostname)
                    metadata['resolved_ips'] = resolved_ips

                    # Check each resolved IP for private ranges
                    for ip_str in resolved_ips:
                        try:
                            ip = ipaddress.ip_address(ip_str)
                            cls._check_ip_blocked(ip)
                        except ValueError:
                            continue

                except socket.gaierror as e:
                    raise URLValidationError(
                        f'DNS resolution failed for {hostname}: {str(e)}',
                        'DNS_RESOLUTION_FAILED'
                    )

        # Reconstruct normalized URL
        normalized = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path or '/',
            parsed.params,
            parsed.query,
            ''  # Remove fragment for security scans
        ))

        metadata['normalized_url'] = normalized

        return True, normalized, metadata

    @classmethod
    def _parse_ip_address(cls, hostname: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
        """Parse hostname as IP address if possible."""
        try:
            # Handle IPv6 with brackets
            if hostname.startswith('[') and hostname.endswith(']'):
                hostname = hostname[1:-1]
            return ipaddress.ip_address(hostname)
        except ValueError:
            return None

    @classmethod
    def _check_ip_blocked(cls, ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
        """Check if IP address is in blocked ranges."""
        if ip.version == 4:
            for network in cls.PRIVATE_IP_RANGES:
                if ip in network:
                    raise URLValidationError(
                        f'IP address {ip} is in a private/reserved range and cannot be audited',
                        'PRIVATE_IP_BLOCKED'
                    )
        else:
            for network in cls.PRIVATE_IPV6_RANGES:
                if ip in network:
                    raise URLValidationError(
                        f'IP address {ip} is in a private/reserved range and cannot be audited',
                        'PRIVATE_IP_BLOCKED'
                    )

        # Check for loopback
        if ip.is_loopback:
            raise URLValidationError(
                'Loopback addresses are not allowed',
                'LOOPBACK_BLOCKED'
            )

        # Check for link-local
        if ip.is_link_local:
            raise URLValidationError(
                'Link-local addresses are not allowed',
                'LINK_LOCAL_BLOCKED'
            )

        # Check for multicast
        if ip.is_multicast:
            raise URLValidationError(
                'Multicast addresses are not allowed',
                'MULTICAST_BLOCKED'
            )

    @classmethod
    def _is_valid_domain(cls, domain: str) -> bool:
        """Validate domain name format."""
        if not domain or len(domain) > 253:
            return False

        # Domain regex pattern
        # Allows subdomains, hyphens, but not starting/ending with hyphen
        domain_pattern = re.compile(
            r'^(?:[a-zA-Z0-9]'  # First character of label
            r'(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)'  # Rest of label
            r'*[a-zA-Z0-9]'  # First character of TLD
            r'[a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$'  # Rest of TLD
        )

        # Simpler validation for basic domains
        parts = domain.split('.')
        if len(parts) < 2:
            return False

        for part in parts:
            if not part:
                return False
            if len(part) > 63:
                return False
            if part.startswith('-') or part.endswith('-'):
                return False
            if not re.match(r'^[a-zA-Z0-9-]+$', part):
                return False

        # TLD must be at least 2 characters and alphabetic
        tld = parts[-1]
        if len(tld) < 2 or not tld.isalpha():
            return False

        return True

    @classmethod
    def _resolve_hostname(cls, hostname: str) -> list:
        """Resolve hostname to IP addresses."""
        try:
            # Get all IP addresses for the hostname
            results = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            ips = list(set([result[4][0] for result in results]))
            return ips
        except socket.gaierror:
            raise


def validate_audit_url(url: str) -> Tuple[bool, str, Dict]:
    """
    Convenience function to validate a URL for security auditing.

    Args:
        url: The URL to validate

    Returns:
        Tuple of (is_valid, normalized_url, metadata)
    """
    return URLValidator.validate(url)


def normalize_url(url: str) -> str:
    """
    Normalize a URL for consistent comparison.

    Args:
        url: The URL to normalize

    Returns:
        Normalized URL string
    """
    _, normalized, _ = URLValidator.validate(url, resolve_dns=False)
    return normalized


# Example usage and tests
if __name__ == '__main__':
    test_urls = [
        'https://example.com',
        'http://subdomain.example.com:8080/path?query=1',
        'example.com',  # Missing scheme
        'https://192.168.1.1',  # Private IP - should fail
        'https://10.0.0.1/admin',  # Private IP - should fail
        'https://127.0.0.1',  # Localhost - should fail
        'https://[::1]',  # IPv6 localhost - should fail
        'https://münchen.de',  # IDN domain
        'https://xn--mnchen-3ya.de',  # Punycode
        'https://example.test',  # Test TLD - should fail
        'localhost',  # Should fail
    ]

    for url in test_urls:
        try:
            valid, normalized, meta = validate_audit_url(url)
            print(f"✓ {url}")
            print(f"  Normalized: {normalized}")
            print(f"  Metadata: {meta}")
        except URLValidationError as e:
            print(f"✗ {url}")
            print(f"  Error: {e.message} (Code: {e.code})")
        print()
