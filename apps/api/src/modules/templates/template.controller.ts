import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';

export class TemplateController {
  async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    const { templateId } = request.params as { templateId: string };

    const template = await prisma.ticketTemplate.findUnique({
      where: { id: templateId },
      include: { fields: true },
    });

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return { template };
  }

  async updateFields(request: FastifyRequest, reply: FastifyReply) {
    const { templateId } = request.params as { templateId: string };
    const body = request.body as {
      fields: Array<{
        id?: string;
        fieldName: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fontFamily?: string;
        fontSize?: number;
        minimumFontSize?: number;
        fontWeight?: string;
        alignment?: string;
        textTransform?: string;
        color?: string;
        visible?: boolean;
      }>;
    };

    const template = await prisma.ticketTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (template.lockedAt) {
      return reply.status(400).send({ error: 'Template is locked and cannot be modified' });
    }

    // Delete existing fields and recreate
    await prisma.ticketTemplateField.deleteMany({
      where: { templateId },
    });

    const fields = await Promise.all(
      body.fields.map((f) =>
        prisma.ticketTemplateField.create({
          data: {
            templateId,
            fieldName: f.fieldName,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            fontFamily: f.fontFamily || 'Inter',
            fontSize: f.fontSize || 24,
            minimumFontSize: f.minimumFontSize || 10,
            fontWeight: f.fontWeight || 'normal',
            alignment: f.alignment || 'left',
            textTransform: f.textTransform || 'none',
            color: f.color || '#000000',
            visible: f.visible !== false,
          },
        }),
      ),
    );

    return { template: { ...template, fields } };
  }

  async lockTemplate(request: FastifyRequest, _reply: FastifyReply) {
    const { templateId } = request.params as { templateId: string };

    const template = await prisma.ticketTemplate.update({
      where: { id: templateId },
      data: { lockedAt: new Date() },
    });

    return { template };
  }
}
