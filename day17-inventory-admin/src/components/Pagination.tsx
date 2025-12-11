interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, limit, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <div>
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};
