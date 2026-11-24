const { getJson } = require('../lib/redis.js');
const { localToUtc, weekdayKeyOf } = require('../lib/time.js');

module.exports = async function handler(req, res) {
  try {
    const date = (req.query && req.query.date) ||
      new URL(req.url, 'http://x').searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Provide ?date=YYYY-MM-DD' });
      return;
    }

    const config = await getJson('availability');
    if (!config || !config.weekly || !config.adminTimezone) {
      res.status(200).json({ configured: false });
      return;
    }

    const dayKey = weekdayKeyOf(date);
    const ranges = (config.weekly[dayKey] || []).filter(r => r && r.start && r.end);

    const bookings = (await getJson('bookings')) || [];
    const taken = new Set(bookings.map(b => b.slotUtc));
    const now = Date.now();

    const slots = [];
    for (const range of ranges) {
      let [h, m] = range.start.split(':').map(Number);
      const [eh, em] = range.end.split(':').map(Number);
      const endMins = eh * 60 + em;
      while (h * 60 + m + 30 <= endMins) {
        const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        const utc = localToUtc(date, timeStr, config.adminTimezone);
        const slotUtc = utc.toISOString();
        if (utc.getTime() > now && !taken.has(slotUtc)) {
          slots.push({ slotUtc });
        }
        m += 30;
        if (m >= 60) { m -= 60; h += 1; }
      }
    }

    res.status(200).json({ configured: true, adminTimezone: config.adminTimezone, slots });
  } catch (err) {
    res.status(err.statusHint || 500).json({ error: err.message });
  }
};
