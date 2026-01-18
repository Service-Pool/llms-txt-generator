import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables BEFORE any other imports
// This file should be first in jest setupFiles
dotenvConfig({ path: resolve(__dirname, '.env.test'), override: true });
