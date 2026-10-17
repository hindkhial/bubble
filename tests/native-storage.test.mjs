import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sqliteStorage } from '../src/storage/sqlite.ts';
import { stateCell } from '../src/storage/stateCell.ts';
function database(path) {
  const db = new DatabaseSync(path);
  return { db, adapter: {
    execSync: sql => db.exec(sql),
    getFirstSync: (sql, ...params) => db.prepare(sql).get(...params) ?? null,
    runSync: (sql, ...params) => db.prepare(sql).run(...params),
    withTransactionSync: task => { db.exec('BEGIN');try { task();db.exec('COMMIT'); } catch(e) {db.exec('ROLLBACK');throw e;} },
  } };
}
test('native SQLite records survive close/reopen: notes, checklists, pins, profile and appearance', () => {
  const root=mkdtempSync(join(tmpdir(),'bubble-sqlite-'));const path=join(root,'bubble.db');
  const records={ 'bubble.items.v1':[{id:'note',body:'private note',type:'NOTE'},{id:'list',type:'CHECKLIST',rows:[{text:'task',done:true}]}], 'bubble.bubbles.v1':[{id:'bubble'}], 'bubble.pins.v1':{bubble:['note']},'bubble.profile.v1':{displayName:'Synthetic',bio:'bio',imageUri:'bubble-photo:profile-abc.jpg'},'bubble.mode.v1':'dark','bubble.accent.v1':'Rose'};
  let connection=database(path);
  try {
    let store=sqliteStorage(connection.adapter);
    for(const [key,value] of Object.entries(records))store.setItem(key,JSON.stringify(value));
    connection.db.close();connection=database(path);store=sqliteStorage(connection.adapter);
    for(const [key,value] of Object.entries(records))assert.deepEqual(JSON.parse(store.getItem(key)),value);
    assert.throws(()=>store.setItem('bubble.session.token','secret'));
  } finally {connection.db.close();rmSync(root,{recursive:true,force:true});}
});
test('newer schemas are refused without modifying data', () => {
  const c=database(':memory:');c.db.exec("CREATE TABLE bubble_state(key TEXT PRIMARY KEY,value TEXT);INSERT INTO bubble_state VALUES('bubble.items.v1','keep');PRAGMA user_version=2;");
  assert.throws(()=>sqliteStorage(c.adapter),/newer/);
  assert.equal(c.db.prepare('PRAGMA user_version').get().user_version,2);
  assert.equal(c.db.prepare('SELECT value FROM bubble_state').get().value,'keep');c.db.close();
});
test('hydration does not write defaults and unreadable JSON cannot be overwritten', () => {
  const c=database(':memory:');const store=sqliteStorage(c.adapter);store.setItem('bubble.items.v1','{broken');
  const cell=stateCell('bubble.items.v1',[],Array.isArray,()=>store);
  assert.throws(()=>cell.save([]));assert.throws(()=>cell.hydrate());assert.throws(()=>cell.save([]));
  assert.equal(store.getItem('bubble.items.v1'),'{broken');c.db.close();
});
test('failed writes keep last committed state and subsequent edits compose without stale React state', () => {
  let raw='[]';let fail=false;const store={getItem:()=>raw,setItem:(_key,value)=>{if(fail)throw Error('disk full');raw=value;}};
  const cell=stateCell('bubble.items.v1',[],Array.isArray,()=>store);cell.hydrate();
  cell.save(previous=>[...previous,'first']);fail=true;assert.throws(()=>cell.save(['lost']),/disk full/);
  assert.deepEqual(cell.value,['first']);assert.equal(raw,'["first"]');fail=false;
  cell.save(previous=>[...previous,'second']);assert.deepEqual(cell.value,['first','second']);
});
test('schema mismatch and storage-open failures fail closed',()=>{
  const wrong=stateCell('bubble.items.v1',[],Array.isArray,()=>({getItem:()=>'{"unexpected":true}',setItem:()=>assert.fail('must not write')}));
  assert.throws(()=>wrong.hydrate());assert.throws(()=>wrong.save([]));
  const failed=stateCell('bubble.items.v1',[],Array.isArray,()=>{throw Error('cannot open database');});
  assert.throws(()=>failed.hydrate());assert.throws(()=>failed.save([]));
});
test('failed schema creation is rolled back, including its version marker',()=>{
 const c=database(':memory:');const broken={...c.adapter,execSync:sql=>{if(sql.includes('CREATE TABLE')){c.db.exec('CREATE TABLE bubble_state(key TEXT PRIMARY KEY,value TEXT); PRAGMA user_version=1;');throw Error('migration interrupted');}c.db.exec(sql);}};
 assert.throws(()=>sqliteStorage(broken),/migration interrupted/);
 assert.equal(c.db.prepare('PRAGMA user_version').get().user_version,0);
 assert.equal(c.db.prepare("SELECT name FROM sqlite_master WHERE name='bubble_state'").get(),undefined);c.db.close();
});
