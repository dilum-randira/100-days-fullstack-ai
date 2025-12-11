import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const baseClass =
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white px-4 py-4">
      <div className="mb-6 text-base font-semibold text-slate-800">Menu</div>
      <nav className="flex flex-1 flex-col gap-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `${baseClass} ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) => `${baseClass} ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}
        >
          Inventory
        </NavLink>
        <NavLink
          to="/batches"
          className={({ isActive }) => `${baseClass} ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}
        >
          Batches
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) => `${baseClass} ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}
        >
          Analytics
        </NavLink>
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Logout
      </button>
    </aside>
  );
};
