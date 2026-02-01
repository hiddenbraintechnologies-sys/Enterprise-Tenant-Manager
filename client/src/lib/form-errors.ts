import type { UseFormSetError, FieldValues, Path } from "react-hook-form";

export type ApiFieldError = { field: string; message: string };

export type ApiError = {
  error: string;
  message?: string;
  fieldErrors?: ApiFieldError[];
};

/**
 * Maps backend validation errors to React Hook Form fields
 * Returns true if errors were mapped, false otherwise
 */
export function applyApiErrorsToForm<TFieldValues extends FieldValues>(
  apiError: ApiError | null | undefined,
  setError: UseFormSetError<TFieldValues>
): boolean {
  if (!apiError) return false;

  // Handle field-level errors
  if (apiError.fieldErrors?.length) {
    for (const fe of apiError.fieldErrors) {
      setError(fe.field as Path<TFieldValues>, { 
        type: "server", 
        message: fe.message 
      });
    }
    return true;
  }

  // Fallback to form-level error
  if (apiError.message) {
    setError("root" as Path<TFieldValues>, { 
      type: "server", 
      message: apiError.message 
    });
    return true;
  }

  return false;
}

/**
 * Extracts API error from various response formats
 */
export function extractApiError(error: unknown): ApiError | null {
  if (!error) return null;
  
  // Handle fetch response errors
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Direct API error format
    if (err.error === "VALIDATION_ERROR" || err.fieldErrors) {
      return err as ApiError;
    }
    
    // Legacy format with errors object
    if (err.errors && typeof err.errors === "object") {
      const fieldErrors: ApiFieldError[] = [];
      for (const [field, messages] of Object.entries(err.errors as Record<string, string[]>)) {
        if (Array.isArray(messages) && messages.length > 0) {
          fieldErrors.push({ field, message: messages[0] });
        }
      }
      return { 
        error: "VALIDATION_ERROR", 
        fieldErrors,
        message: err.message as string | undefined
      };
    }
    
    // Simple message format
    if (err.message) {
      return { error: "ERROR", message: err.message as string };
    }
  }
  
  return null;
}
