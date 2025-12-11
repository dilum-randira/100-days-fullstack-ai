import { Card } from '../components/Card';
import { api } from '../api/api';
import { useFetch } from '../hooks/useFetch';
import type { InventoryItem } from '../types';
import { formatNumber } from '../utils/format';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { data: stats, loading: statsLoading, error: statsError } = useFetch({
    fetcher: () => api.getInventoryStats(),
    deps: [],
  });

  const { data: trends, loading: trendsLoading, error: trendsError } = useFetch({
    fetcher: () => api.getInventoryTrends(30),
    deps: [],
  });

  const { data: topItems, loading: topLoading, error: topError } = useFetch({
    fetcher: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/top?limit=10`);
      if (!res.ok) throw new Error('Failed to load top items');
      const json = await res.json();
      return json.data as InventoryItem[];
    },
    deps: [],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Analytics</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Stock by Location">
          {statsLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : statsError ? (
            <p className="text-sm text-red-600">{statsError}</p>
          ) : stats && stats.byLocation.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byLocation} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="location" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No stats data.</p>
          )}
        </Card>

        <Card title="30-Day Trend">
          {trendsLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : trendsError ? (
            <p className="text-sm text-red-600">{trendsError}</p>
          ) : trends && trends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="quantity" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No trend data.</p>
          )}
        </Card>
      </div>

      <Card title="Top Items by Stock">
        {topLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : topError ? (
          <p className="text-sm text-red-600">{topError}</p>
        ) : topItems && topItems.length > 0 ? (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Product
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    SKU
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {topItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm text-slate-700">{item.productName}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{item.sku || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{formatNumber(item.quantity)}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{item.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No top items.</p>
        )}
      </Card>
    </div>
  );
};
