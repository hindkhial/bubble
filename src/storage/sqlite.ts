import type { ClientStorage } from './browser.ts';
export interface Database {
  execSync(sql: string): void;
  getFirstSync<T>(sql: string, ...params: string[]): T | null;
  runSync(sql: string, ...params: string[]): unknown;
  withTransactionSync(task: () => void): void;
}
// Versioned JSON records preserve existing models. Each replacement is atomic.
export function sqliteStorage(db: Database): ClientStorage {
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  db.withTransactionSync(() => {
    const version = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
    if (version > 1) throw new Error('This database needs a newer version of Bubble.');
    if (version === 0) db.execSync('CREATE TABLE IF NOT EXISTS bubble_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 1;');
    db.getFirstSync('SELECT key, value FROM bubble_state LIMIT 1');
  });
  return {
    getItem: key => db.getFirstSync<{ value: string }>('SELECT value FROM bubble_state WHERE key = ?', key)?.value ?? null,
    setItem: (key, value) => {
      if (!key.startsWith('bubble.') || /password|token|secret|session|credential/i.test(key)) throw new Error('Only non-secret application state belongs in this database.');
      db.runSync('INSERT INTO bubble_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
    },
  };
}
