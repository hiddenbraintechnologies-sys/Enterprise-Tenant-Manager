/**
 * Centralized Brand Constants
 * 
 * All auth provider and profile management messaging should use these constants
 * to ensure consistent branding across the application.
 * 
 * This file is intentionally SSO-provider agnostic to support white-label deployments.
 */

export const AUTH_PROVIDER_LABEL = "Single Sign-On (SSO)";

export const PROFILE_MANAGED_MESSAGE = "Profile information is managed through your account provider.";

export const SECURITY_MANAGED_MESSAGE = "Security settings are managed through your account provider.";

export const LOGIN_BUTTON_TEXT = "Continue with SSO";

export const LOGIN_SUBTITLE = "Sign in with your organization account";

export const LOGOUT_BUTTON_TEXT = "Sign Out";

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

export const UNAUTHORIZED_MESSAGE = "Authentication required. Please sign in to continue.";
