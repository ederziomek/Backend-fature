/**
 * Interface base para eventos
 */
export interface Event {
  /**
   * Identificador único do evento
   */
  id: string;
  
  /**
   * Tópico/assunto do evento (ex: 'user:created')
   */
  subject: string;
  
  /**
   * Versão do evento para compatibilidade
   */
  version: number;
  
  /**
   * Data/hora de criação do evento
   */
  timestamp: string;
  
  /**
   * Payload do evento
   */
  data: any;
  
  /**
   * Metadados opcionais
   */
  metadata?: {
    /**
     * ID para rastreamento distribuído
     */
    correlationId?: string;
    
    /**
     * Serviço de origem
     */
    source?: string;
    
    /**
     * Outros metadados
     */
    [key: string]: any;
  };
}

