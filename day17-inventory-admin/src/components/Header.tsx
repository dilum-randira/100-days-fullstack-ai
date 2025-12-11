import { useAuth } from '../hooks/useAuth';

export const Header: React.FC = () => {
  const { user } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-800">Inventory Admin</h1>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        {user && (
          <>
            <span>{user.name || user.email}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-700">
              {user.role}
            </span>
          </>
        )}
      </div>
    </header>
  );
};
