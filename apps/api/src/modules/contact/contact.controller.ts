import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class ContactController {
  /**
   * POST /contact
   *
   * Submit a contact form message (no auth required).
   * Rate-limited by the global rate limiter (100 req/min).
   */
  async submit(request: FastifyRequest, reply: FastifyReply) {
    const { name, email, subject, message } = request.body as {
      name: string;
      email: string;
      subject: string;
      message: string;
    };

    if (!name || !email || !subject || !message) {
      return reply.status(400).send({
        error: 'name, email, subject, and message are required',
      });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' });
    }

    const contact = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    return reply.status(201).send({
      message: 'Message received. We will get back to you soon.',
      id: contact.id,
    });
  }
}
