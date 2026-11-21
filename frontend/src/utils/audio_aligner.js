/**
 * audio_aligner.js
 * Utility to detect and resolve audio speech collisions (overlaps) between consecutive subtitle lines.
 */

/**
 * Computes which subtitle lines have audio extending into the next line's audio playback.
 * @param {Array} items - Subtitle items
 * @returns {{ overlapMap: Object, totalOverlaps: number }}
 */
export function computeAudioOverlaps(items) {
  if (!items || items.length < 2) {
    return { overlapMap: {}, totalOverlaps: 0 };
  }

  // Filter and sort items that have ready audio by their actual audio start time
  const audioItems = items
    .filter((it) => (it.audio_url || it.audio_status === 'ready') && it.audio_duration)
    .map((it) => {
      const start = it.audio_start !== undefined && it.audio_start !== null ? Number(it.audio_start) : Number(it.start_time);
      const dur = Number(it.audio_duration) || Math.max(0.5, Number(it.end_time) - Number(it.start_time));
      const end = it.audio_end !== undefined && it.audio_end !== null ? Number(it.audio_end) : (start + dur);
      return { id: it.id, index: it.index, start, end, dur };
    })
    .sort((a, b) => a.start - b.start);

  const overlapMap = {};
  let totalOverlaps = 0;

  for (let i = 0; i < audioItems.length - 1; i++) {
    const curr = audioItems[i];
    const next = audioItems[i + 1];

    // If current audio ends after next audio begins (margin of 0.05s)
    if (curr.end > next.start + 0.05) {
      const diff = Number((curr.end - next.start).toFixed(2));
      overlapMap[curr.id] = {
        hasOverlap: true,
        overlapSec: diff,
        nextIndex: next.index || (i + 2),
        nextId: next.id
      };
      totalOverlaps++;
    }
  }

  return { overlapMap, totalOverlaps };
}

/**
 * Strict Lip-Sync: Pins every audio clip directly to its on-screen subtitle start_time,
 * ensuring the character speaking on screen strictly matches the voice heard without delay drift.
 * @param {Array} items - Subtitle items
 * @returns {Array} - Subtitle items array with synced audio_start
 */
export function autoFixAudioOverlaps(items) {
  if (!items || items.length === 0) return items;

  return items.map((item) => {
    if (!item.audio_url && item.audio_status !== 'ready') return item;
    const dur = item.audio_duration
      ? Number(item.audio_duration)
      : Math.max(0.5, Number(item.end_time) - Number(item.start_time));
    const start = Number(item.start_time);
    const end = Number((start + dur).toFixed(2));

    return {
      ...item,
      audio_start: start,
      audio_end: end
    };
  });
}

/**
 * Resets audio playback positions back to match each subtitle line's original start_time.
 * @param {Array} items
 * @returns {Array}
 */
export function resetAudioAlignment(items) {
  if (!items) return items;
  return items.map((item) => {
    if (!item.audio_url && item.audio_status !== 'ready') return item;
    const dur = item.audio_duration || Math.max(0.5, Number(item.end_time) - Number(item.start_time));
    const start = Number(item.start_time);
    return {
      ...item,
      audio_start: start,
      audio_end: Number((start + dur).toFixed(2))
    };
  });
}
