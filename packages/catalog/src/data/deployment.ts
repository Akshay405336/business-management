import { buildGroups, flattenGroups } from '../build.js';

export const HOSTING_DEPLOYMENT_GROUPS = buildGroups('hosting', [
  {
    category: 'Hosting / Deployment',
    labels: [
      'Shared Hosting',
      'WordPress Hosting',
      'Managed WordPress Hosting',
      'VPS Hosting',
      'Dedicated Server',
      'Cloud Hosting',
      'AWS Deployment',
      'Azure Deployment',
      'Google Cloud Deployment',
      'Vercel Deployment',
      'Netlify Deployment',
      'Hostinger Deployment',
      'DigitalOcean Deployment',
      'Docker Deployment',
      'Kubernetes Deployment',
      'Coolify Deployment',
      'CI/CD Pipeline Setup',
      'Custom Domain Configuration',
      'DNS Configuration',
      'SSL Certificate Setup',
      'CDN Configuration',
      'Staging Environment',
      'Production Environment',
      'Database Setup',
      'Automated Backups',
      'Monitoring and Logging',
      'Security Hardening',
    ],
  },
]);

export const HOSTING_DEPLOYMENT_OPTIONS = flattenGroups(HOSTING_DEPLOYMENT_GROUPS);
