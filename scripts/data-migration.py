#!/usr/bin/env python3
"""
AiVedha Guardian - Data Migration Script
Phase 14: Data Migration Plan

This script handles:
1. Adding scan_region field to existing audit reports
2. Adding static_ip field to reports
3. Validating data consistency across tables
4. Generating migration reports

IMPORTANT: Run in dry-run mode first to verify changes!
"""

import boto3
import json
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Any, Optional

# Configuration
AWS_REGION = 'us-east-1'
DRY_RUN = True  # Set to False to actually modify data

# Table names
TABLES = {
    'users': 'aivedha-guardian-users',
    'reports': 'aivedha-guardian-audit-reports',
    'credits': 'aivedha-guardian-credits',
    'subscriptions': 'aivedha-guardian-subscriptions',
    'certificates': 'aivedha-guardian-certificates',
}

# Region configuration
REGIONS = {
    'us-east-1': {
        'name': 'USA',
        'static_ip': '44.206.201.117',
    },
    'ap-south-1': {
        'name': 'India',
        'static_ip': '13.203.153.119',
    },
}

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)

class MigrationReport:
    """Track migration progress and results"""

    def __init__(self):
        self.started_at = datetime.utcnow()
        self.processed = 0
        self.updated = 0
        self.skipped = 0
        self.errors = []
        self.warnings = []

    def add_error(self, item_id: str, error: str):
        self.errors.append({'id': item_id, 'error': error, 'timestamp': datetime.utcnow().isoformat()})

    def add_warning(self, item_id: str, warning: str):
        self.warnings.append({'id': item_id, 'warning': warning})

    def to_dict(self) -> Dict[str, Any]:
        return {
            'started_at': self.started_at.isoformat(),
            'completed_at': datetime.utcnow().isoformat(),
            'duration_seconds': (datetime.utcnow() - self.started_at).total_seconds(),
            'processed': self.processed,
            'updated': self.updated,
            'skipped': self.skipped,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': self.errors[:10],  # First 10 errors
            'warnings': self.warnings[:10],  # First 10 warnings
        }

def migrate_audit_reports_add_region(report: MigrationReport) -> None:
    """
    Migration 1: Add scan_region and static_ip to existing audit reports
    Default all existing reports to us-east-1
    """
    print("\n=== Migration 1: Add scan_region to audit reports ===")

    table = dynamodb.Table(TABLES['reports'])

    # Scan for items without scan_region
    response = table.scan(
        FilterExpression='attribute_not_exists(scan_region)',
        ProjectionExpression='report_id, created_at, #url',
        ExpressionAttributeNames={'#url': 'url'}
    )

    items = response.get('Items', [])
    print(f"Found {len(items)} reports without scan_region")

    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression='attribute_not_exists(scan_region)',
            ProjectionExpression='report_id, created_at, #url',
            ExpressionAttributeNames={'#url': 'url'},
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response.get('Items', []))

    print(f"Total reports to migrate: {len(items)}")

    for item in items:
        report.processed += 1
        report_id = item.get('report_id')

        try:
            if DRY_RUN:
                print(f"  [DRY RUN] Would update report {report_id}")
                report.updated += 1
            else:
                table.update_item(
                    Key={'report_id': report_id},
                    UpdateExpression='SET scan_region = :region, static_ip = :ip, migrated_at = :ts',
                    ExpressionAttributeValues={
                        ':region': 'us-east-1',
                        ':ip': REGIONS['us-east-1']['static_ip'],
                        ':ts': datetime.utcnow().isoformat(),
                    }
                )
                report.updated += 1

                if report.updated % 100 == 0:
                    print(f"  Updated {report.updated} reports...")

        except Exception as e:
            report.add_error(report_id, str(e))
            print(f"  Error updating report {report_id}: {e}")

