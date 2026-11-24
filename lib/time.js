// Timezone helpers. Core rule of the whole app:
// STORE in UTC. CONVERT to local only at display time.
//
// localToUtc converts "this wall-clock time in this IANA timezone" to a UTC
// Date, using only built-in Intl (no libraries). Handles DST via a
// second-pass correction.

function tzOffsetMs(utcDate, timeZone) {
  // Offset = (that instant formatted in the zone, read as if UTC) - the instant
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = {};
  for (const p of dtf.formatToParts(utcDate)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour === '24' ? '0' : parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asUTC - utcDate.getTime();
}

function localToUtc(dateStr, timeStr, timeZone) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM" — a wall-clock moment in timeZone
  const guess = new Date(`${dateStr}T${timeStr}:00Z`);
  let offset = tzOffsetMs(guess, timeZone);
  let utc = new Date(guess.getTime() - offset);
  // Second pass corrects the rare case where the guess straddles a DST change
  const offset2 = tzOffsetMs(utc, timeZone);
  if (offset2 !== offset) utc = new Date(guess.getTime() - offset2);
  return utc;
}

function weekdayKeyOf(dateStr) {
  // Weekday of a calendar date is timezone-independent when treated as a label;
  // noon UTC avoids any edge-of-day ambiguity.
  const d = new Date(`${dateStr}T12:00:00Z`);
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getUTCDay()];
}

module.exports = { localToUtc, tzOffsetMs, weekdayKeyOf };
