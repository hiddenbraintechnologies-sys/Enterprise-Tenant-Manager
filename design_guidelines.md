# Design Guidelines: Multi-Tenant SaaS Business Management Platform

## Design Approach

**Selected Approach**: Design System - Linear/Notion-inspired with Material Design data components

**Justification**: Enterprise B2B SaaS requiring productivity-focused interface, information density, role-based dashboards, and long-term stability. Prioritizes efficiency and clarity over visual trends.

**Core Principles**:
- Clarity over decoration
- Efficient information hierarchy
- Consistent, predictable patterns
- Scalable component system

---

## Typography System

**Font Stack**: Inter (Primary), JetBrains Mono (Code/Data)

**Hierarchy**:
- **Display/Hero**: 3xl to 4xl, font-semibold (Dashboard titles)
- **H1**: 2xl, font-semibold (Page headers)
- **H2**: xl, font-semibold (Section headers)
- **H3**: lg, font-medium (Card titles, subsections)
- **Body**: base, font-normal (Primary content)
- **Small**: sm, font-normal (Helper text, captions)
- **Tiny**: xs, font-medium (Labels, badges, table headers - uppercase)

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-6, mb-8)

**Core Layouts**:
- **Sidebar Navigation**: Fixed 64-unit width, full-height, collapsible to icon-only
- **Main Content**: Full remaining width with max-w-7xl container, px-6 to px-8
- **Dashboard Grid**: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 with gap-6
- **Forms**: Single column max-w-2xl with consistent field spacing (gap-4 to gap-6)
- **Tables**: Full-width with horizontal scroll on mobile

---

## Component Library

### Navigation
- **Top Bar**: Fixed height (h-16), tenant branding left, user menu right, notifications/search center
- **Sidebar**: Hierarchical navigation with icon + label, active state indicator, grouped sections
- **Breadcrumbs**: Small text with chevron separators for deep navigation

### Data Display
- **Cards**: Rounded-lg, border, p-6, shadow-sm - Used for metrics, summaries, quick actions
- **Tables**: Sticky headers, alternating row backgrounds, row hover states, action columns
- **Stats Cards**: Large numbers (text-3xl font-bold), labels (text-sm), trend indicators
- **Calendar/Schedule View**: Week/month grid, time slots, color-coded bookings, drag-drop ready

### Forms
- **Input Fields**: h-10, rounded-md, border, px-3 with focus ring, label above (text-sm font-medium mb-1)
- **Select Dropdowns**: Match input styling, chevron indicator
- **Checkboxes/Radio**: Rounded-sm for checkboxes, rounded-full for radio, custom accent
- **Date/Time Pickers**: Calendar popover, time slot selection
- **Field Groups**: Related fields in flex rows with gap-4

### Actions
- **Primary Button**: h-10, px-4, rounded-md, font-medium - Main CTAs
- **Secondary Button**: Same size, outline variant
- **Icon Buttons**: Square (h-10 w-10), rounded-md, icon-only for tables/toolbars
- **Floating Action Button**: Fixed bottom-right for quick booking/add actions (mobile-optimized)

### Overlays
- **Modals**: max-w-2xl, centered, backdrop blur, close button top-right
- **Slideovers**: Right-side drawer (w-96 to w-1/3), for detail views and forms
- **Dropdowns**: Rounded-lg, shadow-lg, animated slide-down
- **Toasts**: Fixed top-right, auto-dismiss, success/error variants

### Status Indicators
- **Badges**: Rounded-full, px-2.5 py-0.5, text-xs font-medium - booking status, payment status
- **Progress Bars**: h-2, rounded-full, animated fill
- **Loading States**: Skeleton screens for tables/cards, spinner for buttons

---

## Dashboard-Specific Patterns

**Super Admin Dashboard**: 
- Tenant overview grid, system health metrics, revenue charts, recent activity feed

**Business Admin Dashboard**:
- Revenue cards (today/week/month), booking calendar, staff schedule, quick stats grid

**Staff Dashboard**:
- Today's schedule, upcoming bookings table, customer check-in, quick actions

**Customer Portal**:
- Booking history, upcoming appointments, payment history, profile management

**Common Elements All Dashboards**:
- Top stats row (3-4 metric cards)
- Main content area (calendar/table/charts)
- Right sidebar for quick actions/notifications (optional, collapsible)

---

## Mobile Responsive Strategy

- **Sidebar**: Collapses to hamburger menu
- **Tables**: Horizontal scroll with sticky first column OR card-based mobile view
- **Dashboard Grids**: Stack to single column (grid-cols-1)
- **Forms**: Full-width inputs with comfortable touch targets (h-12 on mobile)
- **Bottom Navigation**: Fixed tab bar for primary sections on mobile

---

## Images

**Not Applicable**: This is a functional dashboard application. No hero images or decorative photography. Use:
- Icon library: Heroicons (via CDN)
- Illustrations: Empty states only (simple line illustrations for "no bookings", "no customers")
- Profile Pictures: User avatars (rounded-full, border)
- Tenant Logos: Display in top bar and white-label areas

---

## Animations

**Minimal, Purposeful Only**:
- Smooth transitions for modals/slideovers (duration-200)
- Skeleton loading states
- Hover states on interactive elements
- NO scroll animations, parallax, or decorative motion