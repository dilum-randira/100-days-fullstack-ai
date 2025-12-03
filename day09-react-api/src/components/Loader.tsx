import type React from "react";

export const Loader: React.FC = () => {
  return (
    <div className="loader">
      <div className="spinner" />
      <span>Loading posts...</span>
    </div>
  );
};
