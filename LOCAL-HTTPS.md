# Trusted HTTPS for private browser verification

## Current result

**Resolved for isolated browser testing:** all nine scenarios pass in sandboxed Linux Chromium using a temporary NSS store, with both macOS keychains unchanged. The final execution record below supersedes earlier pending/failed startup records. The in-app macOS browser remains untrusted by design.

## Diagnosis (2026-10-16)

The local leaf certificate chains to the generated **Bubble private staging CA**. It is not issued by a public browser-trusted CA. Read-only macOS verification reports `CSSMERR_TP_NOT_TRUSTED`; a lookup for this CA in the current login keychain finds no entry. A fresh in-app browser attempt returned `ERR_CERT_AUTHORITY_INVALID`. Browser inventory currently exposes only that in-app browser, with no separate unrestricted Chrome/Firefox runner.

The certificate is otherwise valid: OpenSSL verifies its server-auth chain against the explicit public CA; its SAN contains `DNS:localhost` and `IP:127.0.0.1`; a Node TLS connection with `rejectUnauthorized: true`, the supplied CA and normal hostname verification succeeds. The served leaf fingerprint exactly matches the configured file. No key, password, trust store or TLS setting was changed for these checks. Node's explicit CA applies to that client only, not browsers.

Current public metadata (recheck after any renewal):

| Certificate | Validity (UTC) | SHA-256 fingerprint |
| --- | --- | --- |
| Root CA | 2026-10-16 04:38:41 to 2026-10-23 04:38:41 | `09:F1:2C:4A:5F:B8:98:3A:38:9F:05:7F:D9:D1:34:B1:A0:CD:A0:AE:7C:A9:35:54:17:A2:16:B3:09:94:C9:10` |
| localhost leaf | 2026-10-16 04:38:42 to 2026-10-23 04:38:42 | `B1:33:9A:EF:23:8D:70:E3:76:39:9D:34:0A:98:19:04:78:E9:1F:19:0D:B7:1C:53:3F:CF:F6:83:B8:16:EE:52` |

The chain expires when the root expires, one second before the leaf. In Africa/Casablanca that is **October 23 at 05:38:41**. Certificate Transparency status is not a reason to disable any protection; this private CA is deliberately outside the public trust program.

## Approval and scope

**The owner declined macOS login-keychain trust. Both login and System keychains must remain unchanged.** The OS-store procedures below are reference alternatives only and must not be executed without new, explicit approval. These instructions are a proposed operator action, **not an executed trust change**. Obtain explicit owner approval before importing/trusting this CA anywhere. Prefer an isolated Firefox profile for manual testing or a disposable OS user/VM for Chromium automation. Incognito/a Chrome profile alone does not isolate macOS or Windows root trust. The current CA has no name constraints: trusting it permits valid certificates it signs for other names too, not just localhost. Protect `ca.key`; never import or distribute it. Import only the verified **public `ca.crt`**, not the leaf, keys, tester JSON or database credentials. Do not use a generic “trust all certificates” setting, `ignoreHTTPSErrors`, insecure TLS environment variables, certificate-ignore flags or warning bypasses.

Use a new CA in a separate disposable environment if these fingerprints do not match the authorized files. Do not regenerate database passwords or replace the existing volume to solve TLS problems. Renewal of this short-lived CA requires an approved replacement/trust procedure and removal of the old trust.

Before import, inspect the public certificate locally and compare its SHA-256 fingerprint using `openssl x509 -in /absolute/protected/bubble-staging/ca.crt -noout -sha256 -fingerprint -dates`. Obtain the file/fingerprint through the local trusted operator, not the untrusted site's warning page.

## macOS: current host, login keychain (approval required)

1. Prefer a dedicated macOS test user/VM. If using the current user, approval must explicitly cover that user's SSL trust, which can affect Safari, Chrome and other applications for that user. This is broader than a browser profile. The in-app browser may require an application restart and may use additional verification policies; do not assume it inherits a change until it is tested.
2. Open **Keychain Access** through Spotlight. Select **login**, not System/System Roots. Choose File → Import Items and select the verified public `ca.crt`. Do not import a `.key` or PKCS#12 identity.
3. Locate **Bubble private staging CA**, double-click and verify the full SHA-256 fingerprint and expiry. Expand **Trust** and set only **Secure Sockets Layer (SSL)** to **Always Trust**. Leave other purposes at their defaults. Save; the owner handles any macOS authentication prompt privately. Do not send passwords to the agent.
4. Close/reopen the test browser. Restart Codex only after preserving work and coordinating that interruption with the owner. Visit `https://localhost:8443`; the expected next step is the tester gate with a verified certificate, not a security warning. Reinspect the served chain/fingerprint. If a warning remains, stop and inspect its exact reason—do not click through.
5. At the end, remove SSL trust for this exact fingerprint and remove only the imported development CA entry if no longer needed. Preserve all unrelated certificates. Restart the browser and confirm it no longer trusts this private site. Do not reset the entire keychain.

