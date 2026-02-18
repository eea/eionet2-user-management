import React from 'react';
import { render, screen } from '@testing-library/react';
import ResizableGrid from './ResizableGrid';

// Mock Material-UI Data Grid
jest.mock('@mui/x-data-grid', () => ({
    DataGrid: ({ columns, components, ...props }) => {
        const mockReact = require('react');
        return mockReact.createElement('div', {
            'data-testid': 'data-grid',
            'data-columns': JSON.stringify(columns),
            'data-components': JSON.stringify(components),
            'data-props': JSON.stringify(props)
        }, 'DataGrid');
    }
}));

// Mock CustomColumnResizeIcon
jest.mock('./CustomColumnResizeIcon', () => {
    return function MockCustomColumnResizeIcon({ onWidthChanged }) {
        const mockReact = require('react');
        return mockReact.createElement('div', {
            'data-testid': 'custom-column-resize-icon',
            onClick: () => onWidthChanged && onWidthChanged(200, 0)
        }, 'CustomColumnResizeIcon');
    };
});

describe('ResizableGrid Component', () => {
    const defaultProps = {
        columns: [
            { field: 'id', headerName: 'ID', width: 100 },
            { field: 'name', headerName: 'Name', width: 200 },
            { field: 'email', headerName: 'Email', width: 300 }
        ],
        rows: [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render DataGrid with columns', () => {
        render(<ResizableGrid {...defaultProps} />);

        expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('should pass columns to DataGrid', () => {
        render(<ResizableGrid {...defaultProps} />);

        const dataGrid = screen.getByTestId('data-grid');
        expect(dataGrid).toHaveAttribute('data-columns');

        const columnsData = JSON.parse(dataGrid.getAttribute('data-columns'));
        expect(columnsData).toHaveLength(3);
        expect(columnsData[0]).toMatchObject({ field: 'id', headerName: 'ID', width: 100 });
    });

    test('should pass other props to DataGrid', () => {
        const additionalProps = {
            ...defaultProps,
            pageSize: 10,
            checkboxSelection: true
        };

        render(<ResizableGrid {...additionalProps} />);

        const dataGrid = screen.getByTestId('data-grid');
        expect(dataGrid).toHaveAttribute('data-props');

        const propsData = JSON.parse(dataGrid.getAttribute('data-props'));
        expect(propsData).toHaveProperty('pageSize', 10);
        expect(propsData).toHaveProperty('checkboxSelection', true);
    });

    test('should handle empty columns array', () => {
        const propsWithEmptyColumns = {
            ...defaultProps,
            columns: []
        };

        expect(() => {
            render(<ResizableGrid {...propsWithEmptyColumns} />);
        }).not.toThrow();

        expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('should handle undefined columns', () => {
        const propsWithoutColumns = {
            rows: defaultProps.rows
        };

        expect(() => {
            render(<ResizableGrid {...propsWithoutColumns} />);
        }).not.toThrow();

        expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('should be a function component', () => {
        expect(typeof ResizableGrid).toBe('function');
    });

    test('should handle columns prop changes', () => {
        const { rerender } = render(<ResizableGrid {...defaultProps} />);

        const newColumns = [
            { field: 'id', headerName: 'ID', width: 150 },
            { field: 'title', headerName: 'Title', width: 250 }
        ];

        rerender(<ResizableGrid {...defaultProps} columns={newColumns} />);

        const dataGrid = screen.getByTestId('data-grid');
        const columnsData = JSON.parse(dataGrid.getAttribute('data-columns'));
        expect(columnsData).toHaveLength(2);
        expect(columnsData[0]).toMatchObject({ field: 'id', headerName: 'ID', width: 150 });
    });

    test('should handle component unmounting', () => {
        const { unmount } = render(<ResizableGrid {...defaultProps} />);

        expect(() => {
            unmount();
        }).not.toThrow();
    });

    test('should maintain column structure', () => {
        render(<ResizableGrid {...defaultProps} />);

        const dataGrid = screen.getByTestId('data-grid');
        const columnsData = JSON.parse(dataGrid.getAttribute('data-columns'));

        expect(columnsData[0]).toHaveProperty('field', 'id');
        expect(columnsData[0]).toHaveProperty('headerName', 'ID');
        expect(columnsData[0]).toHaveProperty('width', 100);

        expect(columnsData[1]).toHaveProperty('field', 'name');
        expect(columnsData[1]).toHaveProperty('headerName', 'Name');
        expect(columnsData[1]).toHaveProperty('width', 200);
    });

    test('should handle additional props correctly', () => {
        const additionalProps = {
            ...defaultProps,
            autoHeight: true,
            disableSelectionOnClick: true,
            hideFooter: false
        };

        render(<ResizableGrid {...additionalProps} />);

        const dataGrid = screen.getByTestId('data-grid');
        expect(dataGrid).toHaveAttribute('data-props');

        const propsData = JSON.parse(dataGrid.getAttribute('data-props'));
        expect(propsData).toHaveProperty('autoHeight', true);
        expect(propsData).toHaveProperty('disableSelectionOnClick', true);
        expect(propsData).toHaveProperty('hideFooter', false);
    });

    test('should render without errors', () => {
        expect(() => {
            render(<ResizableGrid {...defaultProps} />);
        }).not.toThrow();

        expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('should handle no props', () => {
        expect(() => {
            render(<ResizableGrid />);
        }).not.toThrow();

        expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });

    test('should handle columns with different structures', () => {
        const complexColumns = [
            { field: 'id', headerName: 'ID', width: 100, sortable: true },
            { field: 'name', headerName: 'Name', width: 200, filterable: true },
            { field: 'email', headerName: 'Email', width: 300, resizable: false }
        ];

        render(<ResizableGrid {...defaultProps} columns={complexColumns} />);

        const dataGrid = screen.getByTestId('data-grid');
        const columnsData = JSON.parse(dataGrid.getAttribute('data-columns'));

        expect(columnsData).toHaveLength(3);
        expect(columnsData[0]).toHaveProperty('sortable', true);
        expect(columnsData[1]).toHaveProperty('filterable', true);
        expect(columnsData[2]).toHaveProperty('resizable', false);
    });
});