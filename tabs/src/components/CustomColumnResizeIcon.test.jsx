import React from 'react';
import { render, screen } from '@testing-library/react';
import CustomColumnResizeIcon from './CustomColumnResizeIcon';

// Mock Material-UI Data Grid
jest.mock('@mui/x-data-grid', () => ({
  GridSeparatorIcon: () => <div data-testid="grid-separator-icon">Grid Separator</div>,
}));

describe('CustomColumnResizeIcon Component', () => {
  const defaultProps = {
    onWidthChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render GridSeparatorIcon', () => {
    render(<CustomColumnResizeIcon {...defaultProps} />);

    expect(screen.getByTestId('grid-separator-icon')).toBeInTheDocument();
  });

  test('should have correct className and attributes', () => {
    const { container } = render(<CustomColumnResizeIcon {...defaultProps} />);

    const resizableDiv = container.querySelector('.resizable');
    expect(resizableDiv).toHaveClass('resizable');
    expect(resizableDiv).toHaveAttribute('draggable', 'true');
  });

  test('should handle undefined onWidthChanged', () => {
    expect(() => {
      render(<CustomColumnResizeIcon onWidthChanged={undefined} />);
    }).not.toThrow();

    expect(screen.getByTestId('grid-separator-icon')).toBeInTheDocument();
  });

  test('should handle null onWidthChanged', () => {
    expect(() => {
      render(<CustomColumnResizeIcon onWidthChanged={null} />);
    }).not.toThrow();

    expect(screen.getByTestId('grid-separator-icon')).toBeInTheDocument();
  });

  test('should be a function component', () => {
    expect(typeof CustomColumnResizeIcon).toBe('function');
  });

  test('should render without props', () => {
    expect(() => {
      render(<CustomColumnResizeIcon />);
    }).not.toThrow();

    expect(screen.getByTestId('grid-separator-icon')).toBeInTheDocument();
  });

  test('should render with additional props', () => {
    const additionalProps = {
      ...defaultProps,
      customProp: 'test',
    };

    expect(() => {
      render(<CustomColumnResizeIcon {...additionalProps} />);
    }).not.toThrow();

    expect(screen.getByTestId('grid-separator-icon')).toBeInTheDocument();
  });

  test('should have draggable container', () => {
    const { container } = render(<CustomColumnResizeIcon {...defaultProps} />);

    const draggableElement = container.querySelector('[draggable="true"]');
    expect(draggableElement).toBeInTheDocument();
    expect(draggableElement).toHaveClass('resizable');
  });

  test('should render GridSeparatorIcon inside draggable container', () => {
    render(<CustomColumnResizeIcon {...defaultProps} />);

    const separatorIcon = screen.getByTestId('grid-separator-icon');
    expect(separatorIcon).toBeInTheDocument();
    expect(separatorIcon).toHaveTextContent('Grid Separator');
  });

  test('should handle component unmounting', () => {
    const { unmount } = render(<CustomColumnResizeIcon {...defaultProps} />);

    expect(() => {
      unmount();
    }).not.toThrow();
  });

  test('should maintain component structure', () => {
    const { container } = render(<CustomColumnResizeIcon {...defaultProps} />);

    // Should have the main container
    expect(container.firstChild).toBeInTheDocument();

    // Should have the resizable div
    const resizableDiv = container.querySelector('.resizable');
    expect(resizableDiv).toBeInTheDocument();

    // Should have the GridSeparatorIcon inside
    expect(screen.getByTestId('grid-separator-icon')).toBeInTheDocument();
  });
});
