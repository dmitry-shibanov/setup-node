export enum Inputs {
  Cache = 'cache',
  Key = 'key',
  RestoreKeys = 'restore-keys',
  NodeVersion = 'node-version',
  Version = 'version',
  Architecture = 'architecture',
  Token = 'token',
  Stable = 'stable',
  CheckLatest = 'check-latest',
  RegistryUrl = 'registry-url',
  AlwaysAuth = 'always-auth',
  Scope = 'scope'
}

export enum LockType {
  Npm = 'npm',
  Yarn = 'yarn'
}

export enum State {
  CachePrimaryKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_RESULT'
}

export enum Outputs {
  CacheHit = 'cache-hit'
}
