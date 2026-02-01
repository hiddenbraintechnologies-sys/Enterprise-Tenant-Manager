import { z } from "zod";
import { nameField } from "./name";

export const registerSchema = z.object({
  firstName: nameField("First name"),
  lastName: nameField("Last name"),
  email: z.string().trim().email("Please enter a valid email"),
  countryCode: z.string().trim().min(2, "Country is required").max(5),
  businessName: z.string().trim().min(2, "Business name is required").max(200),
  businessType: z.string().trim().min(2, "Business type is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(8).max(72),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  }
});

export type RegisterInput = z.infer<typeof registerSchema>;
