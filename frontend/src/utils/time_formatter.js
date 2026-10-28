export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "00:00.000";
  const s = Math.max(0, Number(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const millis = Math.floor((s - Math.floor(s)) * 1000);

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(millis).padStart(3, "0");

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, "0");
    return `${hh}:${mm}:${ss}.${mmm}`;
  }
  return `${mm}:${ss}.${mmm}`;
}

export function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(",", ".");
  const parts = clean.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(clean) || 0;
}

