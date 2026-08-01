import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const { organizationId, name, environment, expiresAt } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!organizationId || !name || !environment) {
      res.status(400).json({ message: "Organization ID, name, and environment are required." });
      return;
    }

    if (environment !== 'TEST' && environment !== 'LIVE') {
      res.status(400).json({ message: "Environment must be TEST or LIVE." });
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

    const envString = environment.toLowerCase();
    const secretBytes = crypto.randomBytes(32).toString('hex');
    const rawKey = `hdr_${envString}_${secretBytes}`;

    const prefix = rawKey;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId,
        createdById: req.user.id,
        name,
        prefix,
        hashedKey,
        environment,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });

    res.status(201).json({
      message: "API Key created successfully. Store this key safely as it will not be shown again.",
      apiKey,
      rawKey
    });

  } catch (error: any) {
    console.error("Create API key error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getApiKeys(req: AuthenticatedRequest, res: Response) {
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

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId,
        revoked: false
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      }
    });

    res.status(200).json({ apiKeys });
  } catch (error: any) {
    console.error("Get API keys error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
