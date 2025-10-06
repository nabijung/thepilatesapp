// src/components/ui/CustomFormField.tsx
import { useField, FieldAttributes } from 'formik';
import React from 'react';

interface CustomFormFieldProps extends FieldAttributes<unknown> {
    label?: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
    select?: boolean;
    options?: Array<{ value: string, label: string }>;
    type?: string;
    className?: string;
    extraInputClasses?: string;
    as?: string;
    id?: string;
    name?: string;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children?: React.ReactNode;
}

export const CustomFormField: React.FC<CustomFormFieldProps> = ({
    label,
    placeholder = '',
    multiline = false,
    rows = 4,
    select = false,
    options = [],
    className = '',
    extraInputClasses = '',
    ...props
}) => {
    const [field, meta] = useField(props);
    const showError = meta.touched && meta.error;
    const inputId = props.id || (props as any).name;

    // Common styles for the wrapper
    const wrapperStyles = `relative w-full ${className}`;

    // Input element styles
    const inputStyles = `
    w-full
    border border-gray-300
    rounded-lg
    px-4 py-3
    focus:outline-none
    focus:border-gray-400
    bg-white
    ${extraInputClasses}
    ${showError ? 'border-red-500' : ''}
  `;

    // Label styles with the floating effect
    const labelStyles = `
    absolute -top-[0.7rem] left-[15px]
    px-1
    bg-white
    text-[#49454F]
    text-sm font-[400]
    pointer-events-none
  `;

    return (
        <div className={wrapperStyles}>
            {label && <label htmlFor={inputId} className={labelStyles}>
                {label}
            </label>}

            {multiline ? (
                <textarea
                    {...field}
                    id={inputId}
                    placeholder={placeholder}
                    rows={rows}
                    className={inputStyles}
                />
            ) : select ? (
                <select
                    {...field}
                    id={inputId}
                    className={inputStyles}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                    {(props as any).children}
                </select>
            ) : (
                <input
                    {...field}
                    {...props}
                    id={inputId}
                    type={props.type || 'text'}
                    placeholder={placeholder}
                    className={inputStyles}
                />
            )}

            {showError && (
                <div className="text-red-500 text-xs mt-1">{meta.error}</div>
            )}
        </div>
    );
};