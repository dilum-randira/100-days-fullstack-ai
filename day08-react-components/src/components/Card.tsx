import type React from "react";

export interface CardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Simple card layout with a title and body.
 */
export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 max-w-md">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
};
