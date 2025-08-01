import { useState } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationErrors {
  [key: string]: string;
}

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = (name: string, value: string): string | null => {
    const rule = rules[name];
    if (!rule) return null;

    if (rule.required && (!value || value.trim() === '')) {
      return `${name} is required`;
    }

    if (rule.minLength && value.length < rule.minLength) {
      return `${name} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return `${name} must be no more than ${rule.maxLength} characters`;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      switch (name) {
        case 'userName':
          return 'Username must contain only letters, numbers, and underscores';
        case 'password':
          return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
        default:
          return `${name} format is invalid`;
      }
    }

    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  };

  const validateForm = (formData: Record<string, string>): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName] || '');
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const validateSingleField = (name: string, value: string): boolean => {
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
    return !error;
  };

  const clearErrors = () => setErrors({});

  return {
    errors,
    validateForm,
    validateSingleField,
    clearErrors,
    hasErrors: Object.values(errors).some(error => error !== '')
  };
};

