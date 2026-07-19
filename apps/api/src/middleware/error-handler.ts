import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id;

  // Zod validation errors
  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    return reply.status(422).send({
      error: 'Validation failed',
      fieldErrors,
      requestId,
    });
  }

  // Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(422).send({
      error: 'Validation failed',
      details: error.validation,
      requestId,
    });
  }

  // Rate limit errors
  if ('statusCode' in error && error.statusCode === 429) {
    return reply.status(429).send({
      error: 'Too many requests',
      message: error.message,
      requestId,
    });
  }

  // Log unexpected errors
  request.log.error({ err: error, requestId }, 'Unhandled error');

  return reply.status(500).send({
    error: 'Internal server error',
    requestId,
  });
}
