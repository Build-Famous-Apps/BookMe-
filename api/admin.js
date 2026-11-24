const { getJson, setJson } = require('../lib/redis.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, action, payload } = body || {};

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({
      error: 'Server is missing ADMIN_PASSWORD. Add it in Vercel -> Project Settings -> Environment Variables, then redeploy with `vercel --prod`.'
    });
    return;
  }
  if (password !== adminPassword) {
    res.status(401).json({ error: 'Wrong password.' });
    return;
  }

  try {
    if (action === 'getBookings') {
      const bookings = (await getJson('bookings')) || [];
      bookings.sort((a, b) => a.slotUtc.localeCompare(b.slotUtc));
      res.status(200).json({ bookings });
      return;
    }

    if (action === 'setAvailability') {
      const { weekly, adminTimezone } = payload || {};
      if (!weekly || typeof weekly !== 'object' || !adminTimezone || typeof adminTimezone !== 'string') {
        res.status(400).json({ error: 'Payload must include weekly availability and adminTimezone.' });
        return;
      }
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: adminTimezone });
      } catch {
        res.status(400).json({ error: `"${adminTimezone}" is not a valid timezone name.` });
        return;
      }
      await setJson('availability', { weekly, adminTimezone });
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'blockSlot') {
      const { slotUtc } = payload || {};
      if (!slotUtc || isNaN(Date.parse(slotUtc))) {
        res.status(400).json({ error: 'Invalid slot to block.' });
        return;
      }
      const bookings = (await getJson('bookings')) || [];
      if (bookings.some(b => b.slotUtc === slotUtc)) {
        res.status(409).json({ error: 'That slot already has a booking or block.' });
        return;
      }
      bookings.push({ slotUtc, blocked: true, bookedAt: new Date().toISOString() });
      await setJson('bookings', bookings);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: `Unknown action "${action}".` });
  } catch (err) {
    res.status(err.statusHint || 500).json({ error: err.message });
  }
};
