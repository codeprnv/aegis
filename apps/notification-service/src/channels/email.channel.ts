import { logger } from '@aegis/common';
import * as React from 'react';
import { Resend } from 'resend';
import { EMAIL_TEMPLATE_REGISTRY } from '../config/index.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Aegis Security <noreply@codeprnv.org>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Result returned by sendEmail upon successful dispatch through Resend.
 */
export interface SendEmailResult {
  /** Provider-generated message identifier from Resend. */
  messageId?: string;
  /** Subject line rendered for the transactional email. */
  subject: string;
  /** Canonical name of the React Email template utilized. */
  templateName: string;
}

/**
 * Thrown when an incoming notification event does not map to any known email template.
 * Signals BullMQ to isolate the event without retrying.
 */
export class UnrecognizedEventError extends Error {
  constructor(event: string) {
    super(`No email template configured for event: ${event}`);
    this.name = 'UnrecognizedEventError';
  }
}

/**
 * Thrown when Resend reports a permanent validation or configuration failure
 * (e.g. invalid recipient address, unverified domain, malformed payload).
 * Signals BullMQ to fail the job immediately without retry loops.
 */
export class PermanentDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentDeliveryError';
  }
}

/**
 * Routes incoming notification events to their corresponding React Email templates
 * via the centralized template registry and dispatches them through Resend.
 *
 * @param event - Canonical NotificationEvent identifier
 * @param payload - Event-specific data attributes
 * @returns Resulting message ID, template name, and email subject
 * @throws {PermanentDeliveryError} If payload is malformed or Resend rejects with a permanent 400/422 error
 * @throws {UnrecognizedEventError} If no template is configured for the event
 */
export const sendEmail = async (
  event: string,
  payload: any
): Promise<SendEmailResult> => {
  if (!payload || !payload.email) {
    throw new PermanentDeliveryError(
      `Missing recipient email address for event: ${event}`
    );
  }

  const templateDef = EMAIL_TEMPLATE_REGISTRY[event];
  if (!templateDef) {
    logger.warn(`No email template configured for event: ${event}`);
    throw new UnrecognizedEventError(event);
  }

  logger.info(`Routing email for event: ${event} to ${payload.email}`);

  const subject =
    typeof templateDef.subject === 'function'
      ? templateDef.subject(payload)
      : templateDef.subject;

  const props = templateDef.resolveProps(payload, FRONTEND_URL);
  const reactElement = React.createElement(templateDef.component, props);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: payload.email,
    subject,
    react: reactElement,
  });

  if (error) {
    const statusCode = (error as any).statusCode || (error as any).status;
    const message = error.message || 'Unknown Resend error';

    // 400 Bad Request, 422 Unprocessable Entity (e.g. invalid recipient, domain unverified)
    if (statusCode === 400 || statusCode === 422) {
      throw new PermanentDeliveryError(
        `Permanent Resend delivery failure (${statusCode}): ${message}`
      );
    }

    throw new Error(`Transient Resend API Error: ${message}`);
  }

  logger.info(`Email sent successfully via Resend. Message ID: ${data?.id}`);
  return {
    messageId: data?.id,
    subject,
    templateName: templateDef.templateName,
  };
};
