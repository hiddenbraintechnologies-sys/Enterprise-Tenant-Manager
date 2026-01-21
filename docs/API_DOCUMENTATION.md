# BizFlow API Documentation

## Overview

BizFlow provides a RESTful API for mobile app integration. All endpoints require authentication via session cookies or can be adapted for token-based authentication.

**Base URL:** `https://your-app-domain.replit.app`

## Authentication

Authentication is handled via Replit Auth (OAuth 2.0 / OpenID Connect). The API uses session-based authentication with secure cookies.

### For Mobile Apps

Mobile app integration options:

1. **WebView-based auth**: Open the `/api/login` endpoint in a WebView, handle the OAuth flow, and capture the session cookie
2. **Session cookies**: After successful login, store and send session cookies with each request using `credentials: 'include'`

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/login` | Initiates OAuth login flow (redirects to Replit) |
| GET | `/api/callback` | OAuth callback handler (handles redirect from Replit) |
| GET | `/api/logout` | Logs out the user and ends session |
| GET | `/api/auth/user` | Returns current authenticated user |

### Login Flow

1. Open `/api/login` in a WebView or browser
2. User authenticates with Replit (Google, GitHub, etc.)
3. Replit redirects to `/api/callback` with auth code
4. Session cookie is set automatically
5. All subsequent API calls include the session cookie

### Check Authentication Status

```http
GET /api/auth/user
```

**Response (200 OK):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://example.com/avatar.jpg",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Response (401 Unauthorized):**
```json
{
  "message": "Unauthorized"
}
```

---

## Dashboard

### Get Dashboard Statistics

```http
GET /api/dashboard/stats
```

**Response (200 OK):**
```json
{
  "totalCustomers": 150,
  "totalBookings": 342,
  "todayBookings": 8,
  "monthlyRevenue": 125000,
  "revenueGrowth": 12.5
}
```

---

## Customers

### List All Customers

```http
GET /api/customers
```

**Response (200 OK):**
```json
[
  {
    "id": "customer-uuid",
    "tenantId": "tenant-uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+91-9876543210",
    "address": "123 Main St, City",
    "notes": "Regular customer",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Get Single Customer

```http
GET /api/customers/:id
```

**Response (200 OK):**
```json
{
  "id": "customer-uuid",
  "tenantId": "tenant-uuid",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+91-9876543210",
  "address": "123 Main St, City",
  "notes": "Regular customer",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Create Customer

```http
POST /api/customers
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+91-9876543210",
  "address": "123 Main St, City",
  "notes": "Regular customer"
}
```

**Response (201 Created):**
```json
{
  "id": "new-customer-uuid",
  "tenantId": "tenant-uuid",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+91-9876543210",
  "address": "123 Main St, City",
  "notes": "Regular customer",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Update Customer

```http
PATCH /api/customers/:id
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "phone": "+91-1234567890",
  "notes": "VIP customer"
}
```

**Response (200 OK):** Returns updated customer object.

### Delete Customer

```http
DELETE /api/customers/:id
```

**Response (204 No Content)**

---

## Services

### List All Services

```http
GET /api/services
```

**Response (200 OK):**
```json
[
  {
    "id": "service-uuid",
    "tenantId": "tenant-uuid",
    "name": "Haircut",
    "description": "Professional haircut with styling",
    "duration": 30,
    "price": "500.00",
    "category": "Hair",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Get Single Service

```http
GET /api/services/:id
```

**Response (200 OK):**
```json
{
  "id": "service-uuid",
  "tenantId": "tenant-uuid",
  "name": "Haircut",
  "description": "Professional haircut with styling",
  "duration": 30,
  "price": "500.00",
  "category": "Hair",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### Create Service

```http
POST /api/services
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Haircut",
  "description": "Professional haircut with styling",
  "duration": 30,
  "price": "500.00",
  "category": "Hair",
  "isActive": true
}
```

**Important:** The `price` field must be sent as a **string** to ensure decimal precision.

**Response (201 Created):** Returns created service object.

### Update Service

```http
PATCH /api/services/:id
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "price": "600.00",
  "isActive": true
}
```

**Response (200 OK):** Returns updated service object.

### Delete Service

```http
DELETE /api/services/:id
```

**Response (204 No Content)**

---

## Bookings

### List All Bookings

```http
GET /api/bookings
```

**Response (200 OK):**
```json
[
  {
    "id": "booking-uuid",
    "tenantId": "tenant-uuid",
    "customerId": "customer-uuid",
    "serviceId": "service-uuid",
    "staffId": null,
    "bookingDate": "2025-01-15",
    "startTime": "10:00:00",
    "endTime": "10:30:00",
    "status": "confirmed",
    "paymentStatus": "pending",
    "amount": "500.00",
    "notes": "First appointment",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "customer": {
      "id": "customer-uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+91-9876543210"
    },
    "service": {
      "id": "service-uuid",
      "name": "Haircut",
      "duration": 30,
      "price": "500.00"
    }
  }
]
```

### Get Upcoming Bookings

```http
GET /api/bookings/upcoming?limit=10
```

Returns bookings from today onwards, ordered by date.

**Query Parameters:**
- `limit` (optional): Maximum number of bookings to return (default: 10)

**Response (200 OK):** Array of booking objects with customer and service details.

### Get Single Booking

```http
GET /api/bookings/:id
```

**Response (200 OK):** Single booking object with customer and service details.

### Create Booking

```http
POST /api/bookings
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "customer-uuid",
  "serviceId": "service-uuid",
  "staffId": null,
  "bookingDate": "2025-01-15",
  "startTime": "10:00",
  "endTime": "10:30",
  "status": "pending",
  "paymentStatus": "pending",
  "amount": "500.00",
  "notes": "First appointment"
}
```

**Field Details:**
- `bookingDate`: ISO date string (YYYY-MM-DD)
- `startTime`: Time in HH:MM format
- `endTime`: Time in HH:MM format
- `status`: One of `pending`, `confirmed`, `completed`, `cancelled`
- `paymentStatus`: One of `pending`, `partial`, `paid`, `refunded`
- `amount`: String representation of decimal amount

**Response (201 Created):** Returns created booking object.

### Update Booking

```http
PATCH /api/bookings/:id
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "status": "confirmed",
  "paymentStatus": "paid"
}
```

**Response (200 OK):** Returns updated booking object.

### Delete Booking

```http
DELETE /api/bookings/:id
```

**Response (204 No Content)**

---

## Analytics

### Get Analytics Data

```http
GET /api/analytics
```

**Response (200 OK):**
```json
{
  "revenueByMonth": [
    { "month": "Jan", "revenue": 50000 },
    { "month": "Feb", "revenue": 65000 },
    { "month": "Mar", "revenue": 72000 }
  ],
  "bookingsByService": [
    { "service": "Haircut", "count": 120 },
    { "service": "Facial", "count": 85 },
    { "service": "Massage", "count": 60 }
  ],
  "customerGrowth": [
    { "month": "Jan", "customers": 20 },
    { "month": "Feb", "customers": 35 },
    { "month": "Mar", "customers": 48 }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authenticated"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Failed to perform operation"
}
```

---

## Data Types Reference

### Customer
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Auto | Unique identifier |
| name | string | Yes | Customer name |
| email | string | No | Email address |
| phone | string | No | Phone number |
| address | string | No | Physical address |
| notes | string | No | Additional notes |
| createdAt | ISO datetime | Auto | Creation timestamp |

### Service
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Auto | Unique identifier |
| name | string | Yes | Service name |
| description | string | No | Service description |
| duration | integer | Yes | Duration in minutes (default: 60) |
| price | string (decimal) | Yes | Price amount |
| category | string | No | Service category |
| isActive | boolean | No | Active status (default: true) |
| createdAt | ISO datetime | Auto | Creation timestamp |

### Booking
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (UUID) | Auto | Unique identifier |
| customerId | string (UUID) | Yes | Reference to customer |
| serviceId | string (UUID) | Yes | Reference to service |
| staffId | string (UUID) | No | Reference to staff member |
| bookingDate | string (date) | Yes | Date of booking (YYYY-MM-DD) |
| startTime | string (time) | Yes | Start time (HH:MM) |
| endTime | string (time) | Yes | End time (HH:MM) |
| status | enum | No | pending, confirmed, completed, cancelled |
| paymentStatus | enum | No | pending, partial, paid, refunded |
| amount | string (decimal) | No | Booking amount |
| notes | string | No | Booking notes |
| createdAt | ISO datetime | Auto | Creation timestamp |

---

## Mobile App Integration Examples

### React Native / Expo

```javascript
// API client setup
const API_BASE = 'https://your-app.replit.app';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Important for session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.status === 204 ? null : response.json();
}

// Example: Fetch customers
const customers = await apiRequest('/api/customers');

// Example: Create booking
const booking = await apiRequest('/api/bookings', {
  method: 'POST',
  body: JSON.stringify({
    customerId: 'customer-uuid',
    serviceId: 'service-uuid',
    bookingDate: '2025-01-15',
    startTime: '10:00',
    endTime: '10:30',
    status: 'pending',
    paymentStatus: 'pending',
    amount: '500.00',
  }),
});
```

### Flutter / Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String baseUrl = 'https://your-app.replit.app';
  
  Future<List<dynamic>> getCustomers() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/customers'),
      headers: {'Content-Type': 'application/json'},
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load customers');
    }
  }
  
  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/bookings'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(data),
    );
    
    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to create booking');
    }
  }
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. For production use, consider implementing rate limiting based on your needs.

