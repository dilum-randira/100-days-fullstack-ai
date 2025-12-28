import type { Migration } from './types';
import * as m0001 from './example.0001.init';

// Add migrations here in version order.
// Do not change versions once released.
export const migrations: Migration[] = [
  {
    version: m0001.version,
    description: m0001.description,
    up: m0001.up,
    down: m0001.down,
  },
];
