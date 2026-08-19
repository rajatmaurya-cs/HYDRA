import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const MAX_OUTBOX_PENDING_LIMIT = parseInt(process.env.MAX_OUTBOX_PENDING_LIMIT || '10000', 10);

export async function requireBackpressure(req: Request, res: Response, next: NextFunction) {
  try {
    const pendingOutboxCount = await prisma.outbox.count({
      where: { status: 'PENDING' },
    });

    if (pendingOutboxCount >= MAX_OUTBOX_PENDING_LIMIT) {
      res.setHeader('Retry-After', '5');
      res.status(503).json({
        error: 'BACKPRESSURE_LIMIT_EXCEEDED',
        message: 'System ingestion backlog is full. Please retry in 5 seconds.',
        retryAfterSeconds: 5,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Backpressure middleware error:', error);
    next();
  }
}
