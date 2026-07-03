const express = require("express");
const { createSession } = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_PASSWORD non configuré sur le serveur" });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  const token = createSession();
  res.json({ token });
});

module.exports = router;
