# BizFlow Test Credentials

This document contains all test login credentials for development and testing purposes.

**IMPORTANT: These credentials are for development/testing only. Never use these in production.**

---

## Platform Admin Credentials

### Super Admin (Full Access)

| Field | Value |
|-------|-------|
| **Email** | superadmin@bizflow.app |
| **Password** | Admin@123! |
| **Role** | SUPER_ADMIN |
| **Access** | Full platform access, all features |
| **Login URL** | `/admin-login` |

### Platform Admins (Limited Access)

| Name | Email | Password | Role |
|------|-------|----------|------|
| John Smith | john.smith@bizflow.app | Test@123! | PLATFORM_ADMIN |
| Sarah Johnson | sarah.johnson@bizflow.app | Test@123! | PLATFORM_ADMIN |
| Mike Chen | mike.chen@bizflow.app | Test@123! | SUPER_ADMIN |

---

## Sample Tenants (India - GST)

| Tenant Name | Business Type | Email | Subscription |
|-------------|---------------|-------|--------------|
| My Business | service | admin@example.com | free |
| HealthFirst Clinic | clinic | admin@healthfirst.in | pro |
| Urban Stay PG | pg | contact@urbanstay.in | free |
| FastTrack Logistics | logistics | ops@fasttrack.in | free |
| FitZone Wellness Spa | salon | info@fitzone.in | pro |
| Luxe Hair Studio | salon | book@luxehair.in | enterprise |
| IIT Success Academy | education | admissions@iitsuccess.in | pro |
| LifeCare Diagnostics | clinic | reports@lifecare.in | enterprise |
| Campus Corner Hostel | pg | stay@campuscorner.in | free |
| Desi Bazaar Services | service | orders@desibazaar.in | pro |
| Spice Garden Catering | service | reserve@spicegarden.in | pro |

---

## Sample Tenants (UK - VAT)

| Tenant Name | Business Type | Email | Subscription |
|-------------|---------------|-------|--------------|
| TechHub Coworking | coworking | hello@techhub.co.uk | pro |
| Harley Street Medical | clinic | appointments@harleymed.co.uk | enterprise |
| Chelsea Beauty Bar | salon | book@chelseabeauty.co.uk | pro |
| Iron Works Fitness Spa | salon | join@ironworks.co.uk | pro |
| Chambers & Associates | legal | enquiries@chambers.co.uk | enterprise |
| Oxford Prep School | education | admissions@oxfordprep.co.uk | enterprise |
| High Street Boutique | service | shop@highstreet.co.uk | free |
| The King Arms Pub | service | book@kingarms.co.uk | pro |

---

## Password Requirements

All passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

---

## Access URLs

| Feature | URL |
|---------|-----|
| Main Application | `/` |
| Admin Login | `/admin-login` |
| Super Admin Dashboard | `/super-admin` |
| Platform Admin Dashboard | `/admin` |
| User Registration | `/register` |
| User Onboarding | `/onboarding` |

---

## Notes

1. **Force Password Reset**: The super admin account has `forcePasswordReset: true` - you may be prompted to change password on first login.

2. **Session Storage**: Admin tokens are stored in localStorage:
   - `bizflow_admin_token` - Access token
   - `bizflow_refresh_token` - Refresh token

3. **Tenant Login**: Regular users authenticate via Replit Auth (SSO). No password is needed for end users.

4. **Creating New Admins**: Super Admins can create new platform admins via:
   - Navigate to Super Admin Dashboard
   - Go to Platform Admins section
   - Click "Add Admin" button

---

*Last Updated: January 2026*
