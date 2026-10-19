import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedEmail, validateAuthentication} from '../src/api/authValidation.ts';
test('authentication normalizes email without changing passwords',()=>{
 assert.equal(normalizedEmail('  TEST@Example.Test  '),'test@example.test');
 assert.equal(validateAuthentication({email:'test@example.test',password:' x '},false),null);
});
test('registration requires matching passwords and backend-compatible byte limits',()=>{
 const valid={email:'test@example.test',password:'valid-pass-123',confirmation:'valid-pass-123',displayName:'Name'};
 assert.equal(validateAuthentication(valid,true),null);
 for(const change of [{email:'invalid'},{displayName:' '},{password:'short'},{confirmation:'different'},{password:'😀'.repeat(20),confirmation:'😀'.repeat(20)}]) assert.ok(validateAuthentication({...valid,...change},true));
});
test('Unicode password boundaries work without a browser TextEncoder global',()=>{
 const encoder=globalThis.TextEncoder;globalThis.TextEncoder=undefined;
 try{
  const fields={email:'test@example.test',displayName:'Name',password:'😀'.repeat(18),confirmation:'😀'.repeat(18)};
  assert.equal(validateAuthentication(fields,true),null);
  assert.ok(validateAuthentication({...fields,password:'😀'.repeat(19),confirmation:'😀'.repeat(19)},true));
 }finally{globalThis.TextEncoder=encoder;}
});
