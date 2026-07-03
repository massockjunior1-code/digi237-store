// Sessions admin en mémoire : token -> date d'expiration
const sessions = new Map();

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12h

function createSession() {
  const token = require("crypto").randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + SESSION_DURATION_MS);
  return token;
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const expiry = token && sessions.get(token);
  if (!expiry || expiry < Date.now()) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

module.exports = { requireAdmin, createSession, sessions };
