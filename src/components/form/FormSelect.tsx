import * as React from "react";
import { FormField } from "./FormField";
import { Select, SelectProps } from "@/src/components/ui/select";

export interface FormSelectProps extends Omit<SelectProps, "error"> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  containerClassName?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, description, error, required, hint, containerClassName, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <FormField
        label={label}
        htmlFor={selectId}
        required={required}
        description={description}
        error={error}
        hint={hint}
        className={containerClassName}
      >
        <Select ref={ref} id={selectId} error={!!error} {...props} />
      </FormField>
    );
  }
);
FormSelect.displayName = "FormSelect";
