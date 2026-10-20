import ExpoModulesCore
import Foundation
import Security
import CryptoKit
import UIKit

private enum SessionFailure: Error { case invalidRequest, keychain, invalidResponse }

// Never customize server-trust handling. URLSession performs normal TLS checks.
private final class RedirectPolicy: NSObject, URLSessionTaskDelegate {
  func urlSession(_ session: URLSession, task: URLSessionTask,
    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
    completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

private actor SessionTransport {
  private let policy = RedirectPolicy()
  private lazy var session: URLSession = {
    let config = URLSessionConfiguration.ephemeral
    config.httpCookieStorage = nil
    config.httpShouldSetCookies = false
    config.urlCredentialStorage = nil
    config.urlCache = nil
    config.requestCachePolicy = .reloadIgnoringLocalCacheData
    config.timeoutIntervalForRequest = 15
    return URLSession(configuration: config, delegate: policy, delegateQueue: nil)
  }()
  private var generation = 0
  private var gate: (origin: String, value: String)?
  private var verifiedOwner: (base: String, id: String, clock: OfflineClock)?
  private var loginInProgress = false
  private let vault = OfflineVault()
  private var networkAllowed = false
  private var vaultEpoch = -1
  private var snapshotSequence = 0

  func lockForBackground() async {
    networkAllowed = false; generation += 1; verifiedOwner = nil
    await vault.lock()
  }
  func prepareOnline() async throws {
    networkAllowed = false; generation += 1; verifiedOwner = nil
    let ticket = generation
    let unlockedEpoch = try await vault.authenticate()
    guard ticket == generation else { throw SessionFailure.invalidRequest }
    vaultEpoch = unlockedEpoch
    networkAllowed = true
  }
  func unlockOffline(_ value: String) async throws -> String {
    let base = try origin(value)
    networkAllowed = false; generation += 1; verifiedOwner = nil
    let ticket = generation
    let snapshot = try await vault.unlock(base)
    guard ticket == generation else { await vault.lock(); throw SessionFailure.invalidRequest }
    return snapshot
  }
  func cacheSnapshot(_ value: String, json: String) async throws {
    let base = try origin(value)
    guard networkAllowed, let owner = verifiedOwner, owner.base == base, try cookie(base) != nil else { throw SessionFailure.invalidRequest }
    guard let data = json.data(using: .utf8), let snapshot = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      snapshot["version"] as? Int == 1, let account = snapshot["owner"] as? [String: Any],
      account["id"] as? String == owner.id else { throw SessionFailure.invalidRequest }
    let ticket = generation
    let epoch = vaultEpoch
    snapshotSequence += 1; let sequence = snapshotSequence
    try await vault.verified(base, owner: owner.id, issued: owner.clock, expectedEpoch: epoch, sequence: sequence)
    guard ticket == generation, networkAllowed else { await vault.lock(); throw SessionFailure.invalidRequest }
    try await vault.save("snapshot", json: json, base: base, owner: owner.id, expectedEpoch: epoch, sequence: sequence)
  }
  func saveDraft(_ base: String, owner: String, id: String, json: String) async throws {
    guard networkAllowed, let current = verifiedOwner, current.base == base, current.id == owner else { throw SessionFailure.invalidRequest }
    guard let data = json.data(using: .utf8), let draft = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      draft["id"] as? String == id, draft["version"] as? Int == 1 else { throw SessionFailure.invalidRequest }
    try await vault.save("draft-" + id, json: json, base: base, owner: owner, expectedEpoch: vaultEpoch)
  }
  func drafts(_ base: String, owner: String) async throws -> [String] {
    guard networkAllowed, let current = verifiedOwner, current.base == base, current.id == owner else { throw SessionFailure.invalidRequest }
    let ticket = generation
    let result = try await vault.drafts(base: base, owner: owner)
    guard ticket == generation else { throw SessionFailure.invalidRequest }
    return result
  }
  func removeDraft(_ base: String, owner: String, id: String) async throws {
    guard networkAllowed, let current = verifiedOwner, current.base == base, current.id == owner else { throw SessionFailure.invalidRequest }
    try await vault.removeDraft(id, base: base, owner: owner)
  }
  func validateOffline() async throws { guard !networkAllowed else { throw SessionFailure.invalidRequest }; try await vault.validateOffline() }
  func revokeOffline(_ value: String) async throws {
    let base = try origin(value)
    generation += 1; verifiedOwner = nil
    // Keep only the cookie/gate needed for the subsequent server logout request.
    // Owner-scoped publication/cache/draft calls are rejected immediately.
    try await vault.revoke(base)
  }

  private func origin(_ value: String) throws -> String {
    guard let parts = URLComponents(string: value), parts.scheme == "https",
      let host = parts.host, !host.isEmpty, parts.user == nil, parts.password == nil,
      parts.query == nil, parts.fragment == nil, parts.path.isEmpty || parts.path == "/"
      else { throw SessionFailure.invalidRequest }
    return "https://" + host.lowercased() + (parts.port.map { ":\($0)" } ?? "")
  }
  private func query(_ base: String) -> [String: Any] {
    let account = SHA256.hash(data: Data(base.utf8)).map { String(format: "%02x", $0) }.joined()
    return [kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "com.hindkhial.bubble.session",
      kSecAttrAccount as String: account]
  }
  private func remove(_ base: String) throws {
    let status = SecItemDelete(query(base) as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { throw SessionFailure.keychain }
  }
  private func cookie(_ base: String) throws -> String? {
    var q = query(base); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(q as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = result as? Data,
      let record = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      let value = record["value"] as? String, let expiry = record["expiry"] as? Double
      else { throw SessionFailure.keychain }
    if expiry <= Date().timeIntervalSince1970 { try remove(base); return nil }
    return value
  }
  private func persist(_ base: String, value: String) throws {
    // The server remains authoritative; startup always verifies /users/me online.
    let data = try JSONSerialization.data(withJSONObject: ["value": value,
      "expiry": Date().addingTimeInterval(30 * 60).timeIntervalSince1970])
    let q = query(base)
    let attributes: [String: Any] = [kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
    let updated = SecItemUpdate(q as CFDictionary, attributes as CFDictionary)
    if updated == errSecItemNotFound {
      var insertion = q; attributes.forEach { insertion[$0.key] = $0.value }
      guard SecItemAdd(insertion as CFDictionary, nil) == errSecSuccess else { throw SessionFailure.keychain }
    } else if updated != errSecSuccess { throw SessionFailure.keychain }
  }
  func setGate(_ base: String, username: String, password: String) throws {
    let base = try origin(base)
    guard !username.contains(":"), !username.contains("\n"), !password.contains("\n") else { throw SessionFailure.invalidRequest }
    gate = username.isEmpty ? nil : (base, Data("\(username):\(password)".utf8).base64EncodedString())
  }
  func clear(_ value: String) async throws {
    let base = try origin(value); generation += 1
    networkAllowed = false
    verifiedOwner = nil
    gate = nil
    do { try await vault.revoke(base) } catch { try remove(base); await vault.lock(); throw error }
    try remove(base)
  }
  func request(_ value: String, path: String, method: String, body: String?, csrf: String?, expectedOwner: String?) async throws -> [String: Any] {
    guard OfflinePolicy.allowsNetwork(networkAllowed, expectedOwner: expectedOwner, actualOwner: verifiedOwner?.id), !loginInProgress else { throw SessionFailure.invalidRequest }
    let base = try origin(value)
    if let expectedOwner = expectedOwner {
      guard verifiedOwner?.base == base, verifiedOwner?.id == expectedOwner else { throw SessionFailure.invalidRequest }
    }
    guard path.hasPrefix("/api/v1/"), !path.contains("#"), !path.contains("\\"),
      ["GET", "POST", "PATCH", "PUT", "DELETE"].contains(method),
      let url = URL(string: base + path), url.host == URL(string: base)?.host,
      (body?.utf8.count ?? 0) <= 1_048_576 else { throw SessionFailure.invalidRequest }
    // A login starts a new session generation. Late pre-login responses must
    // never replace or delete the newly rotated session cookie.
    let login = method == "POST" && path == "/api/v1/auth/login"
    if login { generation += 1; verifiedOwner = nil; loginInProgress = true }
    defer { if login { loginInProgress = false } }
    let ticket = generation
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let value = try cookie(base) { request.setValue("BUBBLE_SESSION=" + value, forHTTPHeaderField: "Cookie") }
    if let gate = gate, gate.origin == base { request.setValue("Basic " + gate.value, forHTTPHeaderField: "Authorization") }
    if let csrf = csrf { request.setValue(csrf, forHTTPHeaderField: "X-CSRF-TOKEN") }
    if let body = body { request.httpBody = Data(body.utf8); request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
    let (data, response) = try await session.data(for: request)
    guard ticket == generation, let response = response as? HTTPURLResponse,
      data.count <= 8_388_608 else { throw SessionFailure.invalidResponse }
    // The outer tester gate is not an application-session rejection. Preserve
    // the session until the tester unlocks the gate and /users/me verifies it.
    let testerGate = response.value(forHTTPHeaderField: "WWW-Authenticate")?.lowercased().hasPrefix("basic") ?? false
    if response.statusCode == 401 && !testerGate {
      generation += 1; networkAllowed = false
      verifiedOwner = nil
      // Preserve HTTP rejection classification even if local cleanup fails.
      // Vault also denies in memory before attempting durable revocation.
      try? remove(base)
      do { try await vault.revoke(base) } catch { await vault.lock() }
      // A rejected login/session cannot silently fall back to the offline grant.
      networkAllowed = false
    }
    // No cookie/header material is returned to JavaScript.
    var headers: [String: String] = [:]
    response.allHeaderFields.forEach { headers[String(describing: $0.key)] = String(describing: $0.value) }
    for cookie in HTTPCookie.cookies(withResponseHeaderFields: headers, for: url) where cookie.name == "BUBBLE_SESSION" {
      guard cookie.path == "/",
        cookie.domain.lowercased() == url.host?.lowercased() else { throw SessionFailure.invalidResponse }
      if cookie.value.isEmpty || (cookie.expiresDate.map { $0 <= Date() } ?? false) { try remove(base); continue }
      guard cookie.isSecure, cookie.isHTTPOnly else { throw SessionFailure.invalidResponse }
      try persist(base, value: cookie.value)
    }
    if method == "GET" && path == "/api/v1/users/me" && response.statusCode == 200 {
      guard let identity = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let id = identity["id"] as? String, UUID(uuidString: id) != nil else { throw SessionFailure.invalidResponse }
      let clock = try await vault.currentClock()
      guard ticket == generation else { throw SessionFailure.invalidRequest }
      verifiedOwner = (base, id, clock)
    }
    return ["status": response.statusCode, "body": String(data: data, encoding: .utf8) ?? "", "privateGate": testerGate]
  }

  private func assetsContext() throws -> (key: String, directory: URL) {
    guard let owner = verifiedOwner, try cookie(owner.base) != nil else { throw SessionFailure.invalidRequest }
    let key = owner.base + ":profile:" + owner.id
    let hash = SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
    let folder = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
      .appendingPathComponent("BubbleAccountPhotos", isDirectory: true).appendingPathComponent(hash, isDirectory: true)
    return (key, folder)
  }
  func assets() throws -> [String: String] {
    let context = try assetsContext()
    var q = query(context.key); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    let status = SecItemCopyMatching(q as CFDictionary, &result)
    if status == errSecItemNotFound { return [:] }
    guard status == errSecSuccess, let data = result as? Data,
      var record = try JSONSerialization.jsonObject(with: data) as? [String: String] else { throw SessionFailure.keychain }
    if let name = record.removeValue(forKey: "photo"), UUID(uuidString: name) != nil {
      let file = context.directory.appendingPathComponent(name + ".jpg")
      if FileManager.default.fileExists(atPath: file.path) { record["imageUri"] = file.absoluteString }
    }
    return record
  }
  func saveAssets(color: String, emoji: String, image: String?) throws -> [String: String] {
    let context = try assetsContext()
    guard color.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil,
      emoji.count <= 16 else { throw SessionFailure.invalidRequest }
    var folder = context.directory
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.complete])
    var resource = URLResourceValues(); resource.isExcludedFromBackup = true; try folder.setResourceValues(resource)
    let previous = try assets()["imageUri"].flatMap { URL(string: $0) }
    var photo: URL?
    var created = false
    if let image = image, !image.isEmpty {
      guard let source = URL(string: image), source.isFileURL else { throw SessionFailure.invalidRequest }
      let resolved = source.resolvingSymlinksInPath()
      let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true).resolvingSymlinksInPath().path + "/"
      guard resolved.path.hasPrefix(home), let size = try resolved.resourceValues(forKeys: [.fileSizeKey]).fileSize,
        size > 0, size <= 10 * 1024 * 1024 else { throw SessionFailure.invalidRequest }
      if resolved == previous?.resolvingSymlinksInPath() { photo = previous }
      else {
        photo = folder.appendingPathComponent(UUID().uuidString + ".jpg")
        try Data(contentsOf: resolved).write(to: photo!, options: [.atomic, .completeFileProtection]); created = true
      }
    }
    var record = ["avatarColor": color, "avatarEmoji": emoji]
    if let photo = photo { record["photo"] = photo.deletingPathExtension().lastPathComponent }
    do {
      let data = try JSONSerialization.data(withJSONObject: record)
      let q = query(context.key)
      let attributes: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
      let status = SecItemUpdate(q as CFDictionary, attributes as CFDictionary)
      if status == errSecItemNotFound {
        var insertion = q; attributes.forEach { insertion[$0.key] = $0.value }
        guard SecItemAdd(insertion as CFDictionary, nil) == errSecSuccess else { throw SessionFailure.keychain }
      } else if status != errSecSuccess { throw SessionFailure.keychain }
    } catch { if created, let photo = photo { try? FileManager.default.removeItem(at: photo) }; throw error }
    if let previous = previous, previous != photo, previous.deletingLastPathComponent() == folder { try? FileManager.default.removeItem(at: previous) }
    return try assets()
  }
}

public class BubbleSessionModule: Module {
  private let transport = SessionTransport()
  private var backgroundObserver: NSObjectProtocol?
  public func definition() -> ModuleDefinition {
    Name("BubbleSession")
    OnCreate {
      self.backgroundObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
        guard let self = self else { return }
        Task { await self.transport.lockForBackground() }
      }
    }
    OnDestroy { if let observer = self.backgroundObserver { NotificationCenter.default.removeObserver(observer) }; self.backgroundObserver = nil }
    AsyncFunction("lock") { () async in await self.transport.lockForBackground() }
    AsyncFunction("validateOffline") { () async throws in try await self.transport.validateOffline() }
    AsyncFunction("revokeOffline") { (base: String) async throws in try await self.transport.revokeOffline(base) }
    AsyncFunction("prepareOnline") { () async throws in try await self.transport.prepareOnline() }
    AsyncFunction("unlockOffline") { (base: String) async throws -> String in try await self.transport.unlockOffline(base) }
    AsyncFunction("cacheSnapshot") { (base: String, json: String) async throws in try await self.transport.cacheSnapshot(base, json: json) }
    AsyncFunction("saveDraft") { (base: String, owner: String, id: String, json: String) async throws in try await self.transport.saveDraft(base, owner: owner, id: id, json: json) }
    AsyncFunction("drafts") { (base: String, owner: String) async throws -> [String] in try await self.transport.drafts(base, owner: owner) }
    AsyncFunction("removeDraft") { (base: String, owner: String, id: String) async throws in try await self.transport.removeDraft(base, owner: owner, id: id) }
    AsyncFunction("request") { (base: String, path: String, method: String, body: String?, csrf: String?, expectedOwner: String?) async throws -> [String: Any] in
      try await self.transport.request(base, path: path, method: method, body: body, csrf: csrf, expectedOwner: expectedOwner)
    }
    AsyncFunction("clear") { (base: String) async throws in try await self.transport.clear(base) }
    AsyncFunction("setGate") { (base: String, username: String, password: String) async throws in
      try await self.transport.setGate(base, username: username, password: password)
    }
    AsyncFunction("assets") { () async throws -> [String: String] in try await self.transport.assets() }
    AsyncFunction("saveAssets") { (color: String, emoji: String, image: String?) async throws -> [String: String] in
      try await self.transport.saveAssets(color: color, emoji: emoji, image: image)
    }
  }
}
