// db.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL in .env');
if (!SERVICE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or ANON) in .env');

const db = createClient(
  SUPABASE_URL,
  SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = db;
