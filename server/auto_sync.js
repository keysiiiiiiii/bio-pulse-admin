// backend/auto_sync.js
const path = require('path');
const fs = require('fs');
const { syncDriveToSupabase } = require('./services/driveSync');

let timer = null;
let lastRun = null;
let lastResult = null;

function isRunning() { return !!timer; }

function startAutoSync({ intervalSec = Number(process.env.SYNC_INTERVAL_SEC || 60) } = {}) {
  if (timer) { console.log('[auto-sync] already running'); return; }

  const run = async () => {
    const t0 = Date.now();
    try {
      const out = await syncDriveToSupabase({ dry: false });
      const ms = Date.now() - t0;
      lastRun = new Date().toISOString();
      lastResult = { ok: out.ok, total: out.total_xlsx, inserted: out.inserted, updated: out.updated, ms };
      console.log(`[auto-sync] ok=${out.ok} files=${out.total_xlsx} ins=${out.inserted} upd=${out.updated} ${ms}ms`);
    } catch (e) {
      lastRun = new Date().toISOString();
      lastResult = { ok: false, error: e.message || String(e) };
      console.warn('[auto-sync] error:', e.message || e);
    }
  };

  const me = path.join(__dirname, 'auto_sync.js');
  console.log('[auto-sync] file exists =', fs.existsSync(me), 'intervalSec =', intervalSec);

  setTimeout(run, 3000);                         // first run after boot
  timer = setInterval(run, intervalSec * 1000);  // repeat
  console.log(`[auto-sync] started, every ${intervalSec}s`);
}

function stopAutoSync() { if (timer) { clearInterval(timer); timer = null; console.log('[auto-sync] stopped'); } }
function statusAutoSync() { return { running: isRunning(), lastRun, lastResult, intervalSec: Number(process.env.SYNC_INTERVAL_SEC || 60) }; }

module.exports = { startAutoSync, stopAutoSync, statusAutoSync, isRunning };
