import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../infrastructure/database/prisma.js';
import {
  generateSessionToken,
  hashToken,
} from '../../middleware/authentication.js';
import { generateCsrfToken } from '../../middleware/csrf.js';

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const { name, email, password } = request.body as {
      name: string;
      email: string;
      password: string;
    };

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'ATTENDEE' },
      select: { id: true, name: true, email: true, role: true },
    });

    // Create session
    const sessionToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const csrfToken = generateCsrfToken(sessionToken);

    reply.setCookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(201).send({
      user,
      csrfToken,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Create session
    const sessionToken = generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const csrfToken = generateCsrfToken(sessionToken);

    reply.setCookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrfToken,
    });
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const sessionToken = request.cookies?.session_token;
    if (sessionToken) {
      const tokenHash = hashToken(sessionToken);
      await prisma.session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    reply.clearCookie('session_token', { path: '/' });
    return reply.send({ message: 'Logged out' });
  }

  async session(request: FastifyRequest, _reply: FastifyReply) {
    return {
      user: request.user,
    };
  }

  async csrf(request: FastifyRequest, _reply: FastifyReply) {
    const sessionToken = request.cookies?.session_token;
    if (!sessionToken) {
      return { csrfToken: null };
    }
    return {
      csrfToken: generateCsrfToken(sessionToken),
    };
  }
}
