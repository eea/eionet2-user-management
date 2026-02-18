import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteDialog from './DeleteDialog';

// Mock messages
jest.mock('../data/messages.json', () => ({
    UserList: {
        UserMemberships: 'User Memberships:'
    }
}));

describe('DeleteDialog Component', () => {
    const defaultProps = {
        open: true,
        title: 'Delete User',
        message: () => 'Are you sure you want to delete this user?',
        groupsString: 'Admin, User',
        onClose: jest.fn(),
        onYes: jest.fn(),
        onNo: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render dialog when open is true', () => {
        render(<DeleteDialog {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    test('should not render dialog when open is false', () => {
        render(<DeleteDialog {...defaultProps} open={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should display correct title', () => {
        render(<DeleteDialog {...defaultProps} title="Confirm Deletion" />);

        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    });

    test('should call onYes when Yes button is clicked', () => {
        const onYes = jest.fn();

        render(<DeleteDialog {...defaultProps} onYes={onYes} />);

        const yesButton = screen.getByRole('button', { name: 'Yes' });
        fireEvent.click(yesButton);

        expect(onYes).toHaveBeenCalledTimes(1);
    });

    test('should call onNo when No button is clicked', () => {
        const onNo = jest.fn();

        render(<DeleteDialog {...defaultProps} onNo={onNo} />);

        const noButton = screen.getByRole('button', { name: 'No' });
        fireEvent.click(noButton);

        expect(onNo).toHaveBeenCalledTimes(1);
    });

    test('should call onClose when dialog close is triggered', () => {
        const onClose = jest.fn();
        render(<DeleteDialog {...defaultProps} onClose={onClose} />);

        const dialog = screen.getByRole('dialog');

        // Simulate dialog close event
        fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should have correct button properties', () => {
        render(<DeleteDialog {...defaultProps} />);

        const yesButton = screen.getByRole('button', { name: 'Yes' });
        const noButton = screen.getByRole('button', { name: 'No' });

        // Check that buttons exist and have the correct text
        expect(yesButton).toBeInTheDocument();
        expect(noButton).toBeInTheDocument();
        expect(yesButton).toHaveTextContent('Yes');
        expect(noButton).toHaveTextContent('No');
    });

    test('should handle multiple message function calls', () => {
        const messageFunc = jest.fn(() => 'Dynamic message');
        render(<DeleteDialog {...defaultProps} message={messageFunc} />);

        // The message function should be called during render
        expect(messageFunc).toHaveBeenCalled();
    });

    test('should be a function component', () => {
        expect(typeof DeleteDialog).toBe('function');
    });

    test('should render without optional props', () => {
        const minimalProps = {
            open: true,
            title: 'Delete',
            message: () => 'Delete?',
            onClose: jest.fn(),
            onYes: jest.fn(),
            onNo: jest.fn()
        };

        expect(() => {
            render(<DeleteDialog {...minimalProps} />);
        }).not.toThrow();

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should handle undefined callbacks gracefully', () => {
        const propsWithoutCallbacks = {
            open: true,
            title: 'Delete',
            message: () => 'Delete?',
            onClose: undefined,
            onYes: undefined,
            onNo: undefined
        };

        expect(() => {
            render(<DeleteDialog {...propsWithoutCallbacks} />);
        }).not.toThrow();

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should have proper dialog structure', () => {
        render(<DeleteDialog {...defaultProps} />);

        // Check dialog elements
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Delete User')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    });

    test('should handle empty groupsString', () => {
        render(<DeleteDialog {...defaultProps} groupsString="" />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should handle null groupsString', () => {
        render(<DeleteDialog {...defaultProps} groupsString={null} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should handle undefined groupsString', () => {
        render(<DeleteDialog {...defaultProps} groupsString={undefined} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should handle whitespace-only groupsString', () => {
        render(<DeleteDialog {...defaultProps} groupsString="   " />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should handle long groupsString', () => {
        const longGroups = 'Administrator, User, Manager, Editor, Reviewer, Guest, Premium User, Basic User';
        render(<DeleteDialog {...defaultProps} groupsString={longGroups} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('should handle component unmounting', () => {
        const { unmount } = render(<DeleteDialog {...defaultProps} />);

        expect(() => {
            unmount();
        }).not.toThrow();
    });
});