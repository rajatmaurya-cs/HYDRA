import { Response } from 'express';
import crypto from 'crypto';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { appRedis } from '../lib/redis';
import prisma from '../lib/prisma';

export async function createEvent(req: ApiKeyRequest, res: Response) {
  try {
    if (!req.orgAuth) {
      res.status(401).json({ message: "Unauthorized. Missing organization authorization context." });
      return;
    }

    const { organizationId } = req.orgAuth;

    const eventType = req.body.event || req.body.type;
    const payload = req.body.data || req.body.payload || req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    if (!eventType || typeof eventType !== 'string') {
      res.status(400).json({ message: "Invalid request. 'event' or 'type' string field is required in the body." });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ message: "Invalid request. Payload object is required." });
      return;
    }

    
    const rateLimitWindow = Math.floor(Date.now() / 10000);
    const rateLimitKey = `ratelimit:${organizationId}:${rateLimitWindow}`;
    
    const requestsCount = await appRedis.incr(rateLimitKey);
    
    if (requestsCount === 1) {
      await appRedis.expire(rateLimitKey, 10);
    }
    
    if (requestsCount > 1000) {
      res.status(429).json({ message: "Too many requests. Rate limit exceeded." });
      return;
    }

    
    const result = await prisma.$transaction(async (tx) => {
      
      if (idempotencyKey) {
        const existing = await tx.idempotencyKey.findUnique({
          where: { key: idempotencyKey },
        });

        if (existing) {
          return {
            duplicate: true,
            eventId: existing.eventId,
          };
        }
      }

      
      const event = await tx.event.create({
        data: {
          organizationId,
          eventType,
          payload,
          idempotencyKey: idempotencyKey || undefined,
          status: 'PENDING',
        },
      });

      
      if (idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            eventId: event.id,
          },
        });
      }

      
      await tx.outbox.create({
        data: {
          eventId: event.id,
          status: 'PENDING',
        },
      });

      return {
        duplicate: false,
        eventId: event.id,
      };
    });

    if (result.duplicate) {
      res.status(202).json({
        message: "Duplicate request. Event already accepted.",
        eventId: result.eventId,
        duplicate: true,
      });
      return;
    }

    res.status(202).json({
      message: "Event accepted and queued for processing.",
      eventId: result.eventId,
      duplicate: false,
    });

  } catch (error: any) {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    
    if (error?.code === 'P2002' && idempotencyKey) {
      try {
        const existingKey = await prisma.idempotencyKey.findUnique({
          where: { key: idempotencyKey },
        });

        if (existingKey) {
          res.status(202).json({
            message: "Duplicate request. Event already accepted.",
            eventId: existingKey.eventId,
            duplicate: true,
          });
          return;
        }
      } catch (lookupError) {
        console.error("Error looking up duplicate idempotency key after P2002 race condition:", lookupError);
      }
    }

    console.error("Create event transactional ingestion error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getOrganizationEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const { organizationId } = req.query;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!organizationId || typeof organizationId !== 'string') {
      res.status(400).json({ message: "Organization ID is required." });
      return;
    }

    
    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        createdById: req.user.id,
      },
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden or Organization not found." });
      return;
    }

    
    const events = await prisma.event.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      include: {
        webhookDeliveries: {
          select: {
            id: true,
            status: true,
            endpoint: {
              select: {
                id: true,
                name: true,
                url: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      events,
    });

  } catch (error: any) {
    console.error("Get organization events error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
