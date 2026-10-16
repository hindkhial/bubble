type MotionSource = {
  isReduceMotionEnabled(): Promise<boolean>;
  addEventListener(event: 'reduceMotionChanged', listener: (enabled: boolean) => void): { remove(): void } | undefined;
};

// Prefer no animation until the device preference is known. A live change must
// win over an older asynchronous initial read, including during unmount.
export function observeReducedMotion(source: MotionSource, update: (enabled: boolean) => void) {
  let active = true;
  let changed = false;
  const subscription = source.addEventListener('reduceMotionChanged', enabled => {
    changed = true;
    if (active) update(enabled);
  });
  source.isReduceMotionEnabled().then(enabled => {
    if (active && !changed) update(enabled);
  }).catch(() => { /* Keep the conservative reduced-motion default. */ });
  return () => { active = false; subscription?.remove(); };
}
