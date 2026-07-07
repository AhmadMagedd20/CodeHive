// Set the minimum env before any module (env.ts) is imported by tests.
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/lms_test?schema=public";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-16-chars";
process.env.APP_URL ??= "http://localhost:3000";
process.env.MAX_LOGIN_ATTEMPTS ??= "5";
process.env.LOGIN_LOCK_MINUTES ??= "15";
process.env.TWO_FACTOR_ENABLED ??= "false";
