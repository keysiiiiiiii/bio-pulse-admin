// backend/routes/activityRoutes.cjs
const express = require("express");
const router = express.Router();
const db = require("../db.cjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function getBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function verifyToken(req, res, next) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}

router.get("/me", verifyToken, async (req, res) => {
  try {
    const userStaffId = req.user?.sid || "";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "100", 10), 1), 500);

    const { data, error } = await db
      .from("account_activity")
      .select("id, action, details, actor_staff_id, actor_role, staff_id, created_at")
      .eq("staff_id", userStaffId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ message: "Database error", details: error.message });
    return res.json(data || []);
  } catch (e) {
    return res.status(500).json({ message: "Server error", details: e.message });
  }
});

module.exports = router;
