import { Card } from '../components/Card';
import { useFetch } from '../hooks/useFetch';
import { api } from '../api/api';
import { formatNumber } from '../utils/format';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { data: summary, loading: summaryLoading, error: summaryError } = useFetch({
    fetcher: () => api.getInventorySummary(),
    deps: [],
  });

  const { data: trends, loading: trendsLoading, error: trendsError } = useFetch({
    fetcher: () => api.getInventoryTrends(30),
    deps: [],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Items">
          {summaryLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : summaryError ? (
            <p className="text-sm text-red-600">{summaryError}</p>
          ) : (
            <p className="text-2xl font-semibold text-slate-800">{formatNumber(summary?.totalItems ?? 0)}</p>
          )}
        </Card>
        <Card title="Total Quantity">
          {summaryLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : summaryError ? (
            <p className="text-sm text-red-600">{summaryError}</p>
          ) : (
            <p className="text-2xl font-semibold text-slate-800">{formatNumber(summary?.totalQuantity ?? 0)}</p>
          )}
        </Card>
        <Card title="Low Stock Items">
          {summaryLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : summaryError ? (
            <p className="text-sm text-red-600">{summaryError}</p>
          ) : (
            <p className="text-2xl font-semibold text-slate-800">formatNumber(summary?.lowStockCount ?? 0)</p>
          )}
        </Card>
        <Card title="Total Value">
          {summaryLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : summaryError ? (
            <p className="text-sm text-red-600">{summaryError}</p>
          ) : (
            <p className="text-2xl font-semibold text-slate-800">
              ${formatNumber(summary?.totalValue ?? 0, 2)}
            </p>
          )}
        </Card>
      </div>

      <Card title="30-Day Inventory Trend">
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
          <p className="text-sm text-slate-500">No trend data available.</p>
        )}
      </Card>
    </div>
  );
};
