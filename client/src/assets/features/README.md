# Feature Assets

This folder contains screenshots and video clips for feature presentations across:
- Marketplace add-on cards
- Locked feature screens
- Landing page explainer videos
- In-app upsell modals

## Folder Structure

```
features/
├── payroll/
│   ├── payroll-overview.png    # Dashboard with employee count, total payout
│   ├── payroll-payslip.png     # Individual payslip view
│   ├── payroll-run.png         # "Run Payroll" confirmation screen
│   ├── payroll-compliance.png  # EPF/ESI/TDS indicators
│   └── payroll-run.mp4         # Short clip (5-7s): Run Payroll → success
├── hrms/
│   ├── hrms-employees.png      # Employee directory
│   ├── hrms-attendance.png     # Attendance calendar / punch-in
│   ├── hrms-leave.png          # Leave request & approval
│   ├── hrms-profile.png        # Employee profile view
│   └── hrms-attendance.mp4     # Short clip: Punch-in → marked
├── whatsapp/
│   ├── whatsapp-templates.png  # Message templates list
│   ├── whatsapp-reminder.png   # Payment reminder preview
│   ├── whatsapp-log.png        # Sent message history
│   └── whatsapp-send.mp4       # Short clip: Invoice → Send → delivered
├── invoicing/
│   ├── invoice-create.png      # Invoice creation form
│   ├── invoice-preview.png     # Branded invoice preview
│   ├── invoice-payment.png     # Payment received status
│   ├── invoice-tax.png         # GST/SST/VAT breakdown
│   └── invoice-create.mp4      # Short clip: Create → Preview → Save
├── projects/
│   ├── projects-list.png       # Project/Engagement list
│   ├── project-detail.png      # Tasks & milestones
│   ├── timesheet-log.png       # Log time modal
│   ├── timesheet-summary.png   # Billable hours summary
│   └── timesheet-log.mp4       # Short clip: Select → log → save
├── analytics/
│   ├── analytics-dashboard.png # Revenue + trends
│   ├── analytics-payments.png  # Paid vs pending
│   ├── analytics-growth.png    # Monthly growth graph
│   └── analytics-drilldown.mp4 # Short clip: Click → detailed view
├── customer-portal/
│   ├── portal-login.png        # Customer login
│   ├── portal-invoices.png     # Invoice list
│   ├── portal-pay.png          # Online payment screen
│   └── portal-pay.mp4          # Short clip: Customer pays invoice
└── marketplace/
    ├── marketplace-browse.png  # Add-on catalog
    ├── marketplace-addon.png   # Payroll/HRMS add-on card
    ├── marketplace-installed.png # Installed tab
    ├── marketplace-upsell.png  # Locked add-on CTA
    └── marketplace-install.mp4 # Short clip: Install → success
```

## Naming Rules

- No country-specific labels in filenames
- Same assets reused globally
- Country logic handled in copy, not visuals

## Usage in Code

```typescript
import { getFeatureScreenshot, getFeatureVideo } from "@/config/feature-assets";

// Get primary screenshot
const screenshot = getFeatureScreenshot("payroll");

// Get specific variant
const payslip = getFeatureScreenshot("payroll", "detail");

// Get video with poster
const video = getFeatureVideo("payroll");
```

## Component Usage

```tsx
import { FeatureImage, FeatureVideo } from "@/components/ui/feature-image";

// Image with fallback to icon
<FeatureImage 
  featureKey="payroll" 
  variant="overview" 
  aspectRatio="video" 
/>

// Video with poster
<FeatureVideo 
  featureKey="payroll" 
  autoPlay 
  loop 
  muted 
/>
```

## Asset Specifications

### Screenshots
- Format: PNG (preferred) or WebP
- Resolution: 1920x1080 or 1280x720
- Aspect ratio: 16:9 (video) recommended

### Videos
- Format: MP4 (H.264)
- Duration: 5-8 seconds
- Resolution: 1280x720 minimum
- No audio (muted in UI)
