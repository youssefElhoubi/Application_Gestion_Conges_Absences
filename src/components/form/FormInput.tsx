import * as React from "react";
import { FormField } from "./FormField";
import { Input, InputProps } from "@/src/components/ui/input";

export interface FormInputProps extends Omit<InputProps, "error"> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  containerClassName?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, description, error, required, hint, containerClassName, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <FormField
        label={label}
        htmlFor={inputId}
        required={required}
        description={description}
        error={error}
        hint={hint}
        className={containerClassName}
      >
        <Input ref={ref} id={inputId} error={!!error} {...props} />
      </FormField>
    );
  }
);
FormInput.displayName = "FormInput";
