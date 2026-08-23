import { describe, expect, it } from 'vitest';

import { nativeErrorPresentation } from '@/main/app/error-presentation';

describe('native application error presentation', () => {
  it('names Daymark in product-level native error titles', () => {
    expect(nativeErrorPresentation).toEqual({
      initialization: {
        title: 'Daymark could not start',
        message:
          'Required local resources could not be initialized. Please restart the application.',
      },
      timerTitle: 'Daymark timer error',
    });
  });
});
