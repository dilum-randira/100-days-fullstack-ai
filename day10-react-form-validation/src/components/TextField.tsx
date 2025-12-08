import type React from "react";
import { ErrorText } from "./ErrorText";

export interface TextFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string;
  touched?: boolean;
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  name,
  type = "text",
  value,
  placeholder,
  error,
  touched,
  onChange,
  onBlur,
}) => {
  const showError = touched && error;

  return (
    <div className="field">
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        className={showError ? "field-input field-input-error" : "field-input"}
      />
      <ErrorText message={showError ? error : undefined} />
    </div>
  );
};
