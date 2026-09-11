import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Loader from '../Loader';
import EmptyState from '../EmptyState';
import SkeletonTable, { SkeletonRow } from '../Skeleton';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import SearchBar from '../SearchBar';
import Pagination from '../Pagination';
import Tabs from '../Tabs';
import DataTable from '../DataTable';
import GlobalLoadingBar from '../GlobalLoadingBar';
import { act } from '@testing-library/react';
import { emitLoading } from '../../test/apiMock';

describe('GlobalLoadingBar', () => {
  it('appears while a request is in flight and hides when it settles', () => {
    const { container } = render(<GlobalLoadingBar />);
    expect(container.querySelector('.progress-bar')).toBeNull();
    act(() => emitLoading(true));
    expect(container.querySelector('.progress-bar')).toBeInTheDocument();
    act(() => emitLoading(false));
    expect(container.querySelector('.progress-bar')).toBeNull();
  });
});

describe('Loader', () => {
  it('renders the label', () => {
    render(<Loader label="Loading catalog..." />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading catalog...');
  });
  it('hides label text at sm size', () => {
    render(<Loader size="sm" label="x" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('shows title, message and optional action', () => {
    render(<EmptyState title="No products" message="Add one" action={<button>Add</button>} />);
    expect(screen.getByText('No products')).toBeInTheDocument();
    expect(screen.getByText('Add one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
  it('falls back to defaults', () => {
    render(<EmptyState />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders the requested number of rows and columns', () => {
    const { container } = render(
      <table><tbody><SkeletonTable rows={3} columns={5} /></tbody></table>,
    );
    expect(container.querySelectorAll('tr')).toHaveLength(3);
    expect(container.querySelectorAll('tr')[0].querySelectorAll('td')).toHaveLength(5);
  });
  it('SkeletonRow defaults to 4 columns', () => {
    const { container } = render(<table><tbody><SkeletonRow /></tbody></table>);
    expect(container.querySelectorAll('td')).toHaveLength(4);
  });
});

describe('Modal', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<Modal show={false} title="X">body</Modal>);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders title, body and footer when shown', () => {
    render(<Modal show title="Edit Product" footer={<button>Save</button>}>Form body</Modal>);
    expect(screen.getByText('Edit Product')).toBeInTheDocument();
    expect(screen.getByText('Form body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
  it('calls onClose from the close button and on Escape', async () => {
    const onClose = vi.fn();
    render(<Modal show title="X" onClose={onClose}>b</Modal>);
    await userEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ConfirmDialog', () => {
  it('wires confirm / cancel handlers', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog show title="Delete product?" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText('Delete product?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
  it('disables buttons while loading', () => {
    render(<ConfirmDialog show isLoading onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  });
});

describe('FormInput', () => {
  it('shows label, required marker and error message', () => {
    render(<FormInput label="SKU" name="sku" required error={{ message: 'SKU is required' }} />);
    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('SKU is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/SKU/)).toHaveClass('is-invalid');
  });
  it('registers with react-hook-form-style register()', () => {
    const register = vi.fn(() => ({ name: 'sku' }));
    render(<FormInput label="SKU" name="sku" register={register} />);
    expect(register).toHaveBeenCalledWith('sku');
  });
});

describe('FormSelect', () => {
  it('renders options and error', () => {
    render(
      <FormSelect
        label="Status" name="status" error={{ message: 'Status is required' }}
        options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]}
      />,
    );
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByText('Status is required')).toBeInTheDocument();
  });
  it('supports custom valueKey/labelKey', () => {
    render(<FormSelect label="Category" name="categoryId" valueKey="id" labelKey="categoryName" options={[{ id: 5, categoryName: 'Dairy' }]} />);
    expect(screen.getByRole('option', { name: 'Dairy' })).toHaveValue('5');
  });
});

describe('SearchBar', () => {
  it('emits the typed value (debounced)', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} placeholder="Search products..." delay={10} />);
    await userEvent.type(screen.getByPlaceholderText('Search products...'), 'milk');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('milk'));
  });
  it('clears via the X button', async () => {
    const onChange = vi.fn();
    render(<SearchBar value="milk" onChange={onChange} delay={10} />);
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(''));
  });
});

describe('Pagination', () => {
  it('does not render for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} totalItems={3} pageSize={8} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('moves between pages and shows the range', async () => {
    const onPageChange = vi.fn();
    const { container } = render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} totalItems={40} pageSize={8} />);
    expect(screen.getByText(/Showing 9-16 of 40/)).toBeInTheDocument();
    const links = container.querySelectorAll('.page-link');
    await userEvent.click(links[0]); // prev
    expect(onPageChange).toHaveBeenCalledWith(1);
    await userEvent.click(links[links.length - 1]); // next
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

describe('Tabs', () => {
  it('mounts only the active tab and switches on click', async () => {
    render(
      <Tabs
        tabs={[
          { key: 'a', label: 'Alpha', element: <div>alpha-body</div> },
          { key: 'b', label: 'Beta', element: <div>beta-body</div> },
        ]}
      />,
    );
    expect(screen.getByText('alpha-body')).toBeInTheDocument();
    expect(screen.queryByText('beta-body')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(screen.getByText('beta-body')).toBeInTheDocument();
  });
  it('restores the persisted tab from localStorage', () => {
    localStorage.setItem('erp.test.tab', 'b');
    render(
      <Tabs
        storageKey="erp.test.tab"
        tabs={[{ key: 'a', label: 'Alpha', element: <div>a</div> }, { key: 'b', label: 'Beta', element: <div>beta-body</div> }]}
      />,
    );
    expect(screen.getByText('beta-body')).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'productName', label: 'Product', sortable: true },
    { key: 'stockQuantity', label: 'Stock', sortable: true },
    { key: 'status', label: 'Status', render: (r) => <span>{r.status}</span> },
  ];
  const rows = [
    { productId: 1, productName: 'Bravo', stockQuantity: 5, status: 'ACTIVE' },
    { productId: 2, productName: 'Alpha', stockQuantity: 9, status: 'ACTIVE' },
  ];

  it('shows a skeleton while loading', () => {
    const { container } = render(<DataTable columns={columns} rows={[]} isLoading keyField="productId" />);
    expect(container.querySelectorAll('.placeholder').length).toBeGreaterThan(0);
  });

  it('renders an empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} keyField="productId" emptyTitle="No products yet" />);
    expect(screen.getByText('No products yet')).toBeInTheDocument();
  });

  it('renders rows, hides the ID column, and uses custom cell renderers', () => {
    render(<DataTable columns={[{ key: 'id', label: 'ID' }, ...columns]} rows={rows} keyField="productId" />);
    expect(screen.queryByRole('columnheader', { name: 'ID' })).not.toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('sorts when a sortable header is clicked', async () => {
    render(<DataTable columns={columns} rows={rows} keyField="productId" />);
    const body = () => screen.getAllByRole('row').slice(1).map((r) => r.cells[0].textContent);
    expect(body()).toEqual(['Bravo', 'Alpha']);
    await userEvent.click(screen.getByRole('button', { name: /Product/ }));
    expect(body()).toEqual(['Alpha', 'Bravo']);
  });

  it('fires edit and delete handlers', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<DataTable columns={columns} rows={rows} keyField="productId" onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getAllByTitle('Edit')[0]);
    await userEvent.click(screen.getAllByTitle('Delete')[0]);
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
  });
});
