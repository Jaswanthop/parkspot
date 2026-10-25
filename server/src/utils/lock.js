/**
 * Small in-process mutex. It serialises reservation writes per slot so two
 * concurrent requests cannot both pass the overlap check and double-book.
 * (A single Node process is exactly what a Render web service runs; for
 * multi-instance deployments, move this lock to Redis or use a transaction
 * with a unique slot/time index.)
 */
const queues = new Map();

export function withLock(key, task) {
  const previous = queues.get(key) || Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.catch(() => {});
  queues.set(key, settled);
  settled.finally(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return run;
}
