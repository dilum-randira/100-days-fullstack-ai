import type { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
}

export function Table<T extends Record<string, unknown>>({ columns, data, keyField }: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.map((row) => (
            <tr key={String(row[keyField])} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={String(col.key)} className="whitespace-nowrap px-4 py-2 text-sm text-slate-700">
                  {col.render ? col.render(row) : (row[col.key as keyof T] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="px-4 py-3 text-center text-sm text-slate-500">No data found.</div>
      )}
    </div>
  );
}
