import type { User } from "@shared/schema";

const SENSITIVE_USER_FIELDS = [
  "password",
  "passwordHash",
  "refreshToken",
  "refreshTokens",
] as const;

const SENSITIVE_PAYMENT_FIELDS = [
  "cardNumber",
  "cvv",
  "bankAccount",
  "routingNumber",
  "paymentMethodId",
  "stripeCustomerId",
  "paymentToken",
] as const;

const SENSITIVE_CONTACT_FIELDS = [
  "phone",
  "email",
  "address",
  "ssn",
  "taxId",
] as const;

type MaskingLevel = "full" | "partial" | "none";

interface MaskingOptions {
  maskPasswords?: boolean;
  maskPayments?: boolean;
  maskContacts?: boolean;
  level?: MaskingLevel;
}

const DEFAULT_OPTIONS: MaskingOptions = {
  maskPasswords: true,
  maskPayments: true,
  maskContacts: false,
  level: "full",
};

function maskValue(value: unknown, level: MaskingLevel = "full"): string {
  if (value === null || value === undefined) {
    return "[EMPTY]";
  }

  const strValue = String(value);

  if (level === "none") {
    return strValue;
  }

  if (level === "partial") {
    if (strValue.length <= 4) {
      return "****";
    }
    return strValue.slice(0, 2) + "****" + strValue.slice(-2);
  }

  return "[MASKED]";
}

function maskEmail(email: string, level: MaskingLevel = "full"): string {
  if (!email || !email.includes("@")) {
    return maskValue(email, level);
  }

  if (level === "none") {
    return email;
  }

  const [local, domain] = email.split("@");

  if (level === "partial") {
    const maskedLocal = local.length > 2 
      ? local[0] + "***" + local[local.length - 1]
      : "***";
    return `${maskedLocal}@${domain}`;
  }

  return "[EMAIL MASKED]";
}

function maskPhone(phone: string, level: MaskingLevel = "full"): string {
  if (!phone) {
    return "[EMPTY]";
  }

  if (level === "none") {
    return phone;
  }

  const digits = phone.replace(/\D/g, "");

  if (level === "partial" && digits.length >= 4) {
    return "***-***-" + digits.slice(-4);
  }

  return "[PHONE MASKED]";
}

function maskCardNumber(cardNumber: string, level: MaskingLevel = "full"): string {
  if (!cardNumber) {
    return "[EMPTY]";
  }

  if (level === "none") {
    return cardNumber;
  }

  const digits = cardNumber.replace(/\D/g, "");

  if (level === "partial" && digits.length >= 4) {
    return "**** **** **** " + digits.slice(-4);
  }

  return "[CARD MASKED]";
}

export function maskSensitiveData<T extends Record<string, unknown>>(
  data: T,
  options: MaskingOptions = DEFAULT_OPTIONS
): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  const result = { ...data } as Record<string, unknown>;
  const level = options.level || "full";

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();
    const value = result[key];

    if (options.maskPasswords !== false) {
      if (SENSITIVE_USER_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
        result[key] = "[REDACTED]";
        continue;
      }
    }

    if (options.maskPayments !== false) {
      if (SENSITIVE_PAYMENT_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
        if (lowerKey.includes("card")) {
          result[key] = maskCardNumber(String(value), level);
        } else {
          result[key] = maskValue(value, level);
        }
        continue;
      }
    }

    if (options.maskContacts === true) {
      if (lowerKey === "email") {
        result[key] = maskEmail(String(value), level);
        continue;
      }
      if (lowerKey === "phone" || lowerKey.includes("phone")) {
        result[key] = maskPhone(String(value), level);
        continue;
      }
      if (SENSITIVE_CONTACT_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
        result[key] = maskValue(value, level);
        continue;
      }
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = maskSensitiveData(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === "object" && item !== null
          ? maskSensitiveData(item as Record<string, unknown>, options)
          : item
      );
    }
  }

  return result as T;
}

export function maskUserForSupport(user: User): Partial<User> & { _masked: true } {
  const masked = maskSensitiveData(user as unknown as Record<string, unknown>, {
    maskPasswords: true,
    maskPayments: true,
    maskContacts: false,
    level: "full",
  });

  if ("password" in masked) delete masked.password;
  if ("passwordHash" in masked) delete masked.passwordHash;
  if ("refreshToken" in masked) delete masked.refreshToken;

  return { ...masked, _masked: true } as Partial<User> & { _masked: true };
}

export function maskTenantForSupport<T extends Record<string, unknown>>(
  tenant: T
): T & { _masked: true } {
  const masked = maskSensitiveData(tenant, {
    maskPasswords: true,
    maskPayments: true,
    maskContacts: false,
    level: "partial",
  });

  return { ...masked, _masked: true } as T & { _masked: true };
}

export function maskPaymentDataForSupport<T extends Record<string, unknown>>(
  paymentData: T
): T & { _masked: true } {
  const masked = maskSensitiveData(paymentData, {
    maskPasswords: true,
    maskPayments: true,
    maskContacts: true,
    level: "partial",
  });

  return { ...masked, _masked: true } as T & { _masked: true };
}

export const DataMasking = {
  maskSensitiveData,
  maskUserForSupport,
  maskTenantForSupport,
  maskPaymentDataForSupport,
  maskEmail,
  maskPhone,
  maskCardNumber,
  maskValue,
};
