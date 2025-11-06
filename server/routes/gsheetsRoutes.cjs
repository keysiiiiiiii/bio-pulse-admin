// backend/routes/gsheetsRoutes.js
// Proxies browser requests to your Google Apps Script Web App to avoid CORS.

const express = require('express');
const router = express.Router();

// Put your GAS web app URL in .env as GAS_WEB_APP_URL
// (falls back to your current one if not set)
const GAS_WEB_APP_URL =
  process.env.GAS_WEB_APP_URL ||
  'https://script.google.com/macros/s/AKfycbzgYhylmNrcgzRm8liuiYbnY5Nv-UU_ayzJ-WTmfX_JQqtLwGDvPQAdGaECrKg5p-EsRQ/exec';

// Ensure JSON body parsing is enabled in index.js (see step 2)
async function callAppsScript(mode, data) {
  // We keep `text/plain` to match your existing GAS handler that expects a raw JSON string
  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ mode, data }),
  });
  const text = await res.text();
  // GAS sometimes returns text/plain even if it's JSON
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, json: { ok: res.ok, raw: text } }; }
}

// POST /api/gsheets/submit
router.post('/api/gsheets/submit', async (req, res) => {
  try {
    const r = await callAppsScript('submit', req.body);
    if (!r.ok) return res.status(502).json({ ok: false, error: `GAS ${r.status}`, detail: r.json });
    return res.json(r.json);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Proxy submit error' });
  }
});

// POST /api/gsheets/preview
router.post('/api/gsheets/preview', async (req, res) => {
  try {
    const r = await callAppsScript('preview', req.body);
    if (!r.ok) return res.status(502).json({ ok: false, error: `GAS ${r.status}`, detail: r.json });
    return res.json(r.json);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Proxy preview error' });
  }
});

module.exports = router;
