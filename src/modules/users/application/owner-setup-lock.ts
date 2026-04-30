export interface OwnerSetupLock {
  runExclusive<T>(work: () => Promise<T>): Promise<T>;
}
