/**
 * Root Facade for IAM Service Domain-Driven Architecture.
 * Re-exports domain feature slices across auth, session, password, profile, and events.
 */
export * from './auth';
export * from './events';
export * from './password';
export * from './profile';
export * from './session';
