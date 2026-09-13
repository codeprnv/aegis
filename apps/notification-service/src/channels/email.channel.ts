import { logger } from '@aegis/common';
import {
  AdminPasswordReset,
  EmailVerification,
  PasswordChanged,
  PasswordReset,
  PasswordResetConfirmed,
  WelcomeEmail,
} from '@aegis/email-templates';
import { NotificationEvent } from '@aegis/events';
import * as React from 'react';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Aegis Security <noreply@codeprnv.org>';

export const sendEmail = async (
  event: string,
  payload: any
): Promise<string | undefined> => {
  logger.info(`Routing email for event: ${event} to ${payload.email}`);

  let subject = '';
  let reactElement: React.ReactElement | null = null;

  switch (event) {
    case NotificationEvent.USER_REGISTERED:
      subject = 'Welcome to Aegis Security';
      reactElement = React.createElement(WelcomeEmail, {
        username: payload.username,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      });
      break;
    case NotificationEvent.EMAIL_VERIFICATION_REQUESTED:
      subject = 'Verify Your Identity';
      reactElement = React.createElement(EmailVerification, {
        username: payload.username,
        verificationToken: payload.verificationToken,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${payload.verificationToken}`,
      });
      break;
    case NotificationEvent.PASSWORD_RESET_REQUESTED:
      subject = 'Your Password Reset Code';
      reactElement = React.createElement(PasswordReset, {
        username: payload.username,
        otp: payload.otp,
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
      });
      break;
    case NotificationEvent.PASSWORD_CHANGED:
      subject = 'Your Aegis Password Was Changed';
      reactElement = React.createElement(PasswordChanged, {
        username: payload.username,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      });
      break;
    case NotificationEvent.PASSWORD_RESET_COMPLETED:
      subject = 'Password Reset Completed';
      reactElement = React.createElement(PasswordResetConfirmed, {
        username: payload.username,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      });
      break;
    case NotificationEvent.ADMIN_PASSWORD_RESET:
      subject = 'Your Temporary Password for Aegis';
      reactElement = React.createElement(AdminPasswordReset, {
        username: payload.username,
        temporaryPassword: payload.temporaryPassword,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      });
      break;
    default:
      logger.warn(`No email template configured for event: ${event}`);
      return;
  }

  if (!reactElement) return;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: payload.email,
    subject,
    react: reactElement,
  });

  if (error) {
    throw new Error(`Resend API Error: ${error.message}`);
  }

  logger.info(`Email sent successfully via Resend. Message ID: ${data?.id}`);
  return data?.id;
};
