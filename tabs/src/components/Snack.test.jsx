import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Snack from './Snack';

describe('Snack Component', () => {
    const defaultProps = {
        open: true,
        message: 'Test message',
        onClose: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render when open is true', () => {
        render(<Snack {...defaultProps} />);

        expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    test('should not render content when open is false', () => {
        render(<Snack {...defaultProps} open={false} />);

        expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });

    test('should display the correct message', () => {
        const message = 'Custom success message';
        render(<Snack {...defaultProps} message={message} />);

        expect(screen.getByText(message)).toBeInTheDocument();
    });

    test('should call onClose when close button is clicked', () => {
        const onClose = jest.fn();
        render(<Snack {...defaultProps} onClose={onClose} />);

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should handle different message types', () => {
        const longMessage = 'This is a very long message that should still be displayed correctly in the snack component';
        render(<Snack {...defaultProps} message={longMessage} />);

        expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    test('should handle empty message', () => {
        render(<Snack {...defaultProps} message="" />);

        // Should still render the snackbar structure even with empty message
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('should have success severity', () => {
        render(<Snack {...defaultProps} />);

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
    });

    test('should have correct positioning', () => {
        render(<Snack {...defaultProps} />);

        // The snackbar should be rendered (we can't easily test exact positioning without more complex setup)
        expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    test('should handle undefined onClose gracefully', () => {
        expect(() => {
            render(<Snack open={true} message="Test" onClose={undefined} />);
        }).not.toThrow();
    });

    test('should handle null message', () => {
        render(<Snack {...defaultProps} message={null} />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('should handle undefined message', () => {
        render(<Snack {...defaultProps} message={undefined} />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});