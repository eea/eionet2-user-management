import React from 'react';
import { render, screen } from '@testing-library/react';
import Privacy from './Privacy';

describe('Privacy Component', () => {
  test('should render privacy statement heading', () => {
    render(<Privacy />);

    expect(screen.getByText('Privacy Statement')).toBeInTheDocument();
  });

  test('should render h1 element', () => {
    render(<Privacy />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Privacy Statement');
  });

  test('should render main container div', () => {
    const { container } = render(<Privacy />);

    const mainDiv = container.firstChild;
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv.tagName).toBe('DIV');
  });

  test('should have correct structure', () => {
    const { container } = render(<Privacy />);

    // Should have a div container
    expect(container.firstChild.tagName).toBe('DIV');

    // Should have an h1 inside the div
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Privacy Statement');
  });

  test('should be a class component', () => {
    expect(Privacy.prototype.isReactComponent).toBeDefined();
  });

  test('should render without props', () => {
    expect(() => {
      render(<Privacy />);
    }).not.toThrow();

    expect(screen.getByText('Privacy Statement')).toBeInTheDocument();
  });

  test('should handle additional props gracefully', () => {
    const additionalProps = {
      customProp: 'test',
      anotherProp: 123,
    };

    expect(() => {
      render(<Privacy {...additionalProps} />);
    }).not.toThrow();

    expect(screen.getByText('Privacy Statement')).toBeInTheDocument();
  });

  test('should maintain consistent rendering', () => {
    const { container: container1 } = render(<Privacy />);
    const { container: container2 } = render(<Privacy />);

    expect(container1.innerHTML).toBe(container2.innerHTML);
  });

  test('should handle component unmounting', () => {
    const { unmount } = render(<Privacy />);

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  test('should render privacy statement text exactly', () => {
    render(<Privacy />);

    const heading = screen.getByText('Privacy Statement');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Privacy Statement');
  });

  test('should have no additional content', () => {
    const { container } = render(<Privacy />);

    // Should only have the div and h1
    expect(container.children).toHaveLength(1);
    expect(container.firstChild.children).toHaveLength(1);
    expect(container.firstChild.firstChild.tagName).toBe('H1');
  });

  test('should be accessible', () => {
    render(<Privacy />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Privacy Statement');
  });

  test('should handle multiple renders', () => {
    const { rerender } = render(<Privacy />);

    expect(screen.getByText('Privacy Statement')).toBeInTheDocument();

    // Re-render the component
    rerender(<Privacy />);

    expect(screen.getByText('Privacy Statement')).toBeInTheDocument();
  });
});
