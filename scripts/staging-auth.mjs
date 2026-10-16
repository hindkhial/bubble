import {readFileSync,statSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {validateStagingUrl} from './validate-staging-url.mjs';

// Node-only test tooling. Never bundle this or tester credentials into the app.
export function stagingCredentials(base, file=process.env.BUBBLE_TEST_AUTH_FILE) {
  if(!file) return undefined;
  const url=new URL(validateStagingUrl(base));
  if(!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Tester credentials require an isolated HTTPS localhost origin.');
  try {
    if(!isAbsolute(file)) throw new Error();
    const info=statSync(file);
    if(!info.isFile() || info.size>4096 || (info.mode&0o077)!==0) throw new Error();
    const value=JSON.parse(readFileSync(file,'utf8'));
    if(typeof value.username!=='string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value.username) || typeof value.password!=='string' || value.password.length<24) throw new Error();
    return {username:value.username,password:value.password,origin:url.origin};
  } catch {throw new Error('Cannot read protected tester credentials; use an absolute path to a valid owner-only JSON file.');}
}
export function stagingAuthorization(base,file=process.env.BUBBLE_TEST_AUTH_FILE) {
  const value=stagingCredentials(base,file);
  return value ? 'Basic '+Buffer.from(value.username+':'+value.password).toString('base64') : undefined;
}
