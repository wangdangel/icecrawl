import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import logger from './logger';

/**
 * Email configuration interface
 */
interface EmailConfig {
  from?: string;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Email service type
 */
type EmailService = 'smtp' | 'ses' | 'console';

// Get email configuration from environment variables
const EMAIL_SERVICE = (process.env.EMAIL_SERVICE || 'console') as EmailService;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

/**
 * Create a transporter based on the email service configuration
 */
function createTransporter() {
  switch (EMAIL_SERVICE) {
    case 'smtp':
      return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

    case 'ses':
      // AWS SES transporter
      return {
        async sendMail(mailOptions: any) {
          const client = new SESClient({ region: AWS_REGION });

          const params = {
            Source: mailOptions.from,
            Destination: {
              ToAddresses: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
            },
            Message: {
              Subject: {
                Data: mailOptions.subject,
              },
              Body: {
                Text: {
                  Data: mailOptions.text,
                },
                ...(mailOptions.html && {
                  Html: {
                    Data: mailOptions.html,
                  },
                }),
              },
            },
          };

          const command = new SendEmailCommand(params);
          await client.send(command);

          return {
            messageId: `ses-${Date.now()}`,
          };
        },
      };

    case 'console':
    default:
      // Console transporter (for development)
      return {
        async sendMail(mailOptions: any) {
          console.log('==========================================');
          console.log('📧 EMAIL SENT (DEVELOPMENT MODE)');
          console.log('------------------------------------------');
          console.log(`From: ${mailOptions.from}`);
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log('------------------------------------------');
          console.log(mailOptions.text);
          console.log('==========================================');

          return {
            messageId: `console-${Date.now()}`,
          };
        },
      };
  }
}

/**
 * Send an email
 *
 * @param config - Email configuration
 * @returns Promise resolving to the message ID
 */
export async function sendEmail(config: EmailConfig): Promise<string> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: config.from || EMAIL_FROM,
      to: config.to,
      subject: config.subject,
      text: config.text,
      html: config.html,
      attachments: config.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info({
      message: 'Email sent',
      to: config.to,
      subject: config.subject,
      messageId: info.messageId,
    });

    return info.messageId;
  } catch (error) {
    logger.error({
      message: 'Error sending email',
      to: config.to,
      subject: config.subject,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error('Failed to send email');
  }
}
