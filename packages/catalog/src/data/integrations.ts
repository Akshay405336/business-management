import { buildGroups, flattenGroups } from '../build.js';

export const INTEGRATIONS_GROUPS = buildGroups('integration', [
  {
    category: 'Payments',
    labels: [
      'Razorpay',
      'Stripe',
      'PayPal',
      'Cashfree',
      'PhonePe Payment Gateway',
      'PayU',
      'CCAvenue',
      'Square',
    ],
  },
  {
    category: 'Communication and Notifications',
    labels: [
      'SMTP Email',
      'Brevo',
      'SendGrid',
      'Amazon SES',
      'Twilio SMS',
      'MSG91',
      'Firebase Cloud Messaging',
      'WhatsApp Business Platform',
      'Interakt',
      'WATI',
    ],
  },
  {
    category: 'Authentication',
    labels: [
      'Google OAuth',
      'Microsoft OAuth',
      'Apple Sign-In',
      'Auth0',
      'Clerk',
      'Firebase Authentication',
      'Supabase Auth',
      'OTP Authentication',
      'Two-Factor Authentication',
    ],
  },
  {
    category: 'Analytics and Marketing',
    labels: [
      'Google Analytics 4',
      'Google Tag Manager',
      'Meta Pixel',
      'Google Ads Conversion Tracking',
      'Microsoft Clarity',
      'Hotjar',
      'LinkedIn Insight Tag',
      'Google Search Console',
    ],
  },
  {
    category: 'Maps and Location',
    labels: ['Google Maps', 'Mapbox', 'OpenStreetMap', 'Google Places API'],
  },
  {
    category: 'Storage and Media',
    labels: [
      'AWS S3',
      'Cloudinary',
      'UploadThing',
      'Azure Blob Storage',
      'Google Cloud Storage',
    ],
  },
  {
    category: 'Business and Productivity',
    labels: [
      'Zoho CRM',
      'HubSpot',
      'Salesforce',
      'Zoho Books',
      'Tally Integration',
      'QuickBooks',
      'Google Sheets',
      'Google Calendar',
      'Microsoft 365',
      'Slack',
      'Discord',
      'Zoom',
      'Google Meet',
    ],
  },
  {
    category: 'Shipping and Other Services',
    labels: [
      'Shiprocket',
      'Delhivery',
      'Pickrr',
      'India Post API',
      'Elasticsearch',
      'Redis Cache',
      'Socket.IO',
      'Webhooks',
      'REST API Integration',
      'GraphQL API Integration',
    ],
  },
]);

export const INTEGRATIONS_OPTIONS = flattenGroups(INTEGRATIONS_GROUPS);
