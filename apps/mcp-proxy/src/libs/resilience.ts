/**
 * 高可用性機能 - Circuit Breaker, Retry, Fallback
 *
 * Cockatielライブラリを使用して、MCPサーバーへの接続の信頼性を向上させます。
 */

import {
  circuitBreaker,
  retry,
  ExponentialBackoff,
  handleAll,
  wrap,
  BrokenCircuitError,
  ConsecutiveBreaker,
  type IPolicy,
} from "cockatiel";

export type CircuitBreakerConfig = {
  threshold: number;
  halfOpenAfter: number;
};

export type RetryConfig = {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
};

export type ResilienceConfig = {
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
};

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  circuitBreaker: {
    threshold: 5,
    halfOpenAfter: 30000,
  },
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
};

export const createResiliencePolicy = (
  name: string,
  config: ResilienceConfig = DEFAULT_RESILIENCE_CONFIG,
) => {
  const breaker = circuitBreaker(handleAll, {
    halfOpenAfter: config.circuitBreaker.halfOpenAfter,
    breaker: new ConsecutiveBreaker(config.circuitBreaker.threshold),
  });

  const retryPolicy = retry(handleAll, {
    maxAttempts: config.retry.maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay: config.retry.initialDelay,
      maxDelay: config.retry.maxDelay,
      exponent: config.retry.backoffFactor,
    }),
  });

  return wrap(retryPolicy, breaker);
};

export const executeWithFallback = async <T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  operationName: string,
): Promise<T> => {
  try {
    return await primary();
  } catch (error) {
    if (error instanceof BrokenCircuitError) {
      console.warn(`Circuit is open for ${operationName}, executing fallback`);
    }
    return await fallback();
  }
};

export const executeWithResilience = async <T>(
  policy: IPolicy,
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> => {
  try {
    return await policy.execute(operation);
  } catch (error) {
    if (error instanceof BrokenCircuitError) {
      throw new Error(`Service temporarily unavailable for ${operationName}`);
    }
    throw error;
  }
};
