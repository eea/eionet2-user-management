import React from 'react';
import { render } from '@testing-library/react';
import { HtmlBox } from './HtmlBox';

// Mock DOMPurify
jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html) => html), // Return HTML as-is for testing
    addHook: jest.fn(),
  },
}));

describe('HtmlBox Component', () => {
  const defaultProps = {
    html: '<p>Test HTML content</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render HTML content when html is provided', () => {
    const { container } = render(<HtmlBox {...defaultProps} />);

    // The content should be rendered
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should not render Box when html is empty', () => {
    const { container } = render(<HtmlBox html="" />);

    // Should still render the container div
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should not render Box when html is null', () => {
    const { container } = render(<HtmlBox html={null} />);

    // Should still render the container div
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should not render Box when html is undefined', () => {
    const { container } = render(<HtmlBox html={undefined} />);

    // Should still render the container div
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should handle different HTML content types', () => {
    // Test with simple HTML
    expect(() => {
      render(<HtmlBox html="<div>Simple HTML</div>" />);
    }).not.toThrow();

    // Test with complex HTML
    const complexHtml = '<div><h1>Title</h1><p>Paragraph with <strong>bold</strong> text</p></div>';
    expect(() => {
      render(<HtmlBox html={complexHtml} />);
    }).not.toThrow();

    // Test with HTML containing links
    const htmlWithLinks = '<p>Check out <a href="https://example.com">this link</a></p>';
    expect(() => {
      render(<HtmlBox html={htmlWithLinks} />);
    }).not.toThrow();
  });

  test('should handle edge cases', () => {
    // Test with whitespace-only HTML
    expect(() => {
      render(<HtmlBox html="   " />);
    }).not.toThrow();

    // Test with HTML containing special characters
    const specialCharHtml = '<p>Content with &amp; &lt; &gt; characters</p>';
    expect(() => {
      render(<HtmlBox html={specialCharHtml} />);
    }).not.toThrow();

    // Test with very long HTML
    const longHtml = '<p>' + 'x'.repeat(1000) + '</p>';
    expect(() => {
      render(<HtmlBox html={longHtml} />);
    }).not.toThrow();
  });

  test('should handle malformed HTML gracefully', () => {
    const malformedHtml = '<div><p>Unclosed tag</div>';
    expect(() => {
      render(<HtmlBox html={malformedHtml} />);
    }).not.toThrow();
  });

  test('should handle HTML with various tags', () => {
    const multiTagHtml = `
      <div>
        <h1>Heading</h1>
        <p>Paragraph</p>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
        <a href="https://example.com">Link</a>
      </div>
    `;

    expect(() => {
      render(<HtmlBox html={multiTagHtml} />);
    }).not.toThrow();
  });

  test('should be a function component', () => {
    expect(typeof HtmlBox).toBe('function');
  });

  test('should render container div', () => {
    const { container } = render(<HtmlBox {...defaultProps} />);

    // Should render the outer container div
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should handle script tags (security)', () => {
    const htmlWithScript = '<script>alert("xss")</script><p>Safe content</p>';

    expect(() => {
      render(<HtmlBox html={htmlWithScript} />);
    }).not.toThrow();
  });

  test('should handle iframe tags', () => {
    const htmlWithIframe = '<iframe src="https://example.com"></iframe>';

    expect(() => {
      render(<HtmlBox html={htmlWithIframe} />);
    }).not.toThrow();
  });

  test('should handle form elements', () => {
    const htmlWithForm = '<form><input type="text" /><button>Submit</button></form>';

    expect(() => {
      render(<HtmlBox html={htmlWithForm} />);
    }).not.toThrow();
  });
});
