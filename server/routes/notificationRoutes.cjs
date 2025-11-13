// backend/routes/notificationRoutes.cjs
const express = require("express");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");

const supabase = require(path.join(__dirname, "..", "db.cjs"));
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

function getStaffId(req) {
  return req.query.staff_id || (req.user && req.user.sid) || null;
}

async function getStaffUserId(staff_id) {
  if (!staff_id) return null;
  const { data, error } = await supabase
    .from("staff_users")
    .select("id")
    .eq("staff_id", staff_id)
    .maybeSingle();
  if (error) {
    console.error("Error resolving staff_user_id:", error);
    return null;
  }
  return data ? data.id : null;
}

const NOTIFICATION_ACTIONS = [
  "leave_status_update",
  "leave_approved",
  "leave_disapproved",
  "password_reset",
  "account_created",
  "profile_updated_by_admin",
  "system_alert",
];

router.get("/", verifyToken, async (req, res) => {
  try {
    const staff_id = getStaffId(req);
    if (!staff_id) return res.status(400).json({ error: "missing staff_id" });

    const staff_user_id = await getStaffUserId(staff_id);
    if (!staff_user_id) return res.status(404).json({ error: "user not found" });

    const limit = Math.min(Number(req.query.limit || 50), 100);
    const { data, error } = await supabase
      .from("account_activity")
      .select("id, action, details, actor_staff_id, actor_role, staff_id, created_at, read")
      .eq("staff_id", staff_id)
      .in("action", NOTIFICATION_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: error.message });
    }

    const notifications = (data || []).map((activity) => ({
      id: activity.id,
      title: activity.action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      message: JSON.stringify(activity.details || {}),
      link: "",
      read: activity.read || false,
      created_at: activity.created_at,
    }));

    res.json({ items: notifications });
  } catch (e) {
    console.error("Notifications fetch error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
