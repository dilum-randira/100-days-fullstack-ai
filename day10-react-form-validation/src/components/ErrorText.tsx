import type React from "react";

export interface ErrorTextProps {
  message?: string;
}

export const ErrorText: React.FC<ErrorTextProps> = ({ message }) => {
  if (!message) return null;

  return <p className="error-text">{message}</p>;
};
