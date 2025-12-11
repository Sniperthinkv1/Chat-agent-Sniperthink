/**
 * Custom Jest matchers for better test assertions
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidDate(): R;
      toBeValidEmail(): R;
      toBeValidPhoneNumber(): R;
      toHaveBeenCalledWithMatch(expected: any): R;
    }
  }
}

/**
 * Check if value is a valid UUID
 */
export function toBeValidUUID(received: string) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const pass = uuidRegex.test(received);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
  };
}

/**
 * Check if value is a valid date
 */
export function toBeValidDate(received: any) {
  const date = new Date(received);
  const pass = !isNaN(date.getTime());

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid date`
        : `expected ${received} to be a valid date`,
  };
}

/**
 * Check if value is a valid email
 */
export function toBeValidEmail(received: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pass = emailRegex.test(received);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid email`
        : `expected ${received} to be a valid email`,
  };
}

/**
 * Check if value is a valid phone number
 */
export function toBeValidPhoneNumber(received: string) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const pass = phoneRegex.test(received);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid phone number`
        : `expected ${received} to be a valid phone number`,
  };
}

/**
 * Check if mock was called with object matching pattern
 */
export function toHaveBeenCalledWithMatch(
  received: jest.Mock,
  expected: any
) {
  const calls = received.mock.calls;
  const pass = calls.some((call: any[]) => {
    return call.some((arg: any) => {
      if (typeof expected === 'object' && typeof arg === 'object') {
        return Object.keys(expected).every(
          (key) => arg[key] === expected[key]
        );
      }
      return arg === expected;
    });
  });

  return {
    pass,
    message: () =>
      pass
        ? `expected mock not to have been called with matching ${JSON.stringify(expected)}`
        : `expected mock to have been called with matching ${JSON.stringify(expected)}`,
  };
}

/**
 * Register custom matchers
 */
export function registerCustomMatchers() {
  expect.extend({
    toBeValidUUID,
    toBeValidDate,
    toBeValidEmail,
    toBeValidPhoneNumber,
    toHaveBeenCalledWithMatch,
  });
}
