import Foundation
import CryptoKit

@main struct OfflineNativeTests {
  static func main() throws {
    var checks = 0
    func check(_ value: Bool, _ name: String) { precondition(value, name); checks += 1 }
    func rejects(_ name: String, _ task: () throws -> Void) { do { try task(); preconditionFailure(name) } catch { checks += 1 } }
    let issued = OfflineClock(wall: 1000, uptime: 100, boot: "boot-a")
    func permits(_ wall: Double, _ uptime: Double, _ boot: String = "boot-a") -> Bool { OfflinePolicy.permits(issued, OfflineClock(wall: wall, uptime: uptime, boot: boot)) }
    check(permits(1000, 100), "initial grant")
    check(permits(1000 + OfflinePolicy.lifetime - 1, 100 + OfflinePolicy.lifetime - 1), "before seven days")
    check(!permits(1000 + OfflinePolicy.lifetime, 100 + OfflinePolicy.lifetime), "exact expiration")
    check(!permits(1001, 101, "boot-b"), "reboot")
    check(!permits(1001, 99), "monotonic rollback")
    check(!permits(900, 101), "wall rollback")
    check(!permits(2000, 101), "wall leap")
    check(!permits(.infinity, 101), "invalid time")
    check(!OfflinePolicy.permits(issued, issued, revoked: true), "logout/rejection revokes access")
    check(!OfflinePolicy.permits(issued, issued, version: 2), "future format locked")
    check(!OfflinePolicy.allowsNetwork(false, expectedOwner: nil, actualOwner: "a"), "offline forbids every request")
    check(!OfflinePolicy.allowsNetwork(true, expectedOwner: "a", actualOwner: "b"), "late account switch rejects publication")
    check(!OfflinePolicy.allowsNetwork(true, expectedOwner: "a", actualOwner: nil), "logout revokes publishing owner before HTTP logout")
    check(OfflinePolicy.allowsNetwork(true, expectedOwner: "a", actualOwner: "a"), "matching online owner")
    // Relaunch in the same boot uses persisted issuance, not an extended grant.
    let persisted = try JSONDecoder().decode(OfflineClock.self, from: JSONEncoder().encode(issued))
    check(OfflinePolicy.permits(persisted, OfflineClock(wall: 1100, uptime: 200, boot: "boot-a")), "policy roundtrip")
    let key = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
    let secret = Data("synthetic note and checklist draft".utf8)
    let aad = Data("v1\nhttps://example.test\naccount-a\ndraft-a".utf8)
    let sealed = try OfflineCipher.seal(secret, key: key, aad: aad)
    check(try OfflineCipher.open(sealed, key: key, aad: aad) == secret, "authenticated roundtrip")
    check(sealed.range(of: secret) == nil, "plaintext absent")
    check(try OfflineCipher.seal(secret, key: key, aad: aad) != sealed, "unique nonce")
    rejects("different account") { _ = try OfflineCipher.open(sealed, key: key, aad: Data("v1\nhttps://example.test\naccount-b\ndraft-a".utf8)) }
    rejects("different backend") { _ = try OfflineCipher.open(sealed, key: key, aad: Data("v1\nhttps://other.test\naccount-a\ndraft-a".utf8)) }
    rejects("different record") { _ = try OfflineCipher.open(sealed, key: key, aad: Data("v1\nhttps://example.test\naccount-a\nsnapshot".utf8)) }
    rejects("missing key") { _ = try OfflineCipher.open(sealed, key: Data(), aad: aad) }
    rejects("wrong key") { _ = try OfflineCipher.open(sealed, key: Data(repeating: 1, count: 32), aad: aad) }
    var corrupt = sealed; corrupt[corrupt.count - 1] ^= 1
    rejects("corrupt ciphertext") { _ = try OfflineCipher.open(corrupt, key: key, aad: aad) }
    rejects("truncated ciphertext") { _ = try OfflineCipher.open(Data(sealed.prefix(8)), key: key, aad: aad) }
    print("PASS: \(checks) native CryptoKit/policy checks; no Keychain, app, database or device data accessed.")
  }
}
