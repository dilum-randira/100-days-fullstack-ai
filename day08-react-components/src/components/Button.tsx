import type React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline";

export interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: ButtonVariant;
}

// Simple mapping of variants to CSS class strings.
const baseClass =
  "inline-flex items-center justify-center px-4 py-2 rounded text-sm font-medium cursor-pointer transition-colors";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  outline:
    "border border-gray-400 text-gray-900 bg-transparent hover:bg-gray-100",
};

/**
 * Reusable button component with simple variants.
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = "primary",
}) => {
  const className = `${baseClass} ${variantClasses[variant]}`;

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
};
