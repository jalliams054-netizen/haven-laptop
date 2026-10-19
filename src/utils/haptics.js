export const triggerHaptic = (pattern = 10) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore vibration errors in unsupported browsers or sandboxed iframes
  }
};
// Patterns: 10 (light tap), [15, 30, 15] (success/complete)

export default triggerHaptic;
