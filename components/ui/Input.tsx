import React, { useState } from 'react';
import styles from './Input.module.css';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';

        const togglePasswordVisibility = () => {
            setShowPassword(!showPassword);
        };

        return (
            <div className={styles.container}>
                {label && <label className={styles.label}>{label}</label>}
                <div className={styles.inputWrapper}>
                    <input
                        ref={ref}
                        type={isPassword ? (showPassword ? 'text' : 'password') : type}
                        className={clsx(styles.input, error && styles.error, isPassword && styles.passwordInput, className)}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            className={styles.toggleButton}
                            onClick={togglePasswordVisibility}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    )}
                </div>
                {error && <span className={styles.errorMessage}>{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
