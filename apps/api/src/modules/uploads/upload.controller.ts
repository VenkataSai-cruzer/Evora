import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class UploadController {
  async uploadPoster(request: FastifyRequest, _reply: FastifyReply) {
    // R2 storage will be implemented in Phase 12
    // For now, accept objectKey and update the event
    const { eventId } = request.params as { eventId: string };
    const { objectKey } = request.body as { objectKey: string };

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { posterObjectKey: objectKey },
    });

    return { event };
  }

  async uploadBranding(request: FastifyRequest, _reply: FastifyReply) {
    const { eventId } = request.params as { eventId: string };
    const body = request.body as {
      venueLogoObjectKey?: string;
      primaryLogoObjectKey?: string;
      footerArtworkObjectKey?: string;
    };

    const branding = await prisma.eventBranding.upsert({
      where: { eventId },
      update: body,
      create: { eventId, ...body },
    });

    return { branding };
  }

  async uploadTemplate(request: FastifyRequest, reply: FastifyReply) {
    const { eventId } = request.params as { eventId: string };
    const body = request.body as {
      sourceObjectKey: string;
      width: number;
      height: number;
    };

    // Get current max version
    const latest = await prisma.ticketTemplate.findFirst({
      where: { eventId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latest?.version || 0) + 1;

    // Deactivate previous active template
    await prisma.ticketTemplate.updateMany({
      where: { eventId, active: true },
      data: { active: false },
    });

    const template = await prisma.ticketTemplate.create({
      data: {
        eventId,
        version: newVersion,
        sourceObjectKey: body.sourceObjectKey,
        width: body.width,
        height: body.height,
        active: true,
      },
    });

    return reply.status(201).send({ template });
  }
}
