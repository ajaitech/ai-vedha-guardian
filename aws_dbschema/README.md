# AWS Database Schema

This folder contains database schema definitions, tables, and data structures for DynamoDB.

## Table Structures

### User Management
- `users-table.json` - User profiles and authentication data
- `admin-users-table.json` - Admin user accounts
- `user-sessions-table.json` - Session management

### Transaction Management
- `credits-table.json` - User credits and balances
- `transactions-table.json` - Payment and purchase history
- `coupons-table.json` - Coupon codes and usage tracking

### Audit System
- `audit-reports-table.json` - Security audit results
- `audit-history-table.json` - Historical audit data
- `vulnerability-data-table.json` - Vulnerability categorization

### Analytics
- `user-analytics-table.json` - User behavior tracking
- `payment-analytics-table.json` - Payment statistics
- `system-logs-table.json` - System operation logs

## Features
- Global secondary indexes for efficient querying
- Time-to-live (TTL) for temporary data
- Backup and restore configurations
- Cross-region replication setup

## Scripts
- `create-tables.py` - Automated table creation
- `migrate-data.py` - Data migration utilities
- `backup-restore.py` - Backup and restore procedures
- `index-management.py` - Index creation and management

## Best Practices
- Partition key design for scalability
- Sort key optimization for query patterns
- Consistent naming conventions
- Security and access control