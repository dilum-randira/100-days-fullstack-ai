import type React from "react";

export interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}

/**
 * Controlled input component with optional label.
 */
export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}) => {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {label && (
        <label className="font-medium text-gray-800" htmlFor={label}>
          {label}
        </label>
      )}
      <input
        id={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};
