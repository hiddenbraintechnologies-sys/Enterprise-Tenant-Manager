import type { Tour } from "@/contexts/tour-context";

export const dashboardTour: Tour = {
  id: "dashboard-tour",
  name: "Dashboard Tour",
  steps: [
    {
      target: '[data-testid="button-sidebar-toggle"]',
      title: "Sidebar Navigation",
      content: "Click here to expand or collapse the sidebar. The sidebar gives you quick access to all main features.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-dashboard"]',
      title: "Dashboard",
      content: "Your dashboard shows key metrics and an overview of your business at a glance.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-customers"]',
      title: "Customer Management",
      content: "Manage all your customers here. Add new customers, view their history, and track interactions.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-bookings"]',
      title: "Bookings",
      content: "View and manage all your appointments and bookings. Create new bookings and check availability.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-analytics"]',
      title: "Analytics",
      content: "Get insights into your business performance with detailed analytics and reports.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-settings"]',
      title: "Settings",
      content: "Configure your business settings, preferences, and integrations here.",
      placement: "right",
    },
    {
      target: '[data-testid="button-theme-toggle"]',
      title: "Theme Toggle",
      content: "Switch between light and dark mode based on your preference.",
      placement: "bottom",
    },
  ],
};

export const customersTour: Tour = {
  id: "customers-tour",
  name: "Customer Management Tour",
  steps: [
    {
      target: '[data-testid="button-add-customer"]',
      title: "Add New Customer",
      content: "Click here to add a new customer to your database. Fill in their details to get started.",
      placement: "bottom",
    },
    {
      target: '[data-testid="input-search-customers"]',
      title: "Search Customers",
      content: "Quickly find customers by searching their name, email, or phone number.",
      placement: "bottom",
    },
  ],
};

export const bookingsTour: Tour = {
  id: "bookings-tour",
  name: "Bookings Tour",
  steps: [
    {
      target: '[data-testid="button-new-booking"]',
      title: "Create New Booking",
      content: "Schedule a new appointment or booking for your customers.",
      placement: "bottom",
    },
    {
      target: '[data-testid="calendar-view"]',
      title: "Calendar View",
      content: "View all your bookings in a calendar format. Switch between day, week, and month views.",
      placement: "bottom",
    },
  ],
};

export const newFeaturesTour: Tour = {
  id: "new-features-jan-2026",
  name: "New Features - January 2026",
  steps: [
    {
      target: '[data-tour="sidebar-marketplace"]',
      title: "Add-on Marketplace",
      content: "Explore our new marketplace to discover add-ons that can enhance your business operations.",
      placement: "right",
    },
    {
      target: '[data-tour="sidebar-analytics"]',
      title: "Enhanced Analytics",
      content: "We've upgraded our analytics with new charts and insights to help you make better decisions.",
      placement: "right",
    },
  ],
};

export const allTours = [
  dashboardTour,
  customersTour,
  bookingsTour,
  newFeaturesTour,
];

export function getTourById(id: string): Tour | undefined {
  return allTours.find((tour) => tour.id === id);
}
