const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FORM_CHALLENGES = new Map();

const SITEKEYS_PATH = path.join(__dirname, "..", "config", "valid-sitekeys.json");

// Sitekey validieren (inkl. DEMO-123 als Fallback)
function isValidSitekey(key) {
  if (key === "") return true;

  try {
    const keys = JSON.parse(fs.readFileSync(SITEKEYS_PATH, "utf8"));
    return keys[key] === true;
  } catch (err) {
    console.warn("[FormShield] Fehler beim Lesen der Sitekeys:", err.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// API: Challenge generieren
router.post('/api/formshield-verify', (req, res) => {
  const { sitekey, ua, entropy, timestamp } = req.body || {};

  if (!sitekey || !isValidSitekey(sitekey.trim())) {
    console.warn(`[FormShield] ❌ Ungültiger oder fehlender Sitekey: "${sitekey}"`);
    return res.status(403).json({ success: false, message: "Ungültiger oder fehlender Sitekey" });
  }

  if (!ua || !entropy || !timestamp) {
    return res.status(400).json({ success: false, message: "Ungültige Anfrage" });
  }

  const challenge = crypto.randomBytes(16).toString('hex');
  const difficulty = 4;
  const expires = Date.now() + 5 * 60 * 1000;

  FORM_CHALLENGES.set(challenge, { difficulty, expires });
  setTimeout(() => FORM_CHALLENGES.delete(challenge), 5 * 60 * 1000);

  res.json({ challenge, difficulty });
});

// ─────────────────────────────────────────────────────────────
// Formularverarbeitung (PoW + ML + Challenge)
router.post('/kontakt', async (req, res) => {
  const { challenge, nonce, hash, name, message, sitekey } = req.body || {};

  // 1. Challenge prüfen
  const meta = FORM_CHALLENGES.get(challenge);
  if (!meta || meta.expires < Date.now()) {
    return res.status(403).json({ success: false, bot: true, message: "Challenge ungültig oder abgelaufen" });
  }

  const input = challenge + nonce;
  const expectedHash = crypto.createHash("sha256").update(input).digest("hex");

  if (expectedHash !== hash || !expectedHash.startsWith("0".repeat(meta.difficulty))) {
    return res.status(403).json({ success: false, bot: true, message: "Rechenrätsel falsch gelöst" });
  }

  // 2. ML-Bewertung
  const botScore = req.botScore ?? 0;
  const threshold = 0.7;
  const safeSitekeys = ['DEMO-487'];

  if (!safeSitekeys.includes(sitekey) && botScore >= threshold) {
    return res.status(403).json({
      success: false,
      bot: true,
      message: `ML-Prüfung fehlgeschlagen (Score: ${botScore.toFixed(3)})`
    });
  }

  // 3. Erfolg
  FORM_CHALLENGES.delete(challenge);
  return res.json({
    success: true,
    bot: false,
    message: "Verifiziert – kein Bot"
  });
});

module.exports = router;
