// server/index.cjs - COMPLETE FIXED VERSION
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

console.log('✅ Allowed CORS Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow curl / mobile
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('⚠️  Origin not in whitelist (allowing anyway):', origin);
    return callback(null, true); // Allow for development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const emoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`${emoji} ${req.method} ${req.url} → ${status} (${duration}ms)`);
  });
  next();
});

// ================= HEALTH CHECK =================
app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ROBUST ROUTE LOADING AND MOUNTING
// ============================================

function loadRoute(routePath, routeName) {
  try {
    // Clear require cache to ensure fresh load
    const fullPath = require.resolve(routePath);
    delete require.cache[fullPath];
    
    const route = require(routePath);
    if (!route || typeof route !== 'function') {
      console.error(`❌ Invalid router export: ${routeName}`);
      console.error(`   Expected: function, Got: ${typeof route}`);
      return null;
    }
    console.log(`✅ Loaded ${routeName}`);
    return route;
  } catch (error) {
    console.error(`❌ Failed to load ${routeName}:`, error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    return null;
  }
}

console.log('\n📦 Loading route modules...\n');

// 1. Staff Routes
console.log('🔵 Loading Staff Routes...');
const staffRoutes = loadRoute('./routes/staffRoutes.cjs', 'Staff Routes');
if (staffRoutes) {
  app.use('/api', staffRoutes);
  console.log('   ↳ Mounted at /api\n');
} else {
  console.error('   ↳ ❌ Staff Routes NOT mounted\n');
}

// 2. Attendance Routes
console.log('🔵 Loading Attendance Routes...');
const attendanceRoutes = loadRoute('./routes/attendanceRoutes.cjs', 'Attendance Routes');
if (attendanceRoutes) {
  app.use('/api/attendance', attendanceRoutes);
  console.log('   ↳ Mounted at /api/attendance\n');
} else {
  console.error('   ↳ ❌ Attendance Routes NOT mounted\n');
}

// 3. DTR Routes - PRIORITY LOAD WITH DETAILED LOGGING
console.log('🔵 Loading DTR Routes (PRIORITY)...');
const dtrRoutes = loadRoute('./routes/dtrRoutes.cjs', 'DTR Routes');
if (dtrRoutes) {
  app.use('/api/dtr', dtrRoutes);
  console.log('   ✅ DTR routes mounted at /api/dtr');
  
  // Verify DTR routes are actually mounted
  console.log('   🧪 Testing DTR route availability...');
  const testPaths = ['/api/dtr/test', '/api/dtr/records', '/api/dtr/download-excel'];
  console.log('   Expected DTR endpoints:', testPaths.join(', '));
  console.log('');
} else {
  console.error('   ❌ CRITICAL: DTR Routes failed to load!\n');
}

// 4. Analytics Routes
console.log('🔵 Loading Analytics Routes...');
const analyticsRoutes = loadRoute('./routes/analyticsRoutes.cjs', 'Analytics Routes');
if (analyticsRoutes) {
  app.use('/api/analytics', analyticsRoutes);
  console.log('   ↳ Mounted at /api/analytics\n');
}

// 5. Notification Routes
console.log('🔵 Loading Notification Routes...');
const notificationRoutes = loadRoute('./routes/notificationRoutes.cjs', 'Notification Routes');
if (notificationRoutes) {
  app.use('/api', notificationRoutes);
  console.log('   ↳ Mounted at /api\n');
}

// 6. Drive Sync Routes
console.log('🔵 Loading Drive Sync Routes...');
const driveSyncRoutes = loadRoute('./routes/driveSyncRoutes.cjs', 'Drive Sync Routes');
if (driveSyncRoutes) {
  app.use('/api/leaves', driveSyncRoutes);
  console.log('   ↳ Mounted at /api/leaves\n');
}

// 7. Leave Routes
console.log('🔵 Loading Leave Routes...');
const leaveRoutes = loadRoute('./routes/leaveRoutes.cjs', 'Leave Routes');
if (leaveRoutes) {
  app.use('/', leaveRoutes);
  console.log('   ↳ Mounted at /\n');
}

// 8. Google Sheets Routes
console.log('🔵 Loading Google Sheets Routes...');
const gsheetsRoutes = loadRoute('./routes/gsheetsRoutes.cjs', 'Google Sheets Routes');
if (gsheetsRoutes) {
  app.use('/', gsheetsRoutes);
  console.log('   ↳ Mounted at /\n');
}

// 9. Schedule Routes
console.log('🔵 Loading Schedule Routes...');
const scheduleRoutes = loadRoute('./routes/scheduleRoutes.cjs', 'Schedule Routes');
if (scheduleRoutes) {
  app.use('/api/schedules', scheduleRoutes);
  console.log('   ↳ Mounted at /api/schedules\n');
}

// 10. Activity Routes
console.log('🔵 Loading Activity Routes...');
const activityRoutes = loadRoute('./routes/activityRoutes.cjs', 'Activity Routes');
if (activityRoutes) {
  app.use('/api/activity', activityRoutes);
  console.log('   ↳ Mounted at /api/activity\n');
}

console.log('✅ All routes loaded!\n');

// ===================== STATIC FILES =====================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/leave-files', express.static(path.join(__dirname, 'leave_files')));
console.log('📁 Static file directories configured');

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

// ===================== DTR DIAGNOSTIC ENDPOINT =====================
app.get('/api/dtr-status', (req, res) => {
  const hasRoutes = !!dtrRoutes;
  res.json({
    ok: hasRoutes,
    message: hasRoutes ? 'DTR routes are loaded' : 'DTR routes failed to load',
    test_url: `${req.protocol}://${req.get('host')}/api/dtr/test`,
    records_url: `${req.protocol}://${req.get('host')}/api/dtr/records?staff_id=28-2025-0002&year=2025&month=11`,
    timestamp: new Date().toISOString()
  });
});

// ===================== ROUTE INSPECTOR =====================
app.get('/__routes', (_req, res) => {
  const list = [];
  
  try {
    const parse = (stack, prefix = '') => {
      if (!stack || !Array.isArray(stack)) return;
      
      stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
          list.push({ methods, path: prefix + layer.route.path });
        } else if (layer.name === 'router' && layer.handle?.stack) {
          let mountPath = '';
          if (layer.regexp) {
            const regexpStr = layer.regexp.toString();
            const match = regexpStr.match(/\^\\?\/([\w\/\\-]+)/);
            if (match) {
              mountPath = '/' + match[1].replace(/\\/g, '');
            }
          }
          parse(layer.handle.stack, prefix + mountPath);
        }
      });
    };
    
    if (app._router && app._router.stack) {
      parse(app._router.stack);
      
      // Filter and highlight DTR routes
      const dtrRoutes = list.filter(r => r.path.includes('/dtr'));
      const otherRoutes = list.filter(r => !r.path.includes('/dtr'));
      
      res.json({ 
        ok: true, 
        total: list.length,
        dtr_routes: dtrRoutes.length,
        dtr_endpoints: dtrRoutes,
        all_routes: list
      });
    } else {
      res.json({ 
        ok: false, 
        error: 'Router stack not available',
        routes: list 
      });
    }
  } catch (error) {
    res.json({ ok: false, error: error.message, routes: list });
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

  if (enabled) {
    startAutoSync({ intervalSec: Number(process.env.SYNC_INTERVAL_SEC || 60) });
    console.log('✅ Auto-sync enabled');
  } else {
    console.log('⚠️  Auto-sync disabled');
  }
} catch (e) {
  console.warn('⚠️  Auto-sync not started:', e.message);
}

