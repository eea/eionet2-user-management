import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SwitchChip from './SwitchChip';

describe('SwitchChip Component', () => {
    const defaultProps = {
        switchChecked: false,
        onSwitchChange: jest.fn(),
        chipValue: 'Test Chip'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render chip and switch', () => {
        render(<SwitchChip {...defaultProps} />);

        expect(screen.getByText('Test Chip')).toBeInTheDocument();
        expect(screen.getByText('Lead')).toBeInTheDocument();
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    test('should display chip with correct value', () => {
        render(<SwitchChip {...defaultProps} chipValue="Custom Chip" />);

        expect(screen.getByText('Custom Chip')).toBeInTheDocument();
    });

    test('should have switch in unchecked state initially', () => {
        render(<SwitchChip {...defaultProps} switchChecked={false} />);

        const checkbox = screen.getByRole('switch');
        expect(checkbox).not.toBeChecked();
    });

    test('should have switch in checked state when switchChecked is true', () => {
        render(<SwitchChip {...defaultProps} switchChecked={true} />);

        const checkbox = screen.getByRole('switch');
        expect(checkbox).toBeChecked();
    });

    test('should call onSwitchChange when switch is toggled', () => {
        const onSwitchChange = jest.fn();

        render(<SwitchChip {...defaultProps} onSwitchChange={onSwitchChange} />);

        const checkbox = screen.getByRole('switch');
        fireEvent.click(checkbox);

        expect(onSwitchChange).toHaveBeenCalledWith(true, 'Test Chip');
    });

    test('should call onSwitchChange with correct parameters', () => {
        const onSwitchChange = jest.fn();
        const chipValue = 'Custom Chip';

        render(<SwitchChip {...defaultProps} chipValue={chipValue} onSwitchChange={onSwitchChange} />);

        const checkbox = screen.getByRole('switch');
        fireEvent.click(checkbox);

        expect(onSwitchChange).toHaveBeenCalledWith(true, chipValue);
    });

    test('should handle empty chip value', () => {
        render(<SwitchChip {...defaultProps} chipValue="" />);

        expect(screen.getByRole('switch')).toBeInTheDocument();
        expect(screen.getByText('Lead')).toBeInTheDocument();
    });

    test('should handle number chip value', () => {
        render(<SwitchChip {...defaultProps} chipValue={123} />);

        expect(screen.getByText('123')).toBeInTheDocument();
    });

    test('should handle long chip values', () => {
        const longChipValue = 'Very Long Chip Name That Should Still Work Correctly';
        render(<SwitchChip {...defaultProps} chipValue={longChipValue} />);

        expect(screen.getByText(longChipValue)).toBeInTheDocument();
    });

    test('should have correct switch properties', () => {
        render(<SwitchChip {...defaultProps} />);

        const checkbox = screen.getByRole('switch');
        expect(checkbox).toHaveAttribute('name', 'pcp');
    });

    test('should handle multiple toggle clicks', () => {
        const onSwitchChange = jest.fn();

        render(<SwitchChip {...defaultProps} onSwitchChange={onSwitchChange} />);

        const checkbox = screen.getByRole('switch');

        // First click - should call with true
        fireEvent.click(checkbox);
        expect(onSwitchChange).toHaveBeenLastCalledWith(true, 'Test Chip');

        // Second click - should call with false
        fireEvent.click(checkbox);
        expect(onSwitchChange).toHaveBeenLastCalledWith(false, 'Test Chip');

        expect(onSwitchChange).toHaveBeenCalledTimes(2);
    });

    test('should handle undefined onSwitchChange gracefully', () => {
        expect(() => {
            render(<SwitchChip {...defaultProps} onSwitchChange={undefined} />);
        }).not.toThrow();

        const checkbox = screen.getByRole('switch');
        expect(checkbox).toBeInTheDocument();
    });

    test('should render with additional props', () => {
        const additionalProps = {
            ...defaultProps,
            color: 'primary',
            variant: 'outlined'
        };

        expect(() => {
            render(<SwitchChip {...additionalProps} />);
        }).not.toThrow();

        expect(screen.getByText('Test Chip')).toBeInTheDocument();
    });

    test('should maintain state correctly', () => {
        const onSwitchChange = jest.fn();

        render(<SwitchChip {...defaultProps} switchChecked={false} onSwitchChange={onSwitchChange} />);

        const checkbox = screen.getByRole('switch');

        // Initially unchecked
        expect(checkbox).not.toBeChecked();

        // Click to check
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
        expect(onSwitchChange).toHaveBeenCalledWith(true, 'Test Chip');

        // Click again to uncheck
        fireEvent.click(checkbox);
        expect(checkbox).not.toBeChecked();
        expect(onSwitchChange).toHaveBeenCalledWith(false, 'Test Chip');
    });
});
