import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { Card } from '../components/Card';
import { Pagination } from '../components/Pagination';
import { Table } from '../components/Table';
import { AdjustModal } from '../components/AdjustModal';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../hooks/useAuth';
import type { InventoryItem } from '../types';
import { formatNumber, formatStatus } from '../utils/format';

export const InventoryListPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, setData } = useFetch({
    fetcher: () =>
      api.listInventory({
        page,
        limit: 10,
        search: search || undefined,
        location: location || undefined,
        supplier: supplier || undefined,
        batchCode: batchCode || undefined,
      }),
    deps: [page, search, location, supplier, batchCode],
  });

  const canAdjust = user?.role === 'admin' || user?.role === 'staff';
  const canDelete = user?.role === 'admin';

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleAdjust = async (delta: number) => {
    if (!selectedItem) return;
    const updated = await api.adjustItem(selectedItem._id, delta);
    if (!data) return;
    // update local cache
    setData({
      ...data,
      data: data.data.map((item) => (item._id === updated._id ? updated : item)),
    });
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/${item._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!data) return;
    setData({
      ...data,
      data: data.data.filter((i) => i._id !== item._id),
      total: data.total - 1,
    });
  };

  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Inventory</h1>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Product name or SKU"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Location</label>
            <input
              value={location}
              onChange={(e) => {
                setPage(1);
                setLocation(e.target.value);
              }}
              placeholder="Location"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Supplier</label>
            <input
              value={supplier}
              onChange={(e) => {
                setPage(1);
                setSupplier(e.target.value);
              }}
              placeholder="Supplier"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Batch</label>
            <input
              value={batchCode}
              onChange={(e) => {
                setPage(1);
                setBatchCode(e.target.value);
              }}
              placeholder="Batch code"
            />
          </div>
        </div>
      </Card>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length > 0 && (
        <>
          <Table<InventoryItem>
            keyField="_id"
            columns={[
              { key: 'productName', header: 'Product' },
              { key: 'sku', header: 'SKU' },
              { key: 'batchCode', header: 'Batch' },
              {
                key: 'quantity',
                header: 'Quantity',
                render: (row) => formatNumber(row.quantity),
              },
              { key: 'minThreshold', header: 'Min', render: (row) => formatNumber(row.minThreshold) },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {formatStatus(row.status)}
                  </span>
                ),
              },
              { key: 'location', header: 'Location' },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/inventory/${row._id}`)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </button>
                    {canAdjust && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(row)}
                        className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        Adjust
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            data={items}
          />
          {data && (
            <Pagination page={data.page} limit={data.limit} total={data.total} onChange={setPage} />
          )}
        </>
      )}

      <AdjustModal
        item={selectedItem}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAdjust}
      />
    </div>
  );
};
