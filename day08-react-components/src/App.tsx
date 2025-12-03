import React from "react";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { Input } from "./components/Input";
import { ThemeToggle } from "./components/ThemeToggle";
import "./styles.css";

export const App: React.FC = () => {
  const [name, setName] = React.useState("");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Day 8 – Reusable React Components</h1>
            <p className="text-sm text-gray-600">
              Practicing basic reusable UI building blocks with TypeScript and React.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Buttons</h2>
            <div className="flex flex-wrap gap-2">
              <Button label="Primary" variant="primary" />
              <Button label="Secondary" variant="secondary" />
              <Button label="Outline" variant="outline" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Controlled Input</h2>
            <Input
              label="Your name"
              value={name}
              onChange={setName}
              placeholder="Type your name..."
            />
            <p className="text-sm text-gray-700">
              Current value: <span className="font-semibold">{name || "(empty)"}</span>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Card Example</h2>
          <Card title="Welcome">
            <p className="mb-3">
              This is a simple reusable Card component. It accepts a title and any
              React children as its content, so you can compose headers, text,
              buttons, and more.
            </p>
            <Button
              label="Click me"
              onClick={() => alert("Card button clicked!")}
              variant="primary"
            />
          </Card>
        </section>
      </div>
    </div>
  );
};

export default App;
