Pod::Spec.new do |s|
  s.name = 'BubbleSession'
  s.version = '0.1.0'
  s.summary = 'Origin-scoped Bubble HTTPS sessions'
  s.description = 'Keeps HttpOnly session material in the iOS Keychain, outside JavaScript and SQLite.'
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Bubble'
  s.homepage = 'https://github.com/hindkhial/bubble'
  s.source = { :git => 'https://github.com/hindkhial/bubble' }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
