export class ApiError extends Error {
  status: number;
  uncertain: boolean;
  privateGate: boolean;
  constructor(message: string, status = 0, uncertain = false, privateGate = false) { super(message); this.status = status; this.uncertain = uncertain;this.privateGate=privateGate; }
}
export function apiBase(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid API URL.');
  return url.href.replace(/\/$/, '');
}
export class ApiClient {
  base: string;
  private configurationError = false;
  private csrf: string | null = null;
  private tokenRequest: Promise<string> | null = null;
  private fetcher: typeof fetch;
  constructor(base: string, fetcher: typeof fetch = fetch) { try {this.base=apiBase(base);}catch{this.base='';this.configurationError=true;}this.fetcher=fetcher.bind(globalThis); }
  resetCsrf() { this.csrf = null; this.tokenRequest = null; }
  private async token(): Promise<string> {
    if (this.csrf) return this.csrf;
    if (!this.tokenRequest) this.tokenRequest = this.request<{token: string}>('GET', '/auth/csrf').then(value => { this.csrf = value.token; return value.token; }).finally(() => { this.tokenRequest = null; });
    return this.tokenRequest;
  }
  async request<T>(method: string, path: string, input?: unknown, signal?: AbortSignal, expectedOwner?: string): Promise<T> {
    if(this.configurationError)throw new ApiError('Account service address is invalid. Your device content is unchanged.');
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path.');
    const mutation = method !== 'GET';
    if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if(expectedOwner)headers['X-Bubble-Expected-Owner']=expectedOwner;
    if (mutation) headers['X-CSRF-TOKEN'] = await this.token();
    if (input !== undefined) headers['Content-Type'] = 'application/json';
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const finish = () => { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); };
    let response: Response;
    try {
      response = await this.fetcher(this.base + '/api/v1' + path, { method, headers, credentials: 'include', cache: 'no-store', signal: controller.signal, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
    } catch {
      finish();
      if (!mutation && signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
      throw new ApiError(mutation ? 'Connection lost. The change may have reached your account. Refresh before trying again; your draft is still here.' : 'Cannot reach your account. Check the connection and try again.', 0, mutation);
    }
    if (!response.ok) {
      finish();
      if (response.status === 401 || response.status === 403) this.resetCsrf();
      const messages: Record<number, string> = { 400: 'Check the fields and their length limits.', 401: 'Sign in again to access your account.', 403: 'The request was not permitted. Try again with a fresh session.', 404: 'This item is no longer available.', 409: 'This change conflicts with existing data. Refresh before trying again.', 413: 'This content is too large to send.', 429: 'Too many sign-in attempts. Please wait a minute.' };
      // A proxy/server failure can arrive after the database has committed.
      // Keep the draft and require reconciliation instead of allowing a duplicate retry.
      const uncertain = mutation && response.status >= 500;
      const privateGate=response.status===401&&!!response.headers.get('WWW-Authenticate')?.toLowerCase().startsWith('basic');
      throw new ApiError(privateGate?'Private beta access is required. Check your invitation credentials.':uncertain
        ? 'The account service failed to confirm this change. It may have been saved. Refresh before trying again; your draft is still here.'
        : messages[response.status] ?? 'The account service could not complete this request.', response.status, uncertain,privateGate);
    }
    if (response.status === 204) {finish();return undefined as T;}
    try { return await response.json() as T; }
    catch {
      if (!mutation && signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
      throw new ApiError('The account returned an unreadable response. Refresh before trying again.', response.status, mutation);
    } finally {finish();}
  }
}
