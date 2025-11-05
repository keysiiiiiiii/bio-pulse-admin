// backend/services/pinConverter.js  (CommonJS, idempotent, no leading zero)
require('dotenv').config();
const db = require('../db'); // Supabase client (already CommonJS in your project)

// ----- helpers -----
function onlyDigits(s) {
  return String(s || '').replace(/\D+/g, '');
}

// Make a stable numeric PIN (<= 9 digits) with no leading zero.
function makePin(staff_id) {
  const nums = onlyDigits(staff_id);
  let pin = nums.replace(/^0+/, ''); // drop leading zeros
  if (!pin) {
    // numeric hash fallback to ensure a number not starting with 0
    let h = 5381;
    const s = String(staff_id || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    pin = String(Math.abs(h % 1000000000)); // 0..999,999,999
  }
  // hard ensure not starting with '0'
  if (pin[0] === '0') pin = String(Number(pin));
  if (!pin || pin[0] === '0') pin = '9' + pin;
  if (pin.length > 9) pin = pin.slice(0, 9);
  return pin;
}

async function firstRow(q) {
  const { data, error } = await q.limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

// Resolve staff_user_id from string staff_id
async function getStaffUserId(staff_id) {
  const row = await firstRow(
    db.from('staff_users').select('id').eq('staff_id', staff_id)
  );
  return row ? row.id : null;
}

// Ensure a mapping exists; DO NOT overwrite existing device_pin
async function ensurePinForStaffId(staff_id) {
  const staff_user_id = await getStaffUserId(staff_id);
  if (!staff_user_id) throw new Error(`No staff_users row for staff_id=${staff_id}`);

  // If already mapped, keep it (no overwrite)
  const existing = await firstRow(
    db.from('staff_device_map')
      .select('device_pin')
      .eq('staff_user_id', staff_user_id)
  );
  if (existing && existing.device_pin) {
    return existing.device_pin; // idempotent
  }

  // generate a candidate PIN and ensure it isn't used by someone else
  let pin = makePin(staff_id);

  // If another user already has this pin, bump until free
  for (let tries = 0; tries < 2000; tries++) {
    const clash = await firstRow(
      db.from('staff_device_map')
        .select('staff_user_id')
        .eq('device_pin', pin)
    );
    if (!clash) break; // free
    // bump numeric, preserve 9 digits, avoid leading zero
    pin = String((Number(pin) + 1) % 1000000000);
    if (pin[0] === '0') pin = String(Number(pin)) || '9'; // drop leading zeros
    pin = pin.padStart(1, '0'); // keep at least 1 digit
  }

  const { error: upErr } = await db
    .from('staff_device_map')
    .upsert({ staff_user_id, device_pin: pin }, { onConflict: 'staff_user_id' });
  if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);

  return pin;
}

/* ---------- exports for server use ---------- */
module.exports = { ensurePinForStaffId, makePin };

/* ---------- CLI runner (only when invoked directly) ---------- */
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const staffIdx = args.indexOf('--staff');

    async function runAll() {
      const { data, error } = await db.from('staff_users').select('staff_id');
      if (error) throw new Error(error.message);
      let ok = 0, fail = 0;
      for (const r of data || []) {
        try {
          const p = await ensurePinForStaffId(r.staff_id);
          console.log(`[pin] ${r.staff_id} → ${p}`);
          ok++;
        } catch (e) {
          console.warn(`[pin] skip ${r.staff_id}: ${e.message}`);
          fail++;
        }
      }
      console.log(`[pin] bulk result: { created_or_confirmed: ${ok}, failed: ${fail}, total: ${(data || []).length} }`);
    }

    async function runOne(sid) {
      const p = await ensurePinForStaffId(sid);
      console.log(`[pin] ${sid} → ${p}`);
    }

    try {
      if (args.includes('--all')) {
        await runAll();
      } else if (staffIdx !== -1 && args[staffIdx + 1]) {
        await runOne(args[staffIdx + 1]);
      } else {
        console.log('Usage:\n  node backend/services/pinConverter.js --all\n  node backend/services/pinConverter.js --staff 23-2025-0001');
      }
      process.exit(0);
    } catch (e) {
      console.error('[pin] error:', e.message || e);
      process.exit(1);
    }
  })();
}
