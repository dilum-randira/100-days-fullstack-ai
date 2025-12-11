import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>}
      {children}
    </div>
  );
};
