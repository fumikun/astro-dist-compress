/** Runs `worker` over `items` with at most `concurrency` in flight at once. */
export async function runPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    results[index] = await worker(items[index]!);
    await runNext();
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => runNext());
  await Promise.all(workers);
  return results;
}
