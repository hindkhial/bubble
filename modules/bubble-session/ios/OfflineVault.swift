import Foundation
import CryptoKit
import Security
import LocalAuthentication
import Darwin

enum VaultFailure: Error { case locked, unavailable, invalid, expired, missingKey }

// A separate native boundary: no HTTP client, session cookie or password here.
actor OfflineVault {
  private struct Record: Codable {
    let version: Int
    let base: String
    let owner: String
    let key: Data
    var issued: OfflineClock
    var revoked: Bool
  }
  private let service = "com.hindkhial.bubble.offline.v1"
  private var context: LAContext?
  private var opened: Record?
  private var offline = false
  private var epoch = 0
  private var revokedOrigins = Set<String>()
  private var persistedRevocations = Set<String>()
  private var snapshotSequence = 0
  private func clock() throws -> OfflineClock {
    var boot = timeval(); var size = MemoryLayout<timeval>.size
    guard sysctlbyname("kern.boottime", &boot, &size, nil, 0) == 0, boot.tv_sec > 0 else { throw VaultFailure.unavailable }
    return OfflineClock(wall: Date().timeIntervalSince1970, uptime: ProcessInfo.processInfo.systemUptime, boot: String(boot.tv_sec))
  }
  private func identifier(_ base: String, _ owner: String) -> String {
    SHA256.hash(data: Data((base + "\n" + owner).utf8)).map { String(format: "%02x", $0) }.joined()
  }
  private func query(_ name: String) -> [String: Any] {
    [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: name]
  }
  private func read(_ name: String) throws -> Data? {
    guard let context = context else { throw VaultFailure.locked }
    var q = query(name); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
    q[kSecUseAuthenticationContext as String] = context
    var result: CFTypeRef?
    let status = SecItemCopyMatching(q as CFDictionary, &result)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = result as? Data else { throw VaultFailure.unavailable }
    return data
  }
  private func write(_ name: String, _ data: Data) throws {
    guard let context = context else { throw VaultFailure.locked }
    var q = query(name); q[kSecUseAuthenticationContext as String] = context
    let status = SecItemUpdate(q as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if status == errSecItemNotFound {
      var error: Unmanaged<CFError>?
      guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, .userPresence, &error) else { throw VaultFailure.unavailable }
      q[kSecAttrAccessControl as String] = access; q[kSecValueData as String] = data
      guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw VaultFailure.unavailable }
    } else if status != errSecSuccess { throw VaultFailure.unavailable }
  }
  private func folder(_ record: Record) throws -> URL {
    let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
      .appendingPathComponent("BubbleOffline-v1", isDirectory: true)
    return root.appendingPathComponent(identifier(record.base, record.owner), isDirectory: true)
  }
  private func persist(_ record: Record) throws { try write(identifier(record.base, record.owner), JSONEncoder().encode(record)) }
  func lock() {
    epoch += 1; snapshotSequence = 0; opened = nil; offline = false; context?.invalidate(); context = nil
  }
  func authenticate() async throws -> Int {
    lock(); let ticket = epoch; let auth = LAContext()
    var error: NSError?
    guard auth.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { throw VaultFailure.unavailable }
    let success = try await auth.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock your private Bubble data")
    guard success, ticket == epoch else { auth.invalidate(); throw VaultFailure.locked }
    context = auth
    return ticket
  }
  func currentClock() throws -> OfflineClock { try clock() }
  func verified(_ base: String, owner: String, issued: OfflineClock, expectedEpoch: Int, sequence: Int) throws {
    guard sequence > snapshotSequence, epoch == expectedEpoch, UUID(uuidString: owner) != nil, context != nil else { throw VaultFailure.locked }
    let name = identifier(base, owner)
    let record: Record
    if let data = try read(name) {
      let old = try JSONDecoder().decode(Record.self, from: data)
      guard old.version == 1, old.base == base, old.owner == owner, old.key.count == 32 else { throw VaultFailure.invalid }
      record = Record(version: 1, base: base, owner: owner, key: old.key, issued: issued, revoked: false)
    } else {
      // Never replace a missing key when encrypted files still exist.
      let probe = Record(version: 1, base: base, owner: owner, key: Data(), issued: try clock(), revoked: true)
      guard !FileManager.default.fileExists(atPath: try folder(probe).path) else { throw VaultFailure.missingKey }
      record = Record(version: 1, base: base, owner: owner, key: SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }, issued: issued, revoked: false)
    }
    try persist(record)
    try write("active:" + base, Data(owner.utf8))
    try write("denied:" + base, Data("false".utf8))
    revokedOrigins.remove(base)
    persistedRevocations.remove(base)
    opened = record; offline = false
  }
  func unlock(_ base: String) async throws -> String {
    _ = try await authenticate()
    guard !revokedOrigins.contains(base), try read("denied:" + base) == Data("false".utf8) else { throw VaultFailure.locked }
    guard let ownerData = try read("active:" + base), let owner = String(data: ownerData, encoding: .utf8),
      let data = try read(identifier(base, owner)) else { throw VaultFailure.missingKey }
    let record = try JSONDecoder().decode(Record.self, from: data)
    guard record.version == 1, record.base == base, record.owner == owner, record.key.count == 32,
      OfflinePolicy.permits(record.issued, try clock(), revoked: record.revoked, version: record.version) else { throw VaultFailure.expired }
    opened = record; offline = true
    let json = try load("snapshot")
    guard let data = json.data(using: .utf8), var snapshot = try JSONSerialization.jsonObject(with: data) as? [String: Any],
      let account = snapshot["owner"] as? [String: Any], account["id"] as? String == owner else { throw VaultFailure.invalid }
    snapshot["verifiedAt"] = record.issued.wall * 1000
    snapshot["remainingMs"] = (OfflinePolicy.lifetime - ((try clock()).uptime - record.issued.uptime)) * 1000
    return String(decoding: try JSONSerialization.data(withJSONObject: snapshot), as: UTF8.self)
  }
  private func access() throws -> Record {
    guard let record = opened, context != nil,
      OfflinePolicy.permits(record.issued, try clock(), revoked: record.revoked, version: record.version) else { throw VaultFailure.locked }
    return record
  }
  func validateOffline() throws { guard offline else { throw VaultFailure.locked }; _ = try access() }
  private func aad(_ record: Record, _ name: String) -> Data { Data(("v1\n" + record.base + "\n" + record.owner + "\n" + name).utf8) }
  private func file(_ record: Record, _ name: String) throws -> URL {
    guard name == "snapshot" || (name.hasPrefix("draft-") && UUID(uuidString: String(name.dropFirst(6))) != nil) else { throw VaultFailure.invalid }
    return try folder(record).appendingPathComponent(name + ".sealed")
  }
  func save(_ name: String, json: String, base: String, owner: String, expectedEpoch: Int, sequence: Int = 0) throws {
    let record = try access()
    guard epoch == expectedEpoch, record.base == base, record.owner == owner else { throw VaultFailure.locked }
    guard !offline, let data = json.data(using: .utf8), data.count <= 8_388_608 else { throw VaultFailure.invalid }
    if name.hasPrefix("draft-") && data.count > 1_048_576 { throw VaultFailure.invalid }
    if name == "snapshot" && sequence <= snapshotSequence { throw VaultFailure.invalid }
    let target = try file(record, name)
    // Preserve corrupt or future-format originals rather than replacing them.
    if FileManager.default.fileExists(atPath: target.path) {
      let previous = try load(name)
      guard let bytes = previous.data(using: .utf8), let value = try JSONSerialization.jsonObject(with: bytes) as? [String: Any], value["version"] as? Int == 1 else { throw VaultFailure.invalid }
    }
    let folder = try self.folder(record)
    if name.hasPrefix("draft-"), !FileManager.default.fileExists(atPath: target.path), FileManager.default.fileExists(atPath: folder.path) {
      let count = try FileManager.default.contentsOfDirectory(atPath: folder.path).filter { $0.hasPrefix("draft-") }.count
      guard count < 100 else { throw VaultFailure.unavailable }
    }
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
    var protected = folder; var values = URLResourceValues(); values.isExcludedFromBackup = true; try protected.setResourceValues(values)
    let combined = try OfflineCipher.seal(data, key: record.key, aad: aad(record, name))
    try combined.write(to: target, options: [.atomic, .completeFileProtection])
    if name == "snapshot" { snapshotSequence = sequence }
  }
  private func load(_ name: String) throws -> String {
    let record = try access(); let url = try file(record, name)
    guard let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize, size <= 8_388_636 else { throw VaultFailure.invalid }
    let data = try OfflineCipher.open(Data(contentsOf: url), key: record.key, aad: aad(record, name))
    guard let json = String(data: data, encoding: .utf8) else { throw VaultFailure.invalid }
    return json
  }
  func drafts(base: String, owner: String) throws -> [String] {
    let record = try access(); guard !offline, record.base == base, record.owner == owner else { throw VaultFailure.locked }
    let folder = try self.folder(record)
    if !FileManager.default.fileExists(atPath: folder.path) { return [] }
    return try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
      .filter { $0.lastPathComponent.hasPrefix("draft-") && $0.pathExtension == "sealed" }
      .map { try load($0.deletingPathExtension().lastPathComponent) }
  }
  func removeDraft(_ id: String, base: String, owner: String) throws {
    let record = try access(); guard !offline, record.base == base, record.owner == owner else { throw VaultFailure.locked }
    let url = try file(record, "draft-" + id)
    if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
  }
  func revoke(_ base: String) throws {
    revokedOrigins.insert(base)
    defer { lock() }
    if persistedRevocations.contains(base) { return }
    // Separate tombstone also revokes corrupt records, without destroying keys.
    try write("denied:" + base, Data("true".utf8))
    persistedRevocations.insert(base)
  }
}
