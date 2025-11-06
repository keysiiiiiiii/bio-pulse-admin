const express = require('express');
const router = express.Router();
const { syncDriveToSupabase, diag } = require('../services/driveSync.cjs');

function serializeError(err) {
  if (!err) return { message: 'Unknown error' };
  if (typeof err === 'string') return { message: err };
  return {
    message: err.message || String(err),
    name: err.name || undefined,
    code: err.code || undefined,
    stack: err.stack ? String(err.stack).split('\n').slice(0, 6).join('\n') : undefined,
    details: err.details || undefined,
  };
}

router.get('/diag', async (_req, res) => {
  try {
    const out = await diag();
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: serializeError(err) });
  }
});

router.get('/sync-drive', async (req, res) => {
  try {
    const dry = String(req.query.dry || '0') === '1';
    const out = await syncDriveToSupabase({ dry });
    res.json(out);
  } catch (err) {
    res.status(500).json({ ok: false, error: serializeError(err) });
  }
});

// in backend/routes/driveSyncRoutes.js
const { createClient } = require('@supabase/supabase-js');
router.get('/staff-users', async (_req,res)=>{
  try{
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{ persistSession:false }});
    const { data, error } = await sb.from('staff_users').select('id, name').order('id', { ascending:true }).limit(50);
    if (error) throw error;
    res.json({ ok:true, users:data });
  }catch(e){ res.status(500).json({ ok:false, error:{ message:e.message } }); }
});


module.exports = router;
