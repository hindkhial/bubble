import Foundation
import CryptoKit
enum OfflineCipherFailure: Error { case invalidKey }

enum OfflineCipher {
  static func seal(_ data: Data, key: Data, aad: Data) throws -> Data {
    guard key.count == 32 else { throw OfflineCipherFailure.invalidKey }
    let box = try AES.GCM.seal(data, using: SymmetricKey(data: key), authenticating: aad)
    guard let combined = box.combined else { throw OfflineCipherFailure.invalidKey }
    return combined
  }
  static func open(_ data: Data, key: Data, aad: Data) throws -> Data {
    guard key.count == 32 else { throw OfflineCipherFailure.invalidKey }
    return try AES.GCM.open(AES.GCM.SealedBox(combined: data), using: SymmetricKey(data: key), authenticating: aad)
  }
}
