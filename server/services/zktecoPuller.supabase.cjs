// backend/services/zktecoPuller.supabase.js
// ZKTeco → Supabase bridge (TX628-friendly)
// - robust PIN mapping (exact, tail 9/8/7, trim leading zeros)
// - does NOT write enum attendance_status (avoid enum mismatch)
// - fully guarded: no unhandled promise rejections

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const ZKLib = require('node-zklib');
const MIN_OUT_GAP_MS = Number(process.env.MIN_OUT_GAP_MS || 120_000); // 2 minutes

const SUPA_URL =
  process.env.SUPABASE_URL || process.env.SUPABASEurl || process.env.SUPABASE_URL_PUBLIC;
const SUPA_KEY =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error('[zk] Missing SUPABASE_URL or service key in backend/.env');
  // do not throw; allow server to keep running
}

const supa = createClient(SUPA_URL, SUPA_KEY);

const ZK_IP   = process.env.ZK_IP || '192.168.1.201';
const ZK_PORT = Number(process.env.ZK_PORT || 4370);
const PULL_MS = Number(process.env.PULL_INTERVAL_MS || 10000);

// ---- helpers ----
function ymd(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function loadPinMap() {
  try {
    const { data, error } = await supa
      .from('staff_device_map')
      .select('staff_user_id, device_pin');

    if (error) throw error;

    const exact = new Map();
    const list  = [];

    for (const r of data || []) {
      const p = String(r.device_pin || '').trim();
      const id = Number(r.staff_user_id);
      if (!p || !id) continue;
      exact.set(p, id);
      list.push({ pin: p, staff_user_id: id });
    }

    console.log(`[zk] pin map loaded: ${exact.size} entries`);
    return { exact, list };
  } catch (e) {
    console.error('[zk] loadPinMap error:', e.message || e);
    return { exact: new Map(), list: [] };
  }
}

function resolveStaffId(pinMap, rawPin) {
  const pin = String(rawPin || '').trim();
  if (!pin) return { id: null, how: 'empty' };

  if (pinMap.exact.has(pin)) return { id: pinMap.exact.get(pin), how: 'exact' };

  const tail9 = pin.slice(-9);
  const tail8 = pin.slice(-8);
  const tail7 = pin.slice(-7);
  const byTail = (tail) => pinMap.list.find(x => x.pin.endsWith(tail))?.staff_user_id || null;

  let id = byTail(tail9);
  if (id) return { id, how: 'tail9' };
  id = byTail(tail8);
  if (id) return { id, how: 'tail8' };
  id = byTail(tail7);
  if (id) return { id, how: 'tail7' };

  const noZeros = pin.replace(/^0+/, '');
  if (noZeros && pinMap.exact.has(noZeros)) return { id: pinMap.exact.get(noZeros), how: 'trim0+exact' };

  const t9 = noZeros.slice(-9);
  const t8 = noZeros.slice(-8);
  const t7 = noZeros.slice(-7);
  id = byTail(t9) || byTail(t8) || byTail(t7);
  if (id) return { id, how: 'trim0+tail' };

  return { id: null, how: 'unmatched' };
}

async function upsertAttendance({ staff_user_id, ts }) {
  const date = ymd(ts);
  const tsDate = new Date(ts);

  // read today's row
  const { data: found, error: selErr } = await supa
    .from('attendance_logs')
    .select('id, time_in, time_out')
    .eq('staff_user_id', staff_user_id)
    .eq('att_date', date)
    .limit(1);

  if (selErr) throw selErr;

  if (!found || found.length === 0) {
    // first tap of the day → create with time_in only
    const { error: insErr } = await supa.from('attendance_logs').insert({
      staff_user_id,
      time_in: ts,
      att_date: date,
      method: 'biometric',
    });
    if (insErr) throw insErr;
    return 'in(created)';
  }

  // row exists for today
  const row  = found[0];
  const tin  = row.time_in ? new Date(row.time_in) : null;
  const tout = row.time_out ? new Date(row.time_out) : null;

  // if this tap is earlier than recorded time_in, keep the earliest time_in
  if (!tin || tsDate < tin) {
    const { error: updInErr } = await supa
      .from('attendance_logs')
      .update({ time_in: ts, method: 'biometric' })
      .eq('id', row.id);
    if (updInErr) throw updInErr;
    return 'in(updated-earlier)';
  }

  // do NOT set time_out if the tap timestamp is the same as (or before) time_in
  if (tsDate <= tin) {
    return 'skip(<=time_in)';
  }

  // if no time_out yet, require a gap after time_in (to guarantee a second tap)
  if (!tout) {
    if (tsDate - tin < MIN_OUT_GAP_MS) {
      return 'skip(gap-too-small)';
    }
    const { error: updOutErr } = await supa
      .from('attendance_logs')
      .update({ time_out: ts })
      .eq('id', row.id);
    if (updOutErr) throw updOutErr;
    return 'out(set)';
  }

  // if there *is* a time_out already, only extend it if this tap is later
  if (tsDate > tout) {
    const { error: updLaterErr } = await supa
      .from('attendance_logs')
      .update({ time_out: ts })
      .eq('id', row.id);
    if (updLaterErr) throw updLaterErr;
    return 'out(updated-later)';
  }

  return 'skip(not-later)';
}


function extractFromLog(log) {
  const pin =
    log?.deviceUserId ??
    log?.user_id ??
    log?.uid ??
    log?.userId ??
    log?.UserID ??
    '';

  const when =
    log?.recordTime ??
    log?.timestamp ??
    log?.time ??
    log?.RecordTime ??
    new Date();

  return { pin: String(pin).trim(), ts: new Date(when) };
}

// ---- main ----
async function start() {
  try {
    let pinMap = await loadPinMap();

    // refresh pin map every minute
    setInterval(async () => {
      const next = await loadPinMap();
      if (next) pinMap = next;
    }, 60_000);

    const zk = new ZKLib(ZK_IP, ZK_PORT, 10000, 4000);
    console.log(`[zk] connecting to ${ZK_IP}:${ZK_PORT}…`);
    try {
      await zk.createSocket();
      console.log('[zk] connected; polling every', PULL_MS, 'ms');
    } catch (e) {
      console.error('[zk] createSocket error:', e.message || e);
      return; // do not throw; keeps server alive
    }

    // realtime
    try {
      await zk.getRealTimeLogs((log) => {
        (async () => {
          try {
            const { pin, ts } = extractFromLog(log);
            if (!pin) return;
            const { id, how } = resolveStaffId(pinMap, pin);
            if (!id) {
              console.log(`[zk] realtime: UNMAPPED pin=${pin}`);
              return;
            }
            const action = await upsertAttendance({ staff_user_id: id, ts });
            console.log(`[zk] realtime: pin=${pin} (${how}) -> ${action} (staff_user_id=${id})`);
          } catch (e) {
            console.error('[zk] realtime error:', e.message || e);
          }
        })();
      });
      console.log('[zk] realtime subscribed');
    } catch (e) {
      console.log('[zk] realtime not available, fallback to polling:', e.message || e);
    }

    // polling
    setInterval(async () => {
      try {
        const res = await zk.getAttendances();
        const arr = Array.isArray(res) ? res : res?.data;
        const cnt = Array.isArray(arr) ? arr.length : 0;
        console.log(`[zk] poll: got ${cnt} record(s)`);
        if (!Array.isArray(arr) || cnt === 0) return;

        for (const raw of arr) {
          try {
            const { pin, ts } = extractFromLog(raw);
            if (!pin) continue;
            const { id, how } = resolveStaffId(pinMap, pin);
            if (!id) {
              console.log(`[zk] poll: UNMAPPED pin=${pin}`);
              continue;
            }
            const action = await upsertAttendance({ staff_user_id: id, ts });
            console.log(`[zk] poll: pin=${pin} (${how}) -> ${action} (staff_user_id=${id})`);
          } catch (e) {
            console.error('[zk] poll error (row):', e.message || e);
          }
        }
      } catch (e) {
        console.error('[zk] poll error:', e.message || e);
      }
    }, PULL_MS);
  } catch (e) {
    // final guard: never reject
    console.error('[zk] fatal start error:', e.message || e);
  }
}

module.exports = { start };

// extra safety: keep process alive on accidental rejects
process.on('unhandledRejection', (reason) => {
  const msg = (reason && reason.message) || String(reason);
  console.error('[zk] unhandledRejection:', msg);
});
process.on('uncaughtException', (err) => {
  console.error('[zk] uncaughtException:', err && err.message ? err.message : err);
});

if (require.main === module) {
  // running directly (not via index.js)
  start();
}
