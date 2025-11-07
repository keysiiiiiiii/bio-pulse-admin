// Script to clean up leave_requests with null dates
const db = require('../db.cjs');

async function cleanupNullDates() {
  console.log('🔍 Checking for leave_requests with null dates...');
  
  try {
    // Find records with null dates
    const { data: nullRecords, error: findError } = await db
      .from('leave_requests')
      .select('id, staff_name, reason, created_at')
      .is('date', null);
    
    if (findError) {
      console.error('❌ Error finding null date records:', findError);
      return;
    }
    
    if (!nullRecords || nullRecords.length === 0) {
      console.log('✅ No records with null dates found. Database is clean!');
      return;
    }
    
    console.log(`⚠️  Found ${nullRecords.length} records with null dates:`);
    nullRecords.forEach(record => {
      console.log(`  - ID: ${record.id}, Staff: ${record.staff_name}, Created: ${record.created_at}`);
    });
    
    // Option 1: Delete records with null dates
    console.log('\n🗑️  Deleting records with null dates...');
    const { error: deleteError } = await db
      .from('leave_requests')
      .delete()
      .is('date', null);
    
    if (deleteError) {
      console.error('❌ Error deleting records:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted ${nullRecords.length} records with null dates`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupNullDates();
