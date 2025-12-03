import React from "react";

/**
 * Simple light/dark theme toggle.
 *
 * Applies a `dark` class to the `document.body` when in dark mode.
 */
export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const buttonLabel =
    theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded border border-gray-400 px-4 py-2 text-sm font-medium text-gray-900 bg-white hover:bg-gray-100"
    >
      {buttonLabel}
    </button>
  );
};
