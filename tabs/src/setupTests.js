// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Teams SDK expects fetch to exist in the test runtime.
if (typeof global.fetch === 'undefined') {
  const fetchMock = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    }),
  );

  global.fetch = fetchMock;
  globalThis.fetch = fetchMock;

  if (typeof window !== 'undefined') {
    window.fetch = fetchMock;
  }
}
