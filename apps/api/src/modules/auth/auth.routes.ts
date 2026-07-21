import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/authentication.js';
import { AuthController } from './auth.controller.js';

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
    handler: controller.register.bind(controller),
  });

  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: controller.login.bind(controller),
  });

  app.post('/logout', {
    preHandler: [requireAuth],
    handler: controller.logout.bind(controller),
  });

  app.get('/session', {
    preHandler: [requireAuth],
    handler: controller.session.bind(controller),
  });

  /**
   * Returns a CSRF token for the current session.
   * The client needs this because the session cookie is HttpOnly (not readable from JS).
   */
  app.get('/csrf', {
    preHandler: [requireAuth],
    handler: controller.csrf.bind(controller),
  });
}
