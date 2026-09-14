import {
  AccountAlreadyExists,
  AdminPasswordReset,
  EmailVerification,
  LoginAlert,
  PasswordChanged,
  PasswordReset,
  PasswordResetConfirmed,
  SecurityAlert,
  WelcomeEmail,
} from '@aegis/email-templates';
import { NotificationEvent } from '@aegis/events';
import * as React from 'react';

/**
 * Centralized, single-source-of-truth subject lines for all platform transactional emails.
 * Decoupled from channel transport logic to support auditing, localization, and customization.
 */
export const EMAIL_SUBJECTS = {
  [NotificationEvent.USER_REGISTERED]: 'Welcome to Aegis Security',
  [NotificationEvent.EMAIL_VERIFICATION_REQUESTED]: 'Verify Your Identity',
  [NotificationEvent.PASSWORD_RESET_REQUESTED]: 'Your Password Reset Code',
  [NotificationEvent.PASSWORD_CHANGED]: 'Your Aegis Password Was Changed',
  [NotificationEvent.PASSWORD_RESET_COMPLETED]: 'Password Reset Completed',
  [NotificationEvent.ADMIN_PASSWORD_RESET]: 'Your Temporary Password for Aegis',
  [NotificationEvent.ACCOUNT_ALREADY_EXISTS]:
    'Security Notice: Registration Attempt on Your Aegis Account',
  [NotificationEvent.SECURITY_LOGIN_ALERT]:
    'Security Alert: New Sign-In Detected',
} as const;

/**
 * Specification mapping an event to its rendering component, subject resolver, and prop injector.
 */
export interface EmailTemplateDefinition<P = any> {
  templateName: string;
  subject: string | ((payload: P) => string);
  component: React.ComponentType<any>;
  resolveProps: (payload: P, frontendUrl: string) => Record<string, any>;
}

/**
 * Higher-order prop resolution helper. Automatically passes through all payload fields
 * and dynamically injects the fully qualified frontend URL without redundant manual re-mapping.
 *
 * @param path - Destination relative path
 * @param urlPropKey - Prop name expected by the template (defaults to 'loginUrl')
 */
const withUrl =
  (path: string, urlPropKey = 'loginUrl') =>
  (payload: any, frontendUrl: string) => ({
    ...payload,
    [urlPropKey]: payload?.[urlPropKey] || `${frontendUrl}${path}`,
  });

/**
 * Declarative single-source-of-truth registry mapping notification events
 * to their respective React Email template components, subjects, and prop builders.
 */
export const EMAIL_TEMPLATE_REGISTRY: Record<string, EmailTemplateDefinition> =
  {
    [NotificationEvent.USER_REGISTERED]: {
      templateName: WelcomeEmail.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.USER_REGISTERED],
      component: WelcomeEmail,
      resolveProps: withUrl('/login'),
    },

    [NotificationEvent.EMAIL_VERIFICATION_REQUESTED]: {
      templateName: EmailVerification.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.EMAIL_VERIFICATION_REQUESTED],
      component: EmailVerification,
      resolveProps: (p, base) => ({
        ...p,
        verificationUrl:
          p.verificationUrl ||
          `${base}/verify-email?token=${p.verificationToken}`,
      }),
    },

    [NotificationEvent.PASSWORD_RESET_REQUESTED]: {
      templateName: PasswordReset.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.PASSWORD_RESET_REQUESTED],
      component: PasswordReset,
      resolveProps: withUrl('/reset-password', 'resetUrl'),
    },

    [NotificationEvent.PASSWORD_CHANGED]: {
      templateName: PasswordChanged.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.PASSWORD_CHANGED],
      component: PasswordChanged,
      resolveProps: withUrl('/login'),
    },

    [NotificationEvent.PASSWORD_RESET_COMPLETED]: {
      templateName: PasswordResetConfirmed.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.PASSWORD_RESET_COMPLETED],
      component: PasswordResetConfirmed,
      resolveProps: withUrl('/login'),
    },

    [NotificationEvent.ADMIN_PASSWORD_RESET]: {
      templateName: AdminPasswordReset.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.ADMIN_PASSWORD_RESET],
      component: AdminPasswordReset,
      resolveProps: withUrl('/login'),
    },

    [NotificationEvent.ACCOUNT_ALREADY_EXISTS]: {
      templateName: AccountAlreadyExists.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.ACCOUNT_ALREADY_EXISTS],
      component: AccountAlreadyExists,
      resolveProps: (p, base) => ({
        ...p,
        loginUrl: p.loginUrl || `${base}/login`,
        resetUrl: p.resetUrl || `${base}/forgot-password`,
      }),
    },

    [NotificationEvent.SECURITY_LOGIN_ALERT]: {
      templateName: LoginAlert.name,
      subject: EMAIL_SUBJECTS[NotificationEvent.SECURITY_LOGIN_ALERT],
      component: LoginAlert,
      resolveProps: withUrl('/settings/security', 'reviewUrl'),
    },

    [NotificationEvent.URGENT_SECURITY_ALERT]: {
      templateName: SecurityAlert.name,
      subject: (p) =>
        p.alertType === 'IMPOSSIBLE_TRAVEL'
          ? 'CRITICAL SECURITY ALERT: Impossible Travel Detected'
          : 'CRITICAL SECURITY ALERT: Suspicious Activity Detected',
      component: SecurityAlert,
      resolveProps: withUrl('/settings/security', 'lockdownUrl'),
    },
  };
