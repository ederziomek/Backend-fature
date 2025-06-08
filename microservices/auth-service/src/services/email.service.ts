import nodemailer from 'nodemailer';
import { config } from '@/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Inicializa o transportador de email
   */
  static async initialize(): Promise<void> {
    // Configuração para desenvolvimento (usar Ethereal Email para testes)
    if (config.server.isDevelopment) {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } else {
      // Configuração para produção (usar variáveis de ambiente)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Verificar conexão
    try {
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
  }

  /**
   * Envia um email
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      await this.initialize();
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Fature100x" <noreply@fature100x.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (config.server.isDevelopment) {
        console.log('📧 Email sent:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error('Falha ao enviar email');
    }
  }

  /**
   * Envia email de verificação
   */
  static async sendEmailVerification(email: string, token: string, name: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verificação de Email - Fature100x</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fature100x</h1>
          </div>
          <div class="content">
            <h2>Olá, ${name}!</h2>
            <p>Obrigado por se cadastrar no Fature100x. Para completar seu cadastro, precisamos verificar seu endereço de email.</p>
            <p>Clique no botão abaixo para verificar seu email:</p>
            <a href="${verificationUrl}" class="button">Verificar Email</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>Este link expira em 24 horas.</p>
            <p>Se você não se cadastrou no Fature100x, pode ignorar este email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Fature100x. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Olá, ${name}!
      
      Obrigado por se cadastrar no Fature100x. Para completar seu cadastro, precisamos verificar seu endereço de email.
      
      Acesse este link para verificar seu email: ${verificationUrl}
      
      Este link expira em 24 horas.
      
      Se você não se cadastrou no Fature100x, pode ignorar este email.
      
      Fature100x Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verificação de Email - Fature100x',
      html,
      text,
    });
  }

  /**
   * Envia email de reset de senha
   */
  static async sendPasswordReset(email: string, token: string, name: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset de Senha - Fature100x</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fature100x</h1>
          </div>
          <div class="content">
            <h2>Olá, ${name}!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no Fature100x.</p>
            <div class="warning">
              <strong>⚠️ Importante:</strong> Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá inalterada.
            </div>
            <p>Para redefinir sua senha, clique no botão abaixo:</p>
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
            <p>Ou copie e cole este link no seu navegador:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>Este link expira em 1 hora por motivos de segurança.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Fature100x. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Olá, ${name}!
      
      Recebemos uma solicitação para redefinir a senha da sua conta no Fature100x.
      
      ⚠️ IMPORTANTE: Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá inalterada.
      
      Para redefinir sua senha, acesse este link: ${resetUrl}
      
      Este link expira em 1 hora por motivos de segurança.
      
      Fature100x Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset de Senha - Fature100x',
      html,
      text,
    });
  }
}

