import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      organizationId,
      name,
      url,
      description,
      timeoutSeconds,
      maxRetries,
      retryStrategy,
      verifySSL,
      subscribedEvents
    } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!organizationId || !name || !url) {
      res.status(400).json({ message: "Organization ID, name, and URL are required." });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.id,
        }
      }
    });

    if (!membership) {
      res.status(403).json({ message: "Forbidden. You are not a member of this organization." });
      return;
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const endpoint = await prisma.endpoint.create({
      data: {
        organizationId,
        name,
        url,
        description: description || undefined,
        secret,
        timeoutSeconds: timeoutSeconds ? parseInt(timeoutSeconds) : undefined,
        maxRetries: maxRetries ? parseInt(maxRetries) : undefined,
        retryStrategy: retryStrategy || undefined,
        verifySSL: verifySSL !== undefined ? !!verifySSL : undefined,
        subscribedEvents: Array.isArray(subscribedEvents) ? subscribedEvents : [],
      }
    });

    res.status(201).json({
      message: "Endpoint created successfully.",
      endpoint
    });

  } catch (error: any) {
    console.error("Create endpoint error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getEndpoints(req: AuthenticatedRequest, res: Response) {
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

    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.id,
        }
      }
    });

    if (!membership) {
      res.status(403).json({ message: "Forbidden. You are not a member of this organization." });
      return;
    }

    const endpoints = await prisma.endpoint.findMany({
      where: { organizationId }
    });

    res.status(200).json({ endpoints });
  } catch (error: any) {
    console.error("Get endpoints error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
