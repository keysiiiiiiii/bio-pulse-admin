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
const os = require('os');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// ✅ ADVANCED CORS CONFIGURATION
// ======================================================
const allowedOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080'];
const networkInterfaces = os.networkInterfaces();
Object.values(networkInterfaces).flat().forEach(iface => {
  if (iface && iface.family === 'IPv4' && !iface.internal) {
    allowedOrigins.push(`http://${iface.address}:8080`);
  }
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('⚠️  Origin not in whitelist (allowing anyway):', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ======================================================
// ✅ Request Logger
// ======================================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const emoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`${emoji} ${req.method} ${req.originalUrl} → ${status} (${ms}ms)`);
  });
  next();
});

// ======================================================
// ✅ Health Check
// ======================================================
app.get('/api/ping', (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// ======================================================
// ✅ Route Loader
// ======================================================
function loadRoute(routePath, name) {
  try {
    const route = require(routePath);
    if (!route || typeof route !== 'function' && !route.use) {
      console.error(`❌ Invalid router export: ${name}`);
      return null;
    }
    console.log(`✅ Loaded ${name} from ${routePath}`);
    return route;
  } catch (err) {
    console.error(`❌ Failed to load ${name}: ${err.message}`);
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
if (notificationRoutes) app.use('/api/notifications', notificationRoutes);

const activityRoutes = loadRoute('./routes/activityRoutes.cjs', 'Activity Routes');
if (activityRoutes) app.use('/api/activity', activityRoutes);

const driveSyncRoutes = loadRoute('./routes/driveSyncRoutes.cjs', 'Drive Sync Routes');
if (driveSyncRoutes) app.use('/api/leaves', driveSyncRoutes);

const leaveRoutes = loadRoute('./routes/leaveRoutes.cjs', 'Leave Routes');
if (leaveRoutes) app.use('/', leaveRoutes);

const gsheetsRoutes = loadRoute('./routes/gsheetsRoutes.cjs', 'Google Sheets Routes');
if (gsheetsRoutes) app.use('/', gsheetsRoutes);

const dtrRoutes = loadRoute('./routes/dtrRoutes.cjs', 'DTR Routes');
if (dtrRoutes) app.use('/api/dtr', dtrRoutes);

console.log('\n✅ Route loading complete!\n');

// ======================================================
// ✅ Diagnostics
// ======================================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', timestamp: new Date().toISOString() });
});

// ======================================================
// ✅ Static Files
// ======================================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/leave-files', express.static(path.join(__dirname, 'leave_files')));

// ======================================================
// ✅ Route Inspector
// ======================================================
app.get('/__routes', (_req, res) => {
  const list = [];
  const parse = (stack, prefix = '') => {
    stack.forEach(layer => {
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

// ======================================================
// ✅ Error Handlers
// ======================================================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
});

app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ======================================================
// ✅ Start Server
// ======================================================
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
