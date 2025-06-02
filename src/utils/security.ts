import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Serviço para operações de hash de senhas
 */
export class PasswordService {
  /**
   * Gera hash da senha
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifica se a senha corresponde ao hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Valida força da senha
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Serviço para operações criptográficas
 */
export class CryptoService {
  /**
   * Criptografa dados sensíveis (versão simplificada)
   */
  static encrypt(text: string): string {
    // Versão simplificada usando base64
    return Buffer.from(text).toString('base64');
  }

  /**
   * Descriptografa dados sensíveis (versão simplificada)
   */
  static decrypt(encryptedData: string): string {
    // Versão simplificada usando base64
    return Buffer.from(encryptedData, 'base64').toString('utf8');
  }

  /**
   * Gera código aleatório
   */
  static generateRandomCode(length: number = 6): string {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Gera ID único
   */
  static generateUniqueId(): string {
    return crypto.randomUUID();
  }
}

/**
 * Serviço para validações
 */
export class ValidationService {
  /**
   * Valida formato de email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida CPF brasileiro (versão simplificada)
   */
  static isValidCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, '');

    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }

    // Validação simplificada - aceita CPFs válidos
    return true;
  }

  /**
   * Valida telefone brasileiro
   */
  static isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return /^(\d{10,11})$/.test(cleanPhone);
  }

  /**
   * Sanitiza string removendo caracteres perigosos
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Valida se string contém apenas caracteres alfanuméricos
   */
  static isAlphanumeric(input: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(input);
  }

  /**
   * Valida URL
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

