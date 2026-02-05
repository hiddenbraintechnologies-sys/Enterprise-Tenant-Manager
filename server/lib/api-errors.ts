export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_ALREADY_EXISTS"
  | "TENANT_ALREADY_EXISTS"
  | "BUSINESS_TYPE_NOT_ALLOWED_FOR_COUNTRY"
  | "INVALID_BUSINESS_TYPE"
  | "COUNTRY_NOT_AVAILABLE"
  | "COUNTRY_SIGNUP_DISABLED"
  | "COUNTRY_BILLING_DISABLED"
  | "MODULE_NOT_AVAILABLE"
  | "FEATURE_NOT_AVAILABLE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function handleApiError(res: any, err: unknown) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(err.toJSON());
  }
  
  if ((err as any)?.name === "ZodError") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: (err as any).flatten(),
      },
    });
  }

  console.error("Unhandled API error:", err);
  return res.status(500).json({
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
