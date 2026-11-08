/** Finite, fair maintenance pass. Existing database leases make interrupted runs retryable. */
export async function runScheduled(
  tasks: {
    notifications: () => Promise<number>;
    images: () => Promise<number>;
    retention: () => Promise<number>;
  },
  options: {
    now?: () => number;
    durationMs?: number;
    stopped?: () => boolean;
  } = {},
) {
  const now = options.now ?? Date.now;
  const deadline = now() + (options.durationMs ?? 90000);
  const counts = { notifications: 0, images: 0, retention: 0 };
  const limits = { notifications: 200, images: 50, retention: 500 };
  const active = new Set(Object.keys(tasks) as (keyof typeof tasks)[]);
  let failures = 0;
  while (active.size && now() < deadline && !options.stopped?.()) {
    for (const kind of active) {
      if (now() >= deadline || options.stopped?.()) break;
      try {
        const count = await tasks[kind]();
        counts[kind] += count;
        if (!count || counts[kind] >= limits[kind]) active.delete(kind);
      } catch {
        failures++;
        active.delete(kind);
      }
    }
  }
  return {
    counts,
    failures,
    limited:
      active.size > 0 ||
      Object.keys(limits).some(
        (k) =>
          counts[k as keyof typeof counts] >= limits[k as keyof typeof limits],
      ),
  };
}
