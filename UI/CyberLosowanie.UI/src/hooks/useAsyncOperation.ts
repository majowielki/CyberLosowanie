import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseAsyncOperationOptions<T = unknown> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useAsyncOperation = <T = unknown>(options: UseAsyncOperationOptions<T> = {}) => {
  const [loading, setLoading] = useState(false);

  const execute = async (operation: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await operation();
      if (options.successMessage) {
        toast({ description: options.successMessage });
      }
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (error) {
      console.error('Operation failed:', error);
      const errorMsg = options.errorMessage || 'An error occurred. Please try again.';
      toast({ 
        description: errorMsg,
        variant: 'destructive'
      });
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading };
};
