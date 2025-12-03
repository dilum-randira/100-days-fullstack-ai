import type React from "react";

export interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return <div className="error">Error: {message}</div>;
};
