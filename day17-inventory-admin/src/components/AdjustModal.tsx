import type { InventoryItem } from '../types';

interface AdjustModalProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (delta: number) => Promise<void>;
}

export const AdjustModal: React.FC<AdjustModalProps> = ({ item, open, onClose, onSubmit }) => {
  const [delta, setDelta] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(delta);
    if (!Number.isFinite(value) || value === 0) {
      setError('Please enter a non-zero number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(value);
      setDelta('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust quantity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold text-slate-800">Adjust Quantity</h2>
        <p className="mb-3 text-sm text-slate-600">
          Item: <span className="font-medium">{item.productName}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Delta (positive or negative)</label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="w-full"
              placeholder="e.g. 10 or -5"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
