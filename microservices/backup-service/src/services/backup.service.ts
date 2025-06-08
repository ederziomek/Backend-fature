import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { backupConfig } from '../config/config';

const execAsync = promisify(exec);

export interface BackupResult {
  id: string;
  type: 'database' | 'files' | 'logs' | 'full';
  status: 'success' | 'failed' | 'in_progress';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size?: number;
  location: string;
  error?: string;
}

export class BackupService {
  private backups: BackupResult[] = [];

  constructor() {
    this.ensureBackupDirectory();
  }

  async initialize(): Promise<void> {
    try {
      await this.ensureBackupDirectory();
      console.log('✅ Backup Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Backup Service:', error);
      throw error;
    }
  }

  // Backup do banco de dados
  async backupDatabase(): Promise<BackupResult> {
    const backupId = this.generateBackupId('db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database_backup_${timestamp}.sql`;
    const backupPath = path.join(backupConfig.backup.location, filename);

    const backup: BackupResult = {
      id: backupId,
      type: 'database',
      status: 'in_progress',
      startTime: new Date(),
      location: backupPath,
    };

    this.backups.push(backup);

    try {
      console.log(`🗄️ Starting database backup: ${backupId}`);

      // Comando pg_dump para PostgreSQL
      const dumpCommand = `pg_dump ${backupConfig.database.url} > ${backupPath}`;
      
      await execAsync(dumpCommand);

      // Verificar se o arquivo foi criado
      const stats = await fs.stat(backupPath);
      
      backup.status = 'success';
      backup.endTime = new Date();
      backup.duration = backup.endTime.getTime() - backup.startTime.getTime();
      backup.size = stats.size;

      console.log(`✅ Database backup completed: ${backupId} (${this.formatSize(stats.size)})`);

      // Comprimir backup se configurado
      if (backupConfig.backup.compress) {
        await this.compressBackup(backupPath);
      }

      return backup;
    } catch (error) {
      backup.status = 'failed';
      backup.endTime = new Date();
      backup.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Database backup failed: ${backupId}`, error);
      return backup;
    }
  }

  // Backup de arquivos de log
  async backupLogs(): Promise<BackupResult> {
    const backupId = this.generateBackupId('logs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `logs_backup_${timestamp}.tar.gz`;
    const backupPath = path.join(backupConfig.backup.location, filename);

    const backup: BackupResult = {
      id: backupId,
      type: 'logs',
      status: 'in_progress',
      startTime: new Date(),
      location: backupPath,
    };

    this.backups.push(backup);

    try {
      console.log(`📋 Starting logs backup: ${backupId}`);

      // Comprimir logs
      const tarCommand = `tar -czf ${backupPath} ${backupConfig.logs.location}`;
      
      await execAsync(tarCommand);

      // Verificar se o arquivo foi criado
      const stats = await fs.stat(backupPath);
      
      backup.status = 'success';
      backup.endTime = new Date();
      backup.duration = backup.endTime.getTime() - backup.startTime.getTime();
      backup.size = stats.size;

      console.log(`✅ Logs backup completed: ${backupId} (${this.formatSize(stats.size)})`);

      return backup;
    } catch (error) {
      backup.status = 'failed';
      backup.endTime = new Date();
      backup.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Logs backup failed: ${backupId}`, error);
      return backup;
    }
  }

