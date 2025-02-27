export interface TransactionOptions {
  forceSerial?: boolean;
  // ... other transaction options ...
}

export class TransactionManager {
  // Global lock using promise-based async queue
  private static _globalLock: Promise<void> = Promise.resolve();

  private static async acquireGlobalLock(): Promise<() => void> {
    let releaseLock: () => void;
    const nextLock = new Promise<void>((resolve) => { releaseLock = resolve; });
    const previousLock = TransactionManager._globalLock;
    TransactionManager._globalLock = previousLock.then(() => nextLock);
    await previousLock;
    return releaseLock!;
  }

  public static async withTransaction<T>(options: TransactionOptions, transactionFunction: (client: any) => Promise<T>): Promise<T> {
    // ... existing setup code ...
    let client: any; // TODO: Initialize the database client appropriately
    let result: T;

    if (options.forceSerial) {
      const release = await TransactionManager.acquireGlobalLock();
      try {
        result = await transactionFunction(client);
      } finally {
        release();
      }
    } else {
      result = await transactionFunction(client);
    }

    // ... existing retry and error handling code ...
    return result;
  }
} 