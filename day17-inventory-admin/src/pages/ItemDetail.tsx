import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/api';
import { Card } from '../components/Card';
import { AdjustModal } from '../components/AdjustModal';
import { useAuth } from '../hooks/useAuth';
import type { InventoryItem, InventoryLog } from '../types';
import { formatDateTime, formatNumber, formatStatus } from '../utils/format';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canAdjust = user?.role === 'admin' || user?.role === 'staff';

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedItem, logsResult] = await Promise.all([
        api.getItem(id),
        api.getItemLogs(id, 1, 50),
      ]);
      setItem(fetchedItem);
      setLogs(logsResult.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAdjust = async (delta: number) => {
    if (!id) return;
    const updated = await api.adjustItem(id, delta);
    setItem(updated);
    const logsResult = await api.getItemLogs(id, 1, 50);
    setLogs(logsResult.data);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!item) return <p className="text-sm text-slate-500">Item not found.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">{item.productName}</h1>
        {canAdjust && (
          <button type="button" onClick={() => setModalOpen(true)}>
            Adjust Quantity
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Details">
          <dl className="space-y-2 text-sm text-slate-700">
            <div className="flex justify-between">
              <dt className="font-medium">SKU</dt>
              <dd>{item.sku || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Batch</dt>
              <dd>
                {item.batchCode ? (
                  <Link to={`/batches?code=${encodeURIComponent(item.batchCode)}`} className="text-blue-600">
                    {item.batchCode}
                  </Link>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Quantity</dt>
              <dd>
                {formatNumber(item.quantity)} {item.unit}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Min Threshold</dt>
              <dd>{formatNumber(item.minThreshold)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Status</dt>
              <dd>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {formatStatus(item.status)}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Location</dt>
              <dd>{item.location}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Supplier</dt>
              <dd>{item.supplier || '-'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Change Logs">
          <div className="max-h-80 space-y-2 overflow-y-auto text-xs text-slate-700">
            {logs.length === 0 && <p className="text-slate-500">No logs yet.</p>}
            {logs.map((log) => (
              <div key={log._id} className="flex justify-between border-b border-slate-100 pb-1 last:border-b-0">
                <div>
                  <div className="font-medium">
                    {log.delta > 0 ? '+' : ''}
                    {log.delta}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatNumber(log.oldQuantity)} → {formatNumber(log.newQuantity)}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">{formatDateTime(log.createdAt)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <AdjustModal
        item={item}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAdjust}
      />
    </div>
  );
};
