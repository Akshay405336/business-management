import { buildGroups, flattenGroups } from '../build.js';

export const ADMIN_PANEL_GROUPS = buildGroups('admin', [
  {
    category: 'Dashboard and Analytics',
    labels: [
      'Dashboard Overview',
      'KPI Cards',
      'Charts and Reports',
      'Sales Analytics',
      'Traffic Analytics',
      'Export Reports',
      'Custom Date Filters',
    ],
  },
  {
    category: 'Content Management',
    labels: [
      'Page Management',
      'Blog Management',
      'Media Library',
      'SEO Management',
      'Menu Management',
      'Banner Management',
      'FAQ Management',
      'Testimonials Management',
      'Gallery Management',
    ],
  },
  {
    category: 'Products and Commerce',
    labels: [
      'Product Management',
      'Category Management',
      'Inventory Management',
      'Order Management',
      'Coupon Management',
      'Discount Management',
      'Payment Management',
      'Refund Management',
      'Shipping Management',
      'Tax Configuration',
    ],
  },
  {
    category: 'Users and Access',
    labels: [
      'User Management',
      'Role-Based Access Control',
      'Permissions Management',
      'Admin Profile',
      'Activity Logs',
      'Audit Logs',
      'Login History',
      'Session Management',
      'Two-Factor Authentication',
    ],
  },
  {
    category: 'CRM and Operations',
    labels: [
      'Lead Management',
      'Pipeline Management',
      'Client Management',
      'Proposal and Quotation Management',
      'Task Management',
      'Project Management',
      'Employee Management',
      'Attendance Management',
      'Leave Management',
      'Expense Management',
      'Invoice Management',
    ],
  },
  {
    category: 'System Settings',
    labels: [
      'General Settings',
      'Email Settings',
      'Notification Settings',
      'API Settings',
      'Integration Settings',
      'Backup and Restore',
      'Import and Export',
      'Localization',
      'Currency Settings',
      'Maintenance Mode',
    ],
  },
]);

export const ADMIN_PANEL_OPTIONS = flattenGroups(ADMIN_PANEL_GROUPS);