def validate_data_consistency(report: MigrationReport) -> None:
    """
    Validation: Check data consistency across tables
    """
    print("\n=== Validation: Data Consistency Check ===")

    # Check users table
    users_table = dynamodb.Table(TABLES['users'])
    users_response = users_table.scan(
        Select='COUNT'
    )
    user_count = users_response.get('Count', 0)
    print(f"Total users: {user_count}")

    # Check reports table
    reports_table = dynamodb.Table(TABLES['reports'])
    reports_response = reports_table.scan(
        Select='COUNT'
    )
    report_count = reports_response.get('Count', 0)
    print(f"Total reports: {report_count}")

    # Check subscriptions table
    subs_table = dynamodb.Table(TABLES['subscriptions'])
    subs_response = subs_table.scan(
        Select='COUNT'
    )
    sub_count = subs_response.get('Count', 0)
    print(f"Total subscriptions: {sub_count}")

    # Check for orphaned subscriptions (no matching user)
    print("\nChecking for data integrity issues...")

    # Get all user IDs
    users_response = users_table.scan(
        ProjectionExpression='user_id, email'
    )
    user_ids = set()
    user_emails = set()
    for user in users_response.get('Items', []):
        user_ids.add(user.get('user_id'))
        if user.get('email'):
            user_emails.add(user.get('email'))

    # Check subscriptions for orphaned records
    subs_response = subs_table.scan(
        ProjectionExpression='subscription_id, user_id, user_email'
    )

    orphaned_subs = 0
    for sub in subs_response.get('Items', []):
        user_id = sub.get('user_id')
        user_email = sub.get('user_email')

        if user_id and user_id not in user_ids:
            if user_email and user_email not in user_emails:
                orphaned_subs += 1
                report.add_warning(sub.get('subscription_id'), f'Orphaned subscription for user {user_id}')

    if orphaned_subs > 0:
        print(f"  Warning: Found {orphaned_subs} orphaned subscriptions")
    else:
        print("  No orphaned subscriptions found")

def generate_statistics() -> Dict[str, Any]:
    """
    Generate database statistics for admin dashboard
    """
    print("\n=== Database Statistics ===")

    stats = {
        'generated_at': datetime.utcnow().isoformat(),
        'tables': {},
    }

    for table_name, table_id in TABLES.items():
        try:
            table = dynamodb.Table(table_id)
            response = table.scan(Select='COUNT')
            count = response.get('Count', 0)

            # Handle pagination for accurate count
            while 'LastEvaluatedKey' in response:
                response = table.scan(
                    Select='COUNT',
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                count += response.get('Count', 0)

            stats['tables'][table_name] = {'count': count}
            print(f"  {table_name}: {count} items")

        except Exception as e:
            stats['tables'][table_name] = {'error': str(e)}
            print(f"  {table_name}: Error - {e}")

    return stats

def main():
    print("=" * 60)
    print("AiVedha Guardian - Data Migration Script")
    print("=" * 60)
    print(f"\nMode: {'DRY RUN' if DRY_RUN else 'LIVE'}")
    print(f"Region: {AWS_REGION}")
    print(f"Timestamp: {datetime.utcnow().isoformat()}")

    if not DRY_RUN:
        confirm = input("\nWARNING: This will modify production data. Type 'CONFIRM' to proceed: ")
        if confirm != 'CONFIRM':
            print("Aborted.")
            return

    report = MigrationReport()

    try:
        # Run migrations
        migrate_audit_reports_add_region(report)

        # Validate data
        validate_data_consistency(report)

        # Generate statistics
        stats = generate_statistics()

    except Exception as e:
        print(f"\nFatal error: {e}")
        report.add_error('migration', str(e))

    # Print summary
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)

    summary = report.to_dict()
    print(f"\nDuration: {summary['duration_seconds']:.2f} seconds")
    print(f"Processed: {summary['processed']}")
    print(f"Updated: {summary['updated']}")
    print(f"Skipped: {summary['skipped']}")
    print(f"Errors: {summary['error_count']}")
    print(f"Warnings: {summary['warning_count']}")

    if summary['errors']:
        print("\nFirst 10 Errors:")
        for err in summary['errors']:
            print(f"  - {err['id']}: {err['error']}")

    if summary['warnings']:
        print("\nFirst 10 Warnings:")
        for warn in summary['warnings']:
            print(f"  - {warn['id']}: {warn['warning']}")

    # Save report to file
    report_filename = f"migration_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_filename, 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"\nReport saved to: {report_filename}")

    print("\n" + "=" * 60)
    print("Migration complete!" if not DRY_RUN else "Dry run complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
