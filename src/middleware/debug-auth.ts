// Teste simples para debugar o middleware de autenticação
import { FastifyRequest, FastifyReply } from 'fastify';

export async function debugAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  console.log('🔍 DEBUG: Middleware executado');
  console.log('🔍 DEBUG: Headers:', request.headers);
  console.log('🔍 DEBUG: Authorization header:', request.headers.authorization);
  
  try {
    // Simular definição do currentUser
    request.currentUser = {
      id: 'test-user-id',
      email: 'test@test.com',
      role: 'affiliate',
      permissions: ['read:profile']
    };
    
    console.log('🔍 DEBUG: currentUser definido:', request.currentUser);
  } catch (error) {
    console.error('🔍 DEBUG: Erro no middleware:', error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DEBUG_ERROR',
        message: 'Erro no middleware de debug'
      }
    });
  }
}

