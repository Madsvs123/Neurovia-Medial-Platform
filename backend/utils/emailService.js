const nodemailer = require('nodemailer');
const { config } = require('../config/config');
const logger = require('winston');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Email sending failed: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(userEmail, username) {
    const subject = 'Welcome to Neurovia - AI-Powered Medical Education';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Neurovia, ${username}!</h2>
        <p>Thank you for joining our AI-powered medical education platform.</p>
        <p>Start your learning journey with cutting-edge medical education tools.</p>
        <p>Best regards,<br/>The Neurovia Team</p>
      </div>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    const resetUrl = `${config.server.baseUrl}/reset-password/${resetToken}`;
    const subject = 'Neurovia - Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>You requested a password reset for your Neurovia account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 15px 0;
        ">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>The Neurovia Team</p>
      </div>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  async sendSubscriptionConfirmation(userEmail, username, planName) {
    const subject = 'Your Neurovia Subscription Confirmation';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Subscription Confirmation</h2>
        <p>Hello ${username},</p>
        <p>Thank you for subscribing to Neurovia ${planName} plan!</p>
        <p>You now have access to premium medical education content and AI tools.</p>
        <p>Best regards,<br/>The Neurovia Team</p>
      </div>
    `;

    return this.sendEmail(userEmail, subject, html);
  }

  async sendProgramAccessEmail(userEmail, username, programName, programCode) {
    const subject = `Access to ${programName} Program on Neurovia`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Program Access Granted</h2>
        <p>Hello ${username},</p>
        <p>You've been granted access to the <strong>${programName}</strong> program on Neurovia.</p>
        <p>Program Code: <strong>${programCode}</strong></p>
        <p>Use this code to unlock exclusive educational content.</p>
        <p>Best regards,<br/>The Neurovia Team</p>
      </div>
    `;

    return this.sendEmail(userEmail, subject, html);
  }
}

module.exports = new EmailService();