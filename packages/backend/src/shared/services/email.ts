import nodemailer from 'nodemailer';
import { env } from '../../config';
import { logger } from '../logger';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    if (!env.smtp.user) {
      logger.warn('SMTP not configured, skipping email');
      return false;
    }

    await transporter.sendMail({
      from: env.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info({ to: options.to, subject: options.subject }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err, to: options.to }, 'Failed to send email');
    return false;
  }
};

export const sendSettlementNotification = async (
  to: string,
  fromName: string,
  amount: string,
  groupName: string
): Promise<boolean> => {
  return sendEmail({
    to,
    subject: `${fromName} settled up in ${groupName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Settlement Received</h2>
        <p><strong>${fromName}</strong> paid you <strong>${amount}</strong> in <strong>${groupName}</strong>.</p>
        <p>Log in to view details and confirm the payment.</p>
      </div>
    `,
  });
};

export const sendBudgetAlert = async (
  to: string,
  categoryName: string,
  percentage: number,
  limit: string
): Promise<boolean> => {
  return sendEmail({
    to,
    subject: `Budget Alert: ${categoryName} at ${Math.round(percentage * 100)}%`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Budget Alert</h2>
        <p>Your <strong>${categoryName}</strong> budget has reached <strong>${Math.round(percentage * 100)}%</strong> of the ${limit} limit.</p>
        <p>Consider reviewing your spending in this category.</p>
      </div>
    `,
  });
};
