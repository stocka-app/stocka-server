// Loads .env.test before any module is evaluated in the test worker.
// This ensures environment variables (BCRYPT_ROUNDS, DB_*, etc.) are
// available when module-level code runs (e.g. APP_CONSTANTS initialization).
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.test') });
