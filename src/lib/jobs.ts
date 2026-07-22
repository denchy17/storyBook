// Tiny in-process job runner. Good enough for local/MVP: the Next.js dev/prod
// node server is a single long-lived process, so module state persists.
// Concurrency is capped so multiple users' books generate "at the same time"
// without hammering the upstream AI APIs.

type Job = () => Promise<void>;

const MAX_CONCURRENCY = 2;

const running = new Set<string>();
const queue: { key: string; job: Job }[] = [];
let active = 0;

function pump() {
  while (active < MAX_CONCURRENCY && queue.length > 0) {
    const next = queue.shift()!;
    active++;
    next
      .job()
      .catch((err) => {
        console.error(`[jobs] job ${next.key} failed:`, err);
      })
      .finally(() => {
        active--;
        running.delete(next.key);
        pump();
      });
  }
}

/** Enqueue a job. If a job with the same key is already queued/running, ignore. */
export function enqueue(key: string, job: Job): boolean {
  if (running.has(key)) return false;
  running.add(key);
  queue.push({ key, job });
  pump();
  return true;
}

export function isRunning(key: string): boolean {
  return running.has(key);
}
