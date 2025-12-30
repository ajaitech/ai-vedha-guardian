#!/usr/bin/env python3
"""
AiVedha Guard - Test Runner
Version: 4.0.0

Convenience script for running the test suite with common options.

Usage:
    python run_tests.py              # Run all tests
    python run_tests.py --unit       # Run only unit tests
    python run_tests.py --quick      # Run tests excluding slow tests
    python run_tests.py --coverage   # Run with coverage report
    python run_tests.py --verbose    # Run with verbose output

Owner: Aravind Jayamohan
Company: AiVibe Software Services Pvt Ltd
"""

import argparse
import subprocess
import sys
import os


def main():
    parser = argparse.ArgumentParser(description='Run AiVedha Guard test suite')
    parser.add_argument('--unit', action='store_true', help='Run only unit tests')
    parser.add_argument('--integration', action='store_true', help='Run only integration tests')
    parser.add_argument('--quick', action='store_true', help='Exclude slow tests')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--live-api', action='store_true', help='Enable live API testing')
    parser.add_argument('test_file', nargs='?', help='Specific test file to run')

    args = parser.parse_args()

    # Build pytest command
    cmd = ['python', '-m', 'pytest']

    # Test directory
    test_dir = os.path.dirname(os.path.abspath(__file__))

    # Add specific file or directory
    if args.test_file:
        cmd.append(args.test_file)
    else:
        cmd.append(test_dir)

    # Add markers
    if args.unit:
        cmd.extend(['-m', 'unit or (not integration and not e2e)'])
    elif args.integration:
        cmd.extend(['-m', 'integration'])

    if args.quick:
        cmd.extend(['-m', 'not slow'])

    # Verbose
    if args.verbose:
        cmd.append('-v')
    else:
        cmd.append('-q')

    # Coverage
    if args.coverage:
        cmd.extend([
            '--cov=..',
            '--cov-report=term-missing',
            '--cov-report=html:htmlcov'
        ])

    # Environment for live API testing
    env = os.environ.copy()
    if args.live_api:
        env['USE_LIVE_API'] = 'true'

    # Output format
    cmd.extend(['--tb=short', '-ra'])

    print(f"Running: {' '.join(cmd)}")
    print("-" * 60)

    # Run pytest
    result = subprocess.run(cmd, env=env)

    # Print coverage info if generated
    if args.coverage and result.returncode == 0:
        print("\nCoverage report generated in htmlcov/index.html")

    return result.returncode


if __name__ == '__main__':
    sys.exit(main())
