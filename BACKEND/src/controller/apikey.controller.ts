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

    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        createdById: req.user.id,
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden. Organization not found or access denied." });
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

    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        createdById: req.user.id,
      }
    });

    if (!org) {
      res.status(403).json({ message: "Forbidden. Organization not found or access denied." });
      return;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        expiresAt: true,
        lastUsedAt: true,
        revoked: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({ apiKeys });
  } catch (error: any) {
    console.error("Get API keys error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function revokeApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const keyIdParam = req.params.keyId;
    const keyId = Array.isArray(keyIdParam) ? keyIdParam[0] : keyIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!keyId) {
      res.status(400).json({ message: "API Key ID is required." });
      return;
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        organization: {
          createdById: req.user.id,
        }
      }
    });

    if (!apiKey) {
      res.status(404).json({ message: "API Key not found or access denied." });
      return;
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true }
    });

    res.status(200).json({
      message: "API Key revoked successfully.",
      apiKey: updatedKey
    });

  } catch (error: any) {
    console.error("Revoke API key error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function rotateApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const keyIdParam = req.params.keyId;
    const keyId = Array.isArray(keyIdParam) ? keyIdParam[0] : keyIdParam;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!keyId) {
      res.status(400).json({ message: "API Key ID is required." });
      return;
    }

    const oldKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        organization: {
          createdById: req.user.id,
        }
      }
    });

    if (!oldKey) {
      res.status(404).json({ message: "API Key not found or access denied." });
      return;
    }

    
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true }
    });

    
    const envString = oldKey.environment.toLowerCase();
    const secretBytes = crypto.randomBytes(32).toString('hex');
    const rawKey = `hdr_${envString}_${secretBytes}`;
    const prefix = rawKey;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const newKey = await prisma.apiKey.create({
      data: {
        organizationId: oldKey.organizationId,
        createdById: req.user.id,
        name: `${oldKey.name} (Rotated)`,
        prefix,
        hashedKey,
        environment: oldKey.environment,
        expiresAt: oldKey.expiresAt,
      }
    });

    res.status(200).json({
      message: "API Key rotated successfully. Old key has been revoked.",
      newKey,
      rawKey
    });

  } catch (error: any) {
    console.error("Rotate API key error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
