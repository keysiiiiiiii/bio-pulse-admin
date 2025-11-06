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

// ======================================================
// ✅ ADVANCED CORS CONFIGURATION (for LAN & localhost)
// ======================================================
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const os = require('os');
const networkInterfaces = os.networkInterfaces();
Object.values(networkInterfaces).flat().forEach(iface => {
  if (iface && iface.family === 'IPv4' && !iface.internal) {
    allowedOrigins.push(`http://${iface.address}:8080`);
  }
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow curl / mobile
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('❌ Blocked CORS for:', origin);
    return callback(new Error('CORS not allowed for this origin'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ================= HEALTH CHECK =================
app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ============================================
// ROBUST ROUTE LOADING AND MOUNTING
// ============================================

function loadRoute(routePath, routeName) {
  try {
    const route = require(routePath);
    if (!route || typeof route !== 'function') {
      console.error(`❌ Invalid router export: ${routeName}`);
      return null;
    }
    console.log(`✅ Loaded ${routeName} from ${routePath}`);
    return route;
  } catch (error) {
    console.error(`❌ Failed to load ${routeName}:`, error.message);
    return null;
  }
}

console.log('\n📦 Loading route modules...\n');

const staffRoutes = loadRoute('./routes/staffRoutes.cjs', 'Staff Routes');
if (staffRoutes) app.use('/api', staffRoutes);

const attendanceRoutes = loadRoute('./routes/attendanceRoutes.cjs', 'Attendance Routes');
if (attendanceRoutes) app.use('/api/attendance', attendanceRoutes);

const analyticsRoutes = loadRoute('./routes/analyticsRoutes.cjs', 'Analytics Routes');
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);

const notificationRoutes = loadRoute('./routes/notificationRoutes.cjs', 'Notification Routes');
if (notificationRoutes) app.use('/api', notificationRoutes);

const driveSyncRoutes = loadRoute('./routes/driveSyncRoutes.cjs', 'Drive Sync Routes');
if (driveSyncRoutes) app.use('/api/leaves', driveSyncRoutes);

const leaveRoutes = loadRoute('./routes/leaveRoutes.cjs', 'Leave Routes');
if (leaveRoutes) app.use('/', leaveRoutes);

const gsheetsRoutes = loadRoute('./routes/gsheetsRoutes.cjs', 'Google Sheets Routes');
if (gsheetsRoutes) app.use('/', gsheetsRoutes);

const dtrRoutes = loadRoute('./routes/dtrRoutes.cjs', 'DTR Routes');
if (dtrRoutes) app.use('/api/dtr', dtrRoutes);

console.log('\n✅ Route loading complete!\n');

// ===================== DIAGNOSTICS =====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ===================== STATIC FILES =====================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/leave-files', express.static(path.join(__dirname, 'leave_files')));


// ===================== ROUTE INSPECTOR =====================
app.get('/__routes', (_req, res) => {
  const list = [];
  const parse = (stack, prefix = '') => {
    stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        list.push({ methods, path: prefix + layer.route.path });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        parse(layer.handle.stack, prefix);
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
    res.status(500).json({ ok: false, error: e.message });
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

  if (enabled) startAutoSync({ intervalSec: Number(process.env.SYNC_INTERVAL_SEC || 60) });
  else console.log('[auto-sync] disabled');
} catch (e) {
  console.warn('[auto-sync] not started:', e.message);
}

// ================= ZKTECO PULLER =================
try {
  const zk = require('./services/zktecoPuller.supabase.cjs');
  if (zk?.start) zk.start();
  else console.log('[mount] zktecoPuller exported nothing');
} catch (e) {
  console.warn('[mount] zktecoPuller error:', e.message);
}

// ================= ERROR HANDLERS =================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.url,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  const ip = Object.values(os.networkInterfaces()).flat()
    .find(i => i && i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  console.log('\n🚀 Server started!');
  console.log(` → Local:   http://localhost:${PORT}`);
  console.log(` → Network: http://${ip}:${PORT}`);
  console.log(` → Routes:  http://localhost:${PORT}/__routes`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => process.exit(0));
});

module.exports = server;