Reference: [Apple's certificate trust instructions](https://support.apple.com/guide/keychain-access/change-the-trust-settings-of-a-certificate-kyca11871/mac). The SSL-only/login choice limits this proposed action; it is not a guarantee of hostname-scoped trust. [Chromium's root-store FAQ](https://chromium.googlesource.com/chromium/src/+/main/net/data/ssl/chrome_root_store/faq.md) describes consuming local platform trust decisions.

## Firefox: profile-only manual testing on macOS, Windows or Linux

After approval, create a dedicated **Bubble HTTPS Test** profile using Firefox's profile manager (`about:profiles` on versions exposing it); do not use a daily profile or enable Sync. In that profile open Settings → Privacy & Security → Certificates → View Certificates → **Authorities** → Import. Select only the verified public `ca.crt` and enable website/server trust only; do not enable email trust. Restart this profile and verify the gate opens at the exact HTTPS origin without a warning. The imported root is profile data; do not also import it into the OS. Remove/distrust that exact CA afterward, or discard only the disposable profile after preserving synthetic test evidence. Firefox manual testing does **not** count as passing the configured Chromium suite; Playwright's bundled Firefox uses a separate profile too.

References: [Mozilla profile management](https://support.mozilla.org/en-US/kb/profile-manager-create-remove-switch-firefox-profiles), [Mozilla CA import/removal](https://wiki.mozilla.org/CA/Changing_Trust_Settings). UI labels vary by Firefox version; stop if the intended profile/scope is unclear.

## Windows: Chromium on a disposable test user/VM

After approval, open `certmgr.msc` for the **Current User**, import only the verified public CA into Trusted Root Certification Authorities → Certificates, review its identity/fingerprint, then restart the test Chromium browser. Do not use `certlm.msc`, Local Computer, Group Policy or a personal daily account. An isolated browser context does not isolate that OS user's trusted roots. Remove only the imported development certificate after testing and verify distrust after browser restart. [Microsoft certificate-store tooling](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil) documents current-user versus machine stores; no machine-wide import is needed here.

## Linux: Chromium on an unrestricted disposable runner

After approval, use a dedicated OS user/container/VM without personal credentials. Import only the public CA through that Chromium build's certificate manager or its documented NSS trust database, with website/server trust only. Verify the actual build/version and active database before import: Chromium M146+ defaults to `~/.local/share/pki/nssdb`, but uses an existing `~/.pki/nssdb` instead. A different browser data directory alone does not necessarily isolate that shared database. Do not change the host's global `/usr/local/share/ca-certificates` or run global trust updates for this test. [Chromium's Linux certificate instructions](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/cert_management.md) describe the supported manager/database and certificate removal. Keep the browser sandbox enabled and TLS verification active; use a normal runner that supports them, not security-disabling launch flags.

A runner on another machine cannot reach this host's loopback service. Recreate the existing private stack locally there using new protected synthetic fixtures/certificates and reviewed images; do not expose this host or copy private keys/secrets across machines. Any remote access/infrastructure requires separate approval.

## Run and record the nine scenarios

1. Build the reviewed web artifact and serve it only through the existing gated HTTPS configuration. Record source commit, web image ID and backend/database image IDs. Verify healthy containers, loopback-only bindings and successful TLS/gate/account smoke checks first. Never run destructive test fixtures against personal content.
2. Establish approved trust for the **same OS user/browser build used by Playwright**, then verify the site has no certificate error. Node CA configuration alone is insufficient. The separate historical macOS Mach-port browser-launch failure may persist even after trust is fixed; report a launch failure as infrastructure failure, not an app assertion/pass. Do not change OS security policy to bypass it.
3. On an unrestricted runner with existing dependencies, use the exact command below. The nine tests are serial; allow all to report. Do not upload raw traces, which may include synthetic tester credentials/cookies. Fresh test accounts are synthetic and remain in the disposable database.

```sh
BUBBLE_E2E_URL=https://localhost:8443 \
BUBBLE_E2E_API_URL=https://localhost:8443 \
BUBBLE_E2E_REUSE_SERVER=1 BUBBLE_E2E_DISPOSABLE=1 \
BUBBLE_TEST_AUTH_FILE=/absolute/protected/bubble-staging/tester-credentials.json \
NODE_EXTRA_CA_CERTS=/absolute/protected/bubble-staging/ca.crt \
pnpm test:e2e
```

Record Passed/Failed/Not Tested separately for each of the nine scenarios and each manual matrix row in [BETA-TESTING.md](BETA-TESTING.md). A browser launch/certificate failure proves none of the application scenarios passed. Mobile/tablet/desktop visuals, full keyboard focus order, screen-reader output and rendered reduced motion still need the manual matrix even if automation passes.

## Isolated Linux browser investigation

The owner requested a dedicated browser/test trust store instead of expanding macOS trust. The proposed environment is a disposable non-root Linux browser container using Playwright 1.64.0's official image (multi-platform index `sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f`; amd64 manifest `sha256:bc72a8df40831ded821e3cbc79c318c21b44d6e51dff9fd89ace7a8249c5b462`). It has no host keychain or CA private-key mount, no Docker socket, no database credentials and no published ports. Its temporary home and private NSS database are destroyed with the container. Only the verified public CA and synthetic gate credential are provided for this test; a copy of the credential is owner-only inside that temporary home.

The full CA fingerprint was compared with the complete value in this document and matched, not merely its prefix. Browser startup is probed **before importing any CA**, with Chromium's sandbox enabled and Docker's default security restrictions. If those restrictions prevent startup, do not silently disable the browser sandbox or use a privileged container. Explain the exact additional permission required and obtain approval or use an unrestricted disposable runner.

If sandboxed startup succeeds, the proposed trust proof is: a fresh Chromium process rejects the HTTPS certificate; import the single public root into this container user's NSS store with SSL CA trust only (`C,,`, no email/object-signing trust); a new process validates HTTPS and renders Bubble; run the nine scenarios; remove the imported nickname from NSS; a fresh process must reject the same certificate again. This is normal CA/hostname/expiry verification with a narrowly located root store, not a certificate exception. The root remains capable of vouching for other names **inside that container**, so browse only the controlled local test site.

The runner can join only the existing web container's network namespace, making its `localhost:8443` the gated Nginx server without publishing a new port or broadening the host listener. This also gives it the web service's network reachability; account authorization and TLS/tester protections remain in force. No remote browser server or tunnel is exposed.

Removal is explicit NSS certificate deletion followed by a negative HTTPS test and container removal, including temporary home/store and synthetic session state. Raw traces/reports may contain synthetic credentials and remain outside Git in a protected operator directory. They are not a reason to retain CA trust. This section describes the proposed scope; the final execution record must state whether startup, trust proof, scenarios and cleanup actually succeeded.

### Observed runner prerequisite

The official Linux runner image built successfully. A non-root Chromium launch with `chromiumSandbox: true`, Docker's default seccomp restrictions, dropped capabilities, no-new-privileges, read-only root and temporary home failed with **No usable sandbox** before navigation. The probe container was disposable and no CA was mounted/imported. This is a sandbox startup failure, not a certificate verification failure or an application test result.

Playwright publishes a versioned seccomp profile allowing namespace operations (`clone`, `setns`, `unshare`) for sandboxed browsers. Its v1.64.0 file was downloaded from the official repository and prepared outside Git with SHA-256 `cc3e61cabda6bbc1e53e54d27ba4d55a9d3be829b6dd1a596f4a7b31b1cc7849`; it has not been applied. Using it is a container-only syscall policy change and requires owner approval before retry. It does not require `--privileged`, `SYS_ADMIN`, a disabled Chromium sandbox, macOS trust changes or disabled TLS. The profile may not resolve a separate kernel/AppArmor restriction; do not promise a pass before execution. [Official Docker/sandbox guidance](https://playwright.dev/docs/docker) and [versioned profile](https://raw.githubusercontent.com/microsoft/playwright/v1.64.0/utils/docker/seccomp_profile.json).

### Result using the approved official profile

The owner approved that specific container-only policy. Its official version-matched bytes and applied Docker policy were verified before startup. Container restrictions were inspected and confirmed; temporary-home ownership was corrected to the actual image user UID/GID 1001. The retry reached Chromium's sandbox but exited at `sys_chroot("/proc/self/fdinfo/")`, then failed with a fatal zygote exit/SIGTRAP before any CA import or HTTPS page load. The official policy contains a chroot rule conditional on `CAP_SYS_CHROOT`; ALL capabilities were intentionally dropped, so this condition was not present. This is consistent with the failure, not a completed TLS trust proof. The disposable container was removed and its absence verified. Both macOS keychains and all CA trust stores remain unchanged.

A separate **unapplied** proposal removes only that chroot rule's capability condition. It keeps the default deny action and all other rules unchanged, with ALL Linux capabilities still dropped. Proposal SHA-256: `322b86b4f7f5b597ed6a9c2cfd6193a4b249a51c8bc9cfba8ff1a485070b24e8`. It permits an additional syscall inside the container; it does not grant host/system capability or disable TLS/sandbox protections. The owner must explicitly approve this new exception before any retry. Do not silently add SYS_ADMIN, privileged mode, an unconfined policy, a disabled sandbox, or macOS trust. If further restrictions appear, stop again rather than expanding permissions automatically. An unrestricted disposable machine using its own isolated certificate store remains the safer operational alternative to repeatedly widening this runtime policy.

## Successful isolated execution and removal

The owner subsequently approved the one-rule chroot exception. The candidate was checked structurally against the official version-matched profile to ensure that only the chroot rule's capability condition changed. The non-root, cap-drop-ALL, no-new-privileges, read-only, no-port configuration was inspected again; no added capability, privileged mode, sandbox/TLS bypass or additional host mount was used. Temporary home ownership matched image UID/GID 1001.

Sandboxed Chromium 156.0.8078.4 successfully performed the negative/positive trust controls and rendered Bubble. After the confirmed browser accessibility fix and profile-test save synchronization correction, **all nine scenarios passed**, zero failures/skips/flaky results. The imported public CA was deleted from the container user's NSS store, and a newly launched browser again rejected the same certificate. Private artifacts were streamed out before the temporary filesystem disappeared, then the container was removed and absence verified. Both macOS keychains remain unchanged and host verification continues to report this CA as untrusted, as intended.

The trust scope was this container's temporary home/store only, with SSL CA trust (`C,,`) for the exact fingerprint above. It could vouch for other names inside that container, so browsing was restricted to the controlled test site. No trust or credentials were baked into the test image; retained images contain public test code/dependencies only. Repeating the run requires a new temporary store and the same explicit fingerprint/configuration checks; approvals do not authorize any further policy expansion.

The existing private web stack now selects `bubble-web:beta-checked-state` through its protected web-only override. Raw test artifacts and operator scripts/policies are retained privately outside Git; do not publish traces or credential files. The current result certifies the configured Chromium scenarios, not Safari/Firefox/native or the remaining full manual accessibility/responsive matrix. See BETA-TESTING.md for exact final results and hashes.


## GitHub-hosted browser CI

The release-readiness workflow uses a new disposable Linux runner and generates its own temporary CA for each run. It does **not** reuse the operator CA or its private key. The full generated SHA-256 fingerprint is independently obtained through OpenSSL, compared with Node X509Certificate, and the CA self-signature/expiry checked before NSS import. Consequently that per-run fingerprint differs from the fixed local operator fingerprint above; never substitute the local operator CA without verifying its documented full fingerprint and authorization.

Only sandboxed Chromium processes given the fresh temporary browser HOME use that NSS root. The normal runner certificate database, global OS trust and macOS keychains are unchanged. The approved macOS Docker seccomp exception is unnecessary on this Ubuntu 22.04 hosted path; no host sandbox policies are relaxed. Negative TLS checks run before import and after root removal. The test store, generated keys, credentials and uniquely owned Compose data volume are deleted afterward, including normal failure cleanup. Forced termination is contained by disposal of the ephemeral hosted runner. The workflow uploads no browser traces/screenshots/raw credential-bearing reports.

See TESTING.md for actual run outcomes; configuration presence alone is not a test pass.
