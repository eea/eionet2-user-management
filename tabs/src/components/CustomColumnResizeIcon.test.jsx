import React from 'react';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import CustomColumnResizeIcon from './CustomColumnResizeIcon';

function fireDragWithClientX(target, type, clientX) {
  const factory = createEvent[type];
  const event = factory(target);
  Object.defineProperty(event, 'clientX', { value: clientX, configurable: true });
  fireEvent(target, event);
}

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

  describe('drag-based resize behavior', () => {
    let columnHeader;
    let cell;

    beforeEach(() => {
      jest.useFakeTimers();

      columnHeader = document.createElement('div');
      columnHeader.setAttribute('role', 'columnheader');
      columnHeader.setAttribute('tabindex', '0');
      columnHeader.setAttribute('aria-colindex', '1');
      Object.defineProperty(columnHeader, 'offsetWidth', {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(columnHeader, 'ariaColIndex', {
        configurable: true,
        value: '1',
      });
      document.body.appendChild(columnHeader);

      cell = document.createElement('div');
      cell.setAttribute('role', 'cell');
      cell.setAttribute('aria-colindex', '1');
      document.body.appendChild(cell);
    });

    afterEach(() => {
      jest.useRealTimers();
      columnHeader.remove();
      cell.remove();
    });

    test('should update widths and notify onWidthChanged after drag', async () => {
      const onWidthChanged = jest.fn();
      const { container } = render(<CustomColumnResizeIcon onWidthChanged={onWidthChanged} />);
      const resizable = container.querySelector('.resizable');

      fireDragWithClientX(resizable, 'dragStart', 50);
      fireDragWithClientX(resizable, 'drag', 90);

      expect(columnHeader.style.width).toBe('140px');
      expect(cell.style.width).toBe('140px');
      expect(cell.style.minWidth).toBe('140px');
      expect(cell.style.maxWidth).toBe('140px');

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(onWidthChanged).toHaveBeenCalledWith(140, 0);
    });

    test('should skip width update when computed width is not positive', async () => {
      const onWidthChanged = jest.fn();
      const { container } = render(<CustomColumnResizeIcon onWidthChanged={onWidthChanged} />);
      const resizable = container.querySelector('.resizable');

      fireDragWithClientX(resizable, 'dragStart', 50);
      fireDragWithClientX(resizable, 'drag', -200);

      expect(cell.style.width).toBe('');

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(onWidthChanged).not.toHaveBeenCalled();
    });

    test('should not throw when onWidthChanged is not provided', async () => {
      const { container } = render(<CustomColumnResizeIcon />);
      const resizable = container.querySelector('.resizable');

      fireDragWithClientX(resizable, 'dragStart', 0);
      fireDragWithClientX(resizable, 'drag', 30);

      await expect(
        act(async () => {
          jest.advanceTimersByTime(150);
        }),
      ).resolves.not.toThrow();
    });
  });
});
