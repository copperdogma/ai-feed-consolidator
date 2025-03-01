import { IServiceContainer } from './service-container.interface';

/**
 * Base interface for services that require a service container.
 * This ensures consistent initialization across all services.
 */
export interface IService {
  /**
   * Initialize the service with a service container.
   */
  initialize(container: IServiceContainer): void;
}

/**
 * Base interface for services that use the singleton pattern.
 */
export interface ISingletonService<T> extends IService {
  /**
   * Get the singleton instance of the service.
   */
  getInstance(container: IServiceContainer): T;
} 