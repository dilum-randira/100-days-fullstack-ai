import React from "react";
import { useFormValidation } from "./hooks/useFormValidation";
import { combineValidators, isEmail, minLength, required } from "./validators";
import { TextField } from "./components/TextField";
import "./styles.css";

interface FormValues {
  name: string;
  email: string;
  password: string;
}

export const App: React.FC = () => {
  const [submittedValues, setSubmittedValues] = React.useState<FormValues | null>(
    null,
  );

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useFormValidation<FormValues>({
      initialValues: {
        name: "",
        email: "",
        password: "",
      },
      validators: {
        name: [combineValidators(required, minLength(2))],
        email: [combineValidators(required, isEmail)],
        password: [combineValidators(required, minLength(6))],
      },
      onSubmit: (formValues) => {
        setSubmittedValues(formValues);
      },
    });

  return (
    <div className="app-root">
      <div className="app-card">
        <header className="app-header">
          <h1>Day 10 – React Form Validation</h1>
          <p>Simple reusable validators and a custom hook for form validation.</p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Name"
            name="name"
            value={values.name}
            placeholder="Your full name"
            error={errors.name}
            touched={touched.name}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <TextField
            label="Email"
            name="email"
            type="email"
            value={values.email}
            placeholder="you@example.com"
            error={errors.email}
            touched={touched.email}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            value={values.password}
            placeholder="At least 6 characters"
            error={errors.password}
            touched={touched.password}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <button type="submit" className="submit-btn">
            Submit
          </button>
        </form>

        {submittedValues && (
          <section className="submitted">
            <h2>Submitted Values</h2>
            <pre>{JSON.stringify(submittedValues, null, 2)}</pre>
          </section>
        )}
      </div>
    </div>
  );
};

export default App;
