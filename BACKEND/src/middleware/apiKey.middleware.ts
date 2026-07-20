import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';

export interface ApiKeyRequest extends Request {
  orgAuth?: {
    organizationId: string;
    createdById: string;
    environment: 'TEST' | 'LIVE';
  };
}

export async function requireApiKey(req: ApiKeyRequest, res: Response, next: NextFunction) {
  try {
    
    let rawKey: string | undefined;

    if (req.headers.authorization) {
      const parts = (req.headers.authorization as string).split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        rawKey = parts[1];
      }
    }

    if (!rawKey) {
      res.status(401).json({ message: "Unauthorized. Missing or invalid Bearer API Key in Authorization header." });
      return;
    }

   
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

   
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: { hashedKey }
    });

    if (!apiKeyRecord) {
      res.status(401).json({ message: "Unauthorized. Invalid API Key." });
      return;
    }

    
    if (apiKeyRecord.revoked) {
      res.status(401).json({ message: "Unauthorized. API Key has been revoked." });
      return;
    }

  
    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      res.status(401).json({ message: "Unauthorized. API Key has expired." });
      return;
    }


    prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => console.error("Failed to update API Key lastUsedAt:", err));

   
    req.orgAuth = {
      organizationId: apiKeyRecord.organizationId,
      createdById: apiKeyRecord.createdById,
      environment: apiKeyRecord.environment,
    };

    next();
  } catch (error) {
    console.error("API Key validation error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
