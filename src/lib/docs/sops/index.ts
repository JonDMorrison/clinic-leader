export { RECALL_REVIEW_SOP } from './recallReview';
export { MONTHLY_OPERATING_RHYTHM_SOP } from './monthlyOperatingRhythm';

// Aggregated list of all default SOPs for seeding
export const DEFAULT_SOPS = [
  {
    key: 'recall-review',
    import: () => import('./recallReview').then(m => m.RECALL_REVIEW_SOP),
  },
  {
    key: 'monthly-operating-rhythm',
    import: () => import('./monthlyOperatingRhythm').then(m => m.MONTHLY_OPERATING_RHYTHM_SOP),
  },
];