  // Backup completo
  async fullBackup(): Promise<BackupResult> {
    const backupId = this.generateBackupId('full');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full_backup_${timestamp}.tar.gz`;
    const backupPath = path.join(backupConfig.backup.location, filename);

    const backup: BackupResult = {
      id: backupId,
      type: 'full',
      status: 'in_progress',
      startTime: new Date(),
      location: backupPath,
    };

    this.backups.push(backup);

    try {
      console.log(`🎯 Starting full backup: ${backupId}`);

      // Primeiro fazer backup do banco
      const dbBackup = await this.backupDatabase();
      if (dbBackup.status === 'failed') {
        throw new Error('Database backup failed');
      }

      // Depois backup dos logs
      const logsBackup = await this.backupLogs();
      if (logsBackup.status === 'failed') {
        throw new Error('Logs backup failed');
      }

      // Criar arquivo completo
      const tempDir = path.join(backupConfig.backup.location, `temp_${timestamp}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Copiar backups para diretório temporário
      await fs.copyFile(dbBackup.location, path.join(tempDir, path.basename(dbBackup.location)));
      await fs.copyFile(logsBackup.location, path.join(tempDir, path.basename(logsBackup.location)));

      // Comprimir tudo
      const tarCommand = `tar -czf ${backupPath} -C ${tempDir} .`;
      await execAsync(tarCommand);

      // Limpar arquivos temporários
      await fs.rm(tempDir, { recursive: true });
      await fs.unlink(dbBackup.location);
      await fs.unlink(logsBackup.location);

      // Verificar arquivo final
      const stats = await fs.stat(backupPath);
      
      backup.status = 'success';
      backup.endTime = new Date();
      backup.duration = backup.endTime.getTime() - backup.startTime.getTime();
      backup.size = stats.size;

      console.log(`✅ Full backup completed: ${backupId} (${this.formatSize(stats.size)})`);

      return backup;
    } catch (error) {
      backup.status = 'failed';
      backup.endTime = new Date();
      backup.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Full backup failed: ${backupId}`, error);
      return backup;
    }
  }

  // Restaurar backup
  async restoreDatabase(backupPath: string): Promise<boolean> {
    try {
      console.log(`🔄 Starting database restore from: ${backupPath}`);

      // Verificar se o arquivo existe
      await fs.access(backupPath);

      // Comando psql para restaurar
      const restoreCommand = `psql ${backupConfig.database.url} < ${backupPath}`;
      
      await execAsync(restoreCommand);

      console.log(`✅ Database restore completed from: ${backupPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Database restore failed:`, error);
      return false;
    }
  }

  // Listar backups
  async listBackups(): Promise<BackupResult[]> {
    return [...this.backups].sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    );
  }

  // Obter backup por ID
  async getBackup(backupId: string): Promise<BackupResult | null> {
    return this.backups.find(backup => backup.id === backupId) || null;
  }

  // Limpar backups antigos
  async cleanupOldBackups(): Promise<void> {
    try {
      const retentionDays = backupConfig.backup.retentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const backupsToDelete = this.backups.filter(backup => 
        backup.startTime < cutoffDate && backup.status === 'success'
      );

      for (const backup of backupsToDelete) {
        try {
          await fs.unlink(backup.location);
          console.log(`🗑️ Deleted old backup: ${backup.id}`);
        } catch (error) {
          console.warn(`⚠️ Could not delete backup file: ${backup.location}`);
        }
      }

      // Remover da lista
      this.backups = this.backups.filter(backup => 
        backup.startTime >= cutoffDate || backup.status !== 'success'
      );

      console.log(`🧹 Cleanup completed. Deleted ${backupsToDelete.length} old backups`);
    } catch (error) {
      console.error('❌ Error during backup cleanup:', error);
    }
  }

  // Verificar integridade do backup
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // Verificar se o arquivo existe e não está corrompido
      const stats = await fs.stat(backupPath);
      
      if (stats.size === 0) {
        return false;
      }

      // Para arquivos .sql, verificar se contém estrutura válida
      if (backupPath.endsWith('.sql')) {
        const content = await fs.readFile(backupPath, 'utf-8');
        return content.includes('CREATE TABLE') || content.includes('INSERT INTO');
      }

      // Para arquivos .tar.gz, verificar se podem ser listados
      if (backupPath.endsWith('.tar.gz')) {
        const listCommand = `tar -tzf ${backupPath}`;
        await execAsync(listCommand);
        return true;
      }

      return true;
    } catch (error) {
      console.error(`❌ Backup verification failed for ${backupPath}:`, error);
      return false;
    }
  }

  // Agendar backups automáticos
  startAutomaticBackups(): void {
    if (!backupConfig.backup.enabled) {
      console.log('📅 Automatic backups are disabled');
      return;
    }

    const interval = this.parseInterval(backupConfig.backup.interval);
    
    setInterval(async () => {
      try {
        console.log('📅 Starting scheduled backup...');
        await this.fullBackup();
        await this.cleanupOldBackups();
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    }, interval);

    console.log(`📅 Automatic backups scheduled every ${backupConfig.backup.interval}`);
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(backupConfig.backup.location, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create backup directory:', error);
      throw error;
    }
  }

  private async compressBackup(filePath: string): Promise<void> {
    try {
      const compressedPath = `${filePath}.gz`;
      const compressCommand = `gzip ${filePath}`;
      
      await execAsync(compressCommand);
      
      console.log(`🗜️ Backup compressed: ${compressedPath}`);
    } catch (error) {
      console.warn('⚠️ Failed to compress backup:', error);
    }
  }

  private generateBackupId(type: string): string {
    return `backup_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([hmd])$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default: 24 horas
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000; // horas
      case 'd': return value * 24 * 60 * 60 * 1000; // dias
      case 'm': return value * 60 * 1000; // minutos
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

