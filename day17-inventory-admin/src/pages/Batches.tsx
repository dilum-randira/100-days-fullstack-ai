import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import type { Batch, InventoryItem } from '../types';
import { formatDateTime, formatNumber } from '../utils/format';

export const BatchesPage: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [itemsResult, setItemsResult] = useState<InventoryItem[] | null>(null);

  const [form, setForm] = useState({ batchCode: '', supplier: '', totalWeight: '' });
  const [createItemsForm, setCreateItemsForm] = useState({
    batchId: '',
    productName: '',
    quantity: '',
    unit: '',
    location: '',
  });

  const canEdit = user?.role === 'admin' || user?.role === 'staff';

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listBatches();
      setBatches(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        batchCode: form.batchCode,
        supplier: form.supplier || undefined,
        totalWeight: Number(form.totalWeight),
      } as any;
      const created = await api.createBatch(payload);
      setBatches((prev) => [created, ...prev]);
      setCreateOpen(false);
      setForm({ batchCode: '', supplier: '', totalWeight: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateItems = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const items = await api.createItemsFromBatch(createItemsForm.batchId, {
        items: [
          {
            productName: createItemsForm.productName,
            quantity: Number(createItemsForm.quantity),
            unit: createItemsForm.unit,
            location: createItemsForm.location,
          },
        ],
      });
      setItemsResult(items);
      await loadBatches();
    } catch (err: any) {
      setError(err.message || 'Failed to create items from batch');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Batches</h1>
        {canEdit && (
          <button type="button" onClick={() => setCreateOpen((v) => !v)}>
            {createOpen ? 'Close' : 'New Batch'}
          </button>
        )}
      </div>

      {createOpen && canEdit && (
        <Card title="Create New Batch">
          <form onSubmit={handleCreateBatch} className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Batch Code</label>
              <input
                value={form.batchCode}
                onChange={(e) => setForm((f) => ({ ...f, batchCode: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Supplier</label>
              <input
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Total Weight</label>
              <input
                type="number"
                value={form.totalWeight}
                onChange={(e) => setForm((f) => ({ ...f, totalWeight: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {canEdit && (
        <Card title="Create Items From Batch">
          <form onSubmit={handleCreateItems} className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Batch</label>
              <select
                value={createItemsForm.batchId}
                onChange={(e) => setCreateItemsForm((f) => ({ ...f, batchId: e.target.value }))}
                required
                className="w-full"
              >
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.batchCode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Product Name</label>
              <input
                value={createItemsForm.productName}
                onChange={(e) => setCreateItemsForm((f) => ({ ...f, productName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                value={createItemsForm.quantity}
                onChange={(e) => setCreateItemsForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Unit</label>
              <input
                value={createItemsForm.unit}
                onChange={(e) => setCreateItemsForm((f) => ({ ...f, unit: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Location</label>
              <input
                value={createItemsForm.location}
                onChange={(e) => setCreateItemsForm((f) => ({ ...f, location: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full">
                Create Items
              </button>
            </div>
          </form>

          {itemsResult && (
            <div className="mt-3 text-xs text-slate-700">
              <div className="font-medium">Created items:</div>
              <ul className="list-disc pl-5">
                {itemsResult.map((item) => (
                  <li key={item._id}>
                    {item.productName} - {formatNumber(item.quantity)} {item.unit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <Card title="Batch List">
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Batch
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Supplier
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Weight
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remaining
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {batches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm text-slate-700">{batch.batchCode}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{batch.supplier || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{formatNumber(batch.totalWeight)}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{formatNumber(batch.remainingWeight)}</td>
                    <td className="px-3 py-2 text-sm text-slate-500">{formatDateTime(batch.createdAt)}</td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-sm text-slate-500" colSpan={5}>
                      No batches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
