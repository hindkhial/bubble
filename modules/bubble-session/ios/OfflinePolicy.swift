import Foundation

// Pure policy: monotonic elapsed time bounds access; wall time cannot extend it.
struct OfflineClock: Codable {
  let wall: Double
  let uptime: Double
  let boot: String
}
enum OfflinePolicy {
  static let lifetime: Double = 7 * 24 * 60 * 60
  static func permits(_ issued: OfflineClock, _ now: OfflineClock, revoked: Bool = false, version: Int = 1) -> Bool {
    let elapsed = now.uptime - issued.uptime
    return version == 1 && !revoked && !issued.boot.isEmpty && issued.boot == now.boot && elapsed >= 0 && elapsed < lifetime
      && abs((now.wall - issued.wall) - elapsed) < 60
      && issued.wall.isFinite && issued.uptime.isFinite && now.wall.isFinite && now.uptime.isFinite
  }
  static func allowsNetwork(_ online: Bool, expectedOwner: String?, actualOwner: String?) -> Bool {
    online && (expectedOwner == nil || expectedOwner == actualOwner)
  }
}