## Versioning

This is API version 1.0. Future breaking changes will be introduced with a new version prefix (e.g., `/api/v2/`).

---

## Add-on Marketplace

### List Available Add-ons

```http
GET /api/addons/marketplace?country=IN&currency=INR&category=all
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| country | string | Filter add-ons by country (e.g., IN, MY, UK) |
| currency | string | Display pricing in specified currency (e.g., INR, MYR, GBP) |
| category | string | Filter by category (all, hr, automation, analytics, utilities) |
| search | string | Search by name or description |
| businessType | string | Filter by business type |
| featured | boolean | Show only featured add-ons |
| sortBy | string | Sort by: installCount, rating, newest, featured |
| limit | number | Results per page (default: 20) |
| offset | number | Pagination offset |

**Response (200 OK):**
```json
{
  "addons": [
    {
      "id": "addon-uuid",
      "name": "Payroll (India)",
      "slug": "payroll-india",
      "shortDescription": "Comprehensive payroll management for Indian businesses",
      "category": "hr",
      "featured": true,
      "pricing": [
        {
          "id": "pricing-uuid",
          "pricingType": "subscription",
          "basePrice": "49.00",
          "currency": "INR",
          "billingCycle": "monthly",
          "usageMetric": "per_employee"
        }
      ],
      "isGlobal": false,
      "supportedCountries": ["IN"]
    }
  ],
  "total": 11,
  "page": 1,
  "pageSize": 20,
  "hasMore": false
}
```

### Get Tenant Installed Add-ons

```http
GET /api/addons/tenant/:tenantId/addons
```

**Response (200 OK):**
```json
{
  "installedAddons": [
    {
      "installation": {
        "id": "installation-uuid",
        "status": "active",
        "installedAt": "2026-01-15T00:00:00.000Z"
      },
      "addon": {
        "id": "addon-uuid",
        "name": "WhatsApp Automation",
        "category": "automation"
      },
      "pricing": {
        "pricingType": "subscription",
        "basePrice": "999.00",
        "currency": "INR"
      }
    }
  ]
}
```

### Install Add-on

```http
POST /api/addons/tenant/:tenantId/addons
```

**Request Body:**
```json
{
  "addonId": "addon-uuid",
  "pricingId": "pricing-uuid"
}
```

### Enable/Disable Add-on

```http
POST /api/addons/tenant/:tenantId/addons/:addonId/enable
POST /api/addons/tenant/:tenantId/addons/:addonId/disable
```

### Uninstall Add-on

```http
DELETE /api/addons/tenant/:tenantId/addons/:addonId
```
