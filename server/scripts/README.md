# Database Maintenance Scripts

## cleanupLeaveRequests.cjs

This script cleans up leave_requests table records that have null date values, which violate the database NOT NULL constraint.

### Usage

```bash
cd server
node scripts/cleanupLeaveRequests.cjs
```

### What it does

1. Finds all leave_requests records with null dates
2. Displays the records found
3. Deletes the invalid records

### When to run

Run this script if you encounter errors like:
- `null value in column "date" of relation "leave_requests" violates not-null constraint`
- 500 errors when fetching analytics or leave data

### Safety

The script only deletes records with null dates. Valid leave requests are not affected.
