import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import * as yup from 'yup';
import { renderPage, userEvent } from '../../test/render';
import { resetApiMock } from '../../test/apiMock';
import CrudPage from '../CrudPage';

const schema = yup.object({
  counterName: yup.string().required('Counter name is required'),
  location: yup.string().required('Location is required'),
});

const makeConfig = (service) => ({
  title: 'Billing Counters',
  entityName: 'Billing Counter',
  service,
  keyField: 'id',
  searchKeys: ['counterName', 'location'],
  defaultValues: { counterName: '', location: '', status: 'ACTIVE' },
  schema,
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'counterName', label: 'Counter Name', sortable: true },
    { key: 'location', label: 'Location' },
  ],
  fields: [
    { name: 'counterName', label: 'Counter Name', required: true },
    { name: 'location', label: 'Location', required: true },
    { name: 'status', label: 'Status', type: 'select', options: [{ value: 'ACTIVE', label: 'Active' }] },
  ],
});

const rows = [
  { id: 1, counterId: 1, counterName: 'Counter 1', location: 'Front', status: 'ACTIVE' },
  { id: 2, counterId: 2, counterName: 'Counter 2', location: 'Back', status: 'ACTIVE' },
];

function mockService(overrides = {}) {
  return {
    getAll: vi.fn().mockResolvedValue(rows),
    getById: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 3, counterId: 3, counterName: 'Counter 3', location: 'Side' }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    remove: vi.fn().mockResolvedValue('deleted'),
    ...overrides,
  };
}

beforeEach(() => resetApiMock());

describe('CrudPage', () => {
  it('loads and lists records', async () => {
    renderPage(<CrudPage config={makeConfig(mockService())} />);
    expect(await screen.findByText('Counter 1')).toBeInTheDocument();
    expect(screen.getByText('Counter 2')).toBeInTheDocument();
  });

  it('shows the empty state when the list is empty', async () => {
    renderPage(<CrudPage config={makeConfig(mockService({ getAll: vi.fn().mockResolvedValue([]) }))} />);
    expect(await screen.findByText('No billing counters yet')).toBeInTheDocument();
  });

  it('filters via the search box', async () => {
    const user = userEvent.setup();
    renderPage(<CrudPage config={makeConfig(mockService())} />);
    await screen.findByText('Counter 1');
    await user.type(screen.getByPlaceholderText(/search billing counters/i), 'Back');
    await waitFor(() => expect(screen.queryByText('Counter 1')).not.toBeInTheDocument());
    expect(screen.getByText('Counter 2')).toBeInTheDocument();
  });

  it('validates required fields client-side and blocks the create call', async () => {
    const service = mockService();
    const user = userEvent.setup();
    renderPage(<CrudPage config={makeConfig(service)} />);
    await screen.findByText('Counter 1');
    await user.click(screen.getByRole('button', { name: /add billing counter/i }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Counter name is required')).toBeInTheDocument();
    expect(screen.getByText('Location is required')).toBeInTheDocument();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('submits a valid create with the coerced payload', async () => {
    const service = mockService();
    const user = userEvent.setup();
    renderPage(<CrudPage config={makeConfig(service)} />);
    await screen.findByText('Counter 1');
    await user.click(screen.getByRole('button', { name: /add billing counter/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Counter Name/), 'Counter 9');
    await user.type(within(dialog).getByLabelText(/Location/), 'Aisle 9');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'Counter 9', location: 'Aisle 9', status: 'ACTIVE' }),
      ),
    );
  });

  it('opens the edit modal pre-filled and calls update with the record id', async () => {
    const service = mockService();
    const user = userEvent.setup();
    renderPage(<CrudPage config={makeConfig(service)} />);
    await screen.findByText('Counter 1');
    // useCrud sorts newest-first, so row[0] is Counter 2 (id 2).
    await user.click(screen.getAllByTitle('Edit')[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/Counter Name/)).toHaveValue('Counter 2');
    await user.clear(within(dialog).getByLabelText(/Location/));
    await user.type(within(dialog).getByLabelText(/Location/), 'Relocated');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(service.update).toHaveBeenCalledWith(2, expect.objectContaining({ location: 'Relocated' })));
  });

  it('confirms then deletes a record', async () => {
    const service = mockService();
    const user = userEvent.setup();
    renderPage(<CrudPage config={makeConfig(service)} />);
    await screen.findByText('Counter 1');
    await user.click(screen.getAllByTitle('Delete')[0]);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(service.remove).toHaveBeenCalledWith(2));
  });

  it('renders without crashing when the initial load fails', async () => {
    const service = mockService({ getAll: vi.fn().mockRejectedValue(new Error('boom')) });
    renderPage(<CrudPage config={makeConfig(service)} />);
    expect(await screen.findByText('No billing counters yet')).toBeInTheDocument();
  });
});
