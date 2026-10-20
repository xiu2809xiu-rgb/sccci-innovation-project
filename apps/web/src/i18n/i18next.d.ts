import 'i18next';

import type { resources } from './resources';

/** Typed translation keys: a misspelt or missing key is a compile error. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
