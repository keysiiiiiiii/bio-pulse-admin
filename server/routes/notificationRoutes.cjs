// backend/routes/notificationRoutes.js
const express = require("express");
const path = require("path");
const router = express.Router();

// ✅ Load backend/db.js via absolute path (no more ../db guessing)
const supabase = require(path.join(__dirname, "..", "db.cjs"));

function getStaffId(req) {
  return req.query.staff_id || (req.user && req.user.staff_id) || null;
}

// GET /api/notifications/unread-count?staff_id=...
router.get("/notifications/unread-count", async (req, res) => {
  const staff_id = getStaffId(req);
  if (!staff_id) return res.status(400).json({ error: "missing staff_id" });

  const { data, error, count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staff_id)
    .eq("read", false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count ?? (Array.isArray(data) ? data.length : 0) });
});

// GET /api/notifications?staff_id=...&limit=50
router.get("/notifications", async (req, res) => {
  const staff_id = getStaffId(req);
  if (!staff_id) return res.status(400).json({ error: "missing staff_id" });

  const limit = Math.min(Number(req.query.limit || 50), 100);
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, link, read, created_at")
    .eq("staff_id", staff_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data || [] });
});

router.post("/notifications/mark-all-read", async (req, res) => {
  const staff_id = getStaffId(req);
  if (!staff_id) return res.status(400).json({ error: "missing staff_id" });

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("staff_id", staff_id)
    .eq("read", false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
