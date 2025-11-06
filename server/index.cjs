// backend/index.cjs
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const raw = String(process.env.GOOGLE_APPLICATION_CREDENTIALS).trim();
  const credPath = path.isAbsolute(raw) ? raw : path.resolve(__dirname, raw);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  console.log('[drive] GOOGLE_APPLICATION_CREDENTIALS =', credPath);
}

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ================= HEALTH CHECK =================
app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ================= ROUTES =================
// Helper: Try multiple module paths, return first that works
function requireFirst(paths) {
  for (const p of paths) {
    try {
      const mod = require(p);
      console.log(`[mount] ✓ loaded ${p}`);
      return mod;
    } catch (e) {
      // Keep trying
    }
  }
  console.warn(`[mount] ✗ none found for ${paths.join(' | ')}`);
  return null;
}

// Staff Routes - mount at /api (includes /auth/*)
const staffRoutes = requireFirst(['./routes/staffRoutes.cjs', './routes/staffRoutes.js']);
if (staffRoutes) app.use('/api', staffRoutes);

// Attendance Routes - mount at /api/attendance
const attendanceRoutes = requireFirst(['./routes/attendanceRoutes.cjs', './routes/attendanceRoutes.js']);
if (attendanceRoutes) app.use('/api/attendance', attendanceRoutes);

// Analytics Routes - mount at /api/analytics
const analyticsRoutes = requireFirst(['./routes/analyticsRoutes.cjs', './routes/analyticsRoutes.js']);
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);

// Notification Routes - mount at /api
const notificationRoutes = requireFirst(['./routes/notificationRoutes.cjs', './routes/notificationRoutes.js']);
if (notificationRoutes) app.use('/api', notificationRoutes);

// Drive Sync Routes - mount at /api/leaves
const driveSyncRoutes = requireFirst(['./routes/driveSyncRoutes.cjs', './routes/driveSyncRoutes.js']);
if (driveSyncRoutes) app.use('/api/leaves', driveSyncRoutes);

// Leave Routes - mount at /
const leaveRoutes = requireFirst(['./routes/leaveRoutes.cjs', './routes/leaveRoutes.js']);
if (leaveRoutes) app.use('/', leaveRoutes);

// Google Sheets Routes - mount at /
const gsheetsRoutes = requireFirst(['./routes/gsheetsRoutes.cjs', './routes/gsheetsRoutes.js']);
if (gsheetsRoutes) app.use('/', gsheetsRoutes);

// DTR Routes - mount at /api/dtr
const dtrRoutes = requireFirst(['./routes/dtrRoutes.cjs', './routes/dtrRoutes.js']);
if (dtrRoutes) app.use('/api/dtr', dtrRoutes);

// ===================== STATIC FILES =====================
const staticDir = path.join(__dirname, '../public');
app.use(express.static(staticDir));

// Serve uploaded avatars/files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/leave-files', express.static(path.join(__dirname, 'leave_files')));

// SPA entry point
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'login', 'login.html'));
});

// ================= ROUTE INSPECTOR (Debug Tool) =================
app.get('/__routes', (_req, res) => {
  const list = [];
  const parse = (stack, prefix = '') => {
    stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        list.push({ methods, path: prefix + layer.route.path });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const src = (layer.regexp && layer.regexp.source) || '';
        const base = src
          .replace('^\\/', '/')
          .replace('\\/?(?=\\/|$)', '')
          .replace('^', '')
          .replace('$', '')
          .replace('\\/', '/');
        parse(layer.handle.stack, prefix + (base === '(?:\\/)?' ? '' : base));
      }
    });
  };
  parse(app._router.stack);
  res.json({ ok: true, routes: list });
});

// ================= DRIVE SYNC TRIGGER =================
app.post('/api/leaves/trigger-sync', async (req, res) => {
  try {
    const { syncDriveToSupabase } = require('./services/driveSync.cjs');
    const out = await syncDriveToSupabase({ dry: false });
    res.json({ ok: true, ...out });
  } catch (e) {
    console.error('[drive-sync] Error:', e);
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// ================= AUTO SYNC (Poller) =================
try {
  const { startAutoSync, stopAutoSync, statusAutoSync } = require('./auto_sync.cjs');

  app.get('/__autosync/status', (_req, res) => res.json({ ok: true, ...statusAutoSync() }));
  app.post('/__autosync/start', (_req, res) => {
    startAutoSync();
    res.json({ ok: true, started: true, ...statusAutoSync() });
  });
  app.post('/__autosync/stop', (_req, res) => {
    stopAutoSync();
    res.json({ ok: true, stopped: true, ...statusAutoSync() });
  });

  const flag = String(process.env.AUTO_SYNC ?? '1').trim().toLowerCase();
  const enabled = ['1', 'true', 'yes', 'on'].includes(flag);
  console.log(`[auto-sync] AUTO_SYNC=${flag}  SYNC_INTERVAL_SEC=${process.env.SYNC_INTERVAL_SEC || 60}`);

  if (enabled) {
    startAutoSync({ intervalSec: Number(process.env.SYNC_INTERVAL_SEC || 60) });
  } else {
    console.log('[auto-sync] disabled');
  }
} catch (e) {
  console.warn('[auto-sync] not started:', e.message || e);
}

// ================= ZKTECO PULLER =================
try {
  const zk = require('./services/zktecoPuller.supabase.cjs');
  if (zk && typeof zk.start === 'function') {
    zk.start();
    console.log('[mount] ✓ zktecoPuller started');
  } else {
    console.log('[mount] zktecoPuller exported nothing');
  }
} catch (e) {
  console.warn('[mount] zktecoPuller error:', e.message);
}

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ip = Object.values(os.networkInterfaces()).flat()
    .find(i => i && i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  
  console.log('\n🚀 Server started successfully!');
  console.log(`   → Local:   http://localhost:${PORT}`);
  console.log(`   → Network: http://${ip}:${PORT}`);
  console.log(`   → Routes:  http://localhost:${PORT}/__routes`);
  console.log(`   → Health:  http://localhost:${PORT}/api/ping\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = server;