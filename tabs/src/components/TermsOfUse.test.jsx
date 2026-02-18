import React from 'react';
import { render, screen } from '@testing-library/react';
import TermsOfUse from './TermsOfUse';

describe('TermsOfUse Component', () => {
  test('should render terms of use heading', () => {
    render(<TermsOfUse />);

    expect(screen.getByText('Terms of Use')).toBeInTheDocument();
  });

  test('should render h1 element', () => {
    render(<TermsOfUse />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Terms of Use');
  });

  test('should render main container div', () => {
    const { container } = render(<TermsOfUse />);

    const mainDiv = container.firstChild;
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv.tagName).toBe('DIV');
  });

  test('should have correct structure', () => {
    const { container } = render(<TermsOfUse />);

    // Should have a div container
    expect(container.firstChild.tagName).toBe('DIV');

    // Should have an h1 inside the div
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Terms of Use');
  });

  test('should be a class component', () => {
    expect(TermsOfUse.prototype.isReactComponent).toBeDefined();
  });

  test('should render without props', () => {
    expect(() => {
      render(<TermsOfUse />);
    }).not.toThrow();

    expect(screen.getByText('Terms of Use')).toBeInTheDocument();
  });

  test('should handle additional props gracefully', () => {
    const additionalProps = {
      customProp: 'test',
      anotherProp: 123,
    };

    expect(() => {
      render(<TermsOfUse {...additionalProps} />);
    }).not.toThrow();

    expect(screen.getByText('Terms of Use')).toBeInTheDocument();
  });

  test('should maintain consistent rendering', () => {
    const { container: container1 } = render(<TermsOfUse />);
    const { container: container2 } = render(<TermsOfUse />);

    expect(container1.innerHTML).toBe(container2.innerHTML);
  });

  test('should handle component unmounting', () => {
    const { unmount } = render(<TermsOfUse />);

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  test('should render terms of use text exactly', () => {
    render(<TermsOfUse />);

    const heading = screen.getByText('Terms of Use');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Terms of Use');
  });

  test('should have no additional content', () => {
    const { container } = render(<TermsOfUse />);

    // Should only have the div and h1
    expect(container.children).toHaveLength(1);
    expect(container.firstChild.children).toHaveLength(1);
    expect(container.firstChild.firstChild.tagName).toBe('H1');
  });

  test('should be accessible', () => {
    render(<TermsOfUse />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Terms of Use');
  });

  test('should handle multiple renders', () => {
    const { rerender } = render(<TermsOfUse />);

    expect(screen.getByText('Terms of Use')).toBeInTheDocument();

    // Re-render the component
    rerender(<TermsOfUse />);

    expect(screen.getByText('Terms of Use')).toBeInTheDocument();
  });

  test('should be different from Privacy component', () => {
    const { container: privacyContainer } = render(
      <div>
        <h1>Privacy Statement</h1>
      </div>,
    );
    const { container: termsContainer } = render(<TermsOfUse />);

    expect(termsContainer.textContent).not.toBe(privacyContainer.textContent);
    expect(termsContainer.textContent).toBe('Terms of Use');
  });
});
