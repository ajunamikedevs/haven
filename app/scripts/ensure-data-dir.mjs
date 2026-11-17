// The local PGlite database lives in .data/, which is not checked in. Create it before migrating.
import { mkdirSync } from 'node:fs';

mkdirSync('.data', { recursive: true });
