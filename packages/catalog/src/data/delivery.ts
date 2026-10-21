import { buildGroups, flattenGroups } from '../build.js';

export const DELIVERY_SERVICES_GROUPS = buildGroups('delivery', [
  {
    category: 'Delivery Services',
    labels: [
      'UI/UX Design',
      'Responsive Implementation',
      'Source Code Delivery',
      'Git Repository Setup',
      'CI/CD Configuration',
      'Production Deployment',
      'Domain Setup',
      'SSL Setup',
      'Performance Optimization',
      'SEO Setup',
      'Analytics Setup',
      'Documentation',
      'Admin Training',
      'User Training',
      'Warranty Period',
      'Maintenance and Support',
      'Monthly Updates',
      'Backup Management',
      'Security Updates',
      'Post-Launch Support',
    ],
  },
]);

export const DELIVERY_SERVICES_OPTIONS = flattenGroups(DELIVERY_SERVICES_GROUPS);
