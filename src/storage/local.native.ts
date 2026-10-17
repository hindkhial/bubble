import { openDatabaseSync } from 'expo-sqlite';
import { sqliteStorage } from './sqlite';
import type { ClientStorage } from './browser';
let storage: ClientStorage | undefined;
export function localStorage(): ClientStorage {
  if (!storage) {
    const db = openDatabaseSync('bubble.db');
    try { storage = sqliteStorage(db); }
    catch (error) { db.closeSync(); throw error; }
  }
  return storage;
}
