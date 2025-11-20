// =================================================================
// DTR AUTO-GENERATE SCHEDULER (End of Month)
// =================================================================

// server/schedulers/dtrScheduler.cjs
const cron = require('node-cron');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

// Helper to get current month/year
function getCurrentMonthYear() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1 // 1-12
  };
}

// Helper to check if today is the last day of the month
function isLastDayOfMonth() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return now.getMonth() !== tomorrow.getMonth();
}

// 🎯 MAIN FUNCTION: Generate all DTRs for current month
async function generateMonthlyDTRs() {
  const { year, month } = getCurrentMonthYear();
  
  console.log(`🔄 [DTR Scheduler] Generating DTRs for ${year}-${String(month).padStart(2, '0')}`);

  try {
    const response = await axios.post(`${API_BASE_URL}/dtr/ensure-month`, {
      month,
      year
    }, {
      timeout: 600000 // 10 minutes timeout
    });

    const result = response.data;
    const successCount = result.items?.filter((i) => i.ok).length || 0;
    const totalCount = result.items?.length || 0;

    console.log(`✅ [DTR Scheduler] Success: ${successCount}/${totalCount} DTRs generated`);

    // Optional: Send notification to admin
    // await sendAdminNotification(`DTR generation complete: ${successCount}/${totalCount}`);

  } catch (error) {
    console.error('❌ [DTR Scheduler] Error:', error.message);
    // Optional: Alert admin about failure
    // await sendAdminAlert(`DTR generation failed: ${error.message}`);
  }
}

// =================================================================
// CRON SCHEDULES
// =================================================================

// Schedule 1: Every last day of month at 11:59 PM
// Cron format: minute hour day month weekday
// 59 23 28-31 * * - Run at 11:59 PM on days 28-31 of every month
const endOfMonthSchedule = '59 23 28-31 * *';

cron.schedule(endOfMonthSchedule, async () => {
  // Double-check if it's really the last day
  if (isLastDayOfMonth()) {
    console.log('📅 [DTR Scheduler] Last day of month detected. Starting generation...');
    await generateMonthlyDTRs();
  } else {
    console.log('📅 [DTR Scheduler] Not the last day yet. Skipping...');
  }
}, {
  timezone: "Asia/Manila" // Philippines timezone
});

// Schedule 2: Backup - Run on 1st day of next month at 1:00 AM
// In case the end-of-month job fails
const firstDaySchedule = '0 1 1 * *';

cron.schedule(firstDaySchedule, async () => {
  console.log('📅 [DTR Scheduler] First day of month. Generating previous month DTRs...');
  
  const now = new Date();
  const prevMonth = now.getMonth(); // 0-11 (already previous month)
  const prevYear = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = prevMonth === 0 ? 12 : prevMonth;

  try {
    const response = await axios.post(`${API_BASE_URL}/dtr/ensure-month`, {
      month,
      year: prevYear
    }, {
      timeout: 600000
    });

    const result = response.data;
    const successCount = result.items?.filter((i) => i.ok).length || 0;
    const totalCount = result.items?.length || 0;

    console.log(`✅ [DTR Scheduler] Backup job success: ${successCount}/${totalCount} DTRs generated`);
  } catch (error) {
    console.error('❌ [DTR Scheduler] Backup job error:', error.message);
  }
}, {
  timezone: "Asia/Manila"
});

// =================================================================
// OPTIONAL: Manual Trigger Endpoint
// =================================================================

// Add this to your Express app (server.cjs or index.cjs)
/*
const express = require('express');
const router = express.Router();

// POST /api/dtr/trigger-monthly-generation
router.post('/trigger-monthly-generation', async (req, res) => {
  try {
    await generateMonthlyDTRs();
    res.json({ ok: true, message: 'Monthly DTR generation triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
*/

console.log('✅ [DTR Scheduler] Cron jobs initialized');
console.log('   - End of month: 11:59 PM on days 28-31');
console.log('   - Backup: 1st day of month at 1:00 AM');

module.exports = {
  generateMonthlyDTRs,
  isLastDayOfMonth
};