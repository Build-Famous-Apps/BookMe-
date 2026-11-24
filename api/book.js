const { getJson, setJson } = require('../lib/redis.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { slotUtc, name, email } = body || {};

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';

  if (!slotUtc || isNaN(Date.parse(slotUtc))) {
    res.status(400).json({ error: 'Invalid or missing slot.' });
    return;
  }
  if (!cleanName) {
    res.status(400).json({ error: 'Please enter your name.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (Date.parse(slotUtc) <= Date.now()) {
    res.status(400).json({ error: 'That time is already in the past.' });
    return;
  }

  try {
    // THE DOUBLE-BOOKING GUARD:
    // Re-read bookings server-side at booking time — never trust the UI's
    // idea of what's free. If two people race for the same slot, the second
    // write finds it taken and is refused.
    const bookings = (await getJson('bookings')) || [];
    if (bookings.some(b => b.slotUtc === slotUtc)) {
      res.status(409).json({ error: 'Sorry — that slot was just taken. Please pick another.' });
      return;
    }

    bookings.push({ slotUtc, name: cleanName, email: cleanEmail, bookedAt: new Date().toISOString() });
    await setJson('bookings', bookings);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(err.statusHint || 500).json({ error: err.message });
  }
};
