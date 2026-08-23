import { productIdentity } from '@/shared/product-identity';

export const nativeErrorPresentation = {
  initialization: {
    title: `${productIdentity.displayName} could not start`,
    message:
      'Required local resources could not be initialized. Please restart the application.',
  },
  timerTitle: `${productIdentity.displayName} timer error`,
} as const;
