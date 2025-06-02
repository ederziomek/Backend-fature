import { FastifyInstance } from 'fastify';
import { debugAuthMiddleware } from '@/middleware/debug-auth';

export async function testRoutes(fastify: FastifyInstance) {
  // Endpoint de teste simples
  fastify.get('/test-simple', async (request, reply) => {
    return { success: true, message: 'Endpoint simples funcionando' };
  });

  // Endpoint de teste com middleware
  fastify.get('/test-auth', {
    preHandler: debugAuthMiddleware
  }, async (request, reply) => {
    return { 
      success: true, 
      message: 'Endpoint com middleware funcionando',
      currentUser: request.currentUser 
    };
  });
}

