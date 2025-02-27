import { IDatabase } from 'pg-promise';

/**
 * Interface defining the contract that all service containers must implement.
 * This ensures consistent behavior across different implementations.
 */
export interface IServiceContainer {
  /**
   * Initialize the container with a database pool.
   */
  initialize(): Promise<void>;

  /**
   * Register a service.
   */
  register<T>(name: string, service: T): void;

  /**
   * Register a factory function for creating a service.
   */
  registerFactory<T>(name: string, factory: (container: IServiceContainer) => T): void;

  /**
   * Get a service by name. Creates the service if it doesn't exist.
   */
  get<T>(name: string): T;

  /**
   * Get a service by name. Creates the service if it doesn't exist.
   */
  getService<T>(name: string): T;

  /**
   * Get the database pool instance.
   */
  getPool(): IDatabase<any>;

  /**
   * Check if a service exists.
   */
  hasService(name: string): boolean;

  /**
   * Clear all services and factories.
   */
  clear(): void;

  /**
   * Destroy the container.
   */
  destroy(): Promise<void>;

  /**
   * Check if the container is initialized.
   */
  isInitialized(): boolean;

  /**
   * Check if a service is a core service.
   */
  isCoreService(name: string): boolean;

  /**
   * Shutdown the container.
   */
  shutdown(): Promise<void>;

  /**
   * Set the test suite ID.
   */
  setTestSuiteId(suiteId: string): void;
} 