// ================= ZKTECO PULLER =================
try {
  const zk = require('./services/zktecoPuller.supabase.cjs');
  if (zk?.start) {
    zk.start();
    console.log('✅ ZKTeco puller started');
  } else {
    console.log('⚠️  ZKTeco puller not available');
  }
} catch (e) {
  console.warn('⚠️  ZKTeco puller error:', e.message);
}

// ================= ERROR HANDLERS (MUST BE LAST) =================
app.use((req, res) => {
  console.error(`❌ 404: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.url,
    method: req.method,
    suggestion: 'Check /api/__routes for available endpoints'
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    path: req.url
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  const ip = Object.values(os.networkInterfaces()).flat()
    .find(i => i && i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  
  console.log('\n🚀 ========================================');
  console.log('🚀 SERVER STARTED SUCCESSFULLY!');
  console.log('🚀 ========================================');
  console.log(`\n📍 Local:   http://localhost:${PORT}`);
  console.log(`📍 Network: http://${ip}:${PORT}`);
  console.log('\n📋 Diagnostic Endpoints:');
  console.log(`   → Health:     http://localhost:${PORT}/api/health`);
  console.log(`   → Routes:     http://localhost:${PORT}/__routes`);
  console.log(`   → DTR Status: http://localhost:${PORT}/api/dtr-status`);
  console.log(`   → DTR Test:   http://localhost:${PORT}/api/dtr/test`);
  console.log('\n🎯 DTR Endpoints:');
  console.log(`   → Records:    http://localhost:${PORT}/api/dtr/records?staff_id=28-2025-0002&year=2025&month=11`);
  console.log(`   → Excel:      http://localhost:${PORT}/api/dtr/download-excel?staff_id=28-2025-0002&year=2025&month=11`);
  console.log('\n========================================\n');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

module.exports = server;