import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from '../utils/token';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const cookieAccessToken = req.cookies?.accessToken;
    const headerAccessToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
    const accessToken = cookieAccessToken || headerAccessToken;

    const cookieRefreshToken = req.cookies?.refreshToken;
    const headerRefreshToken = (req.headers["x-refresh-token"] as string) || req.body?.refreshToken;
    const refreshToken = cookieRefreshToken || headerRefreshToken;

    let userId: string | null = null;

    if (accessToken) {
      const decodedAccess = verifyAccessToken(accessToken);
      if (decodedAccess) {
        userId = decodedAccess.userId;
      }
    }

    if (!userId && refreshToken) {
      const decodedRefresh = verifyRefreshToken(refreshToken);
      if (decodedRefresh) {
        const dbRefreshToken = await prisma.refreshToken.findUnique({
          where: { token: refreshToken }
        });

        if (dbRefreshToken && dbRefreshToken.expiresAt > new Date()) {
          userId = decodedRefresh.userId;

          const newAccessToken = generateAccessToken(userId);
          const isProduction = process.env.NODE_ENV === 'production';

          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000,
          });
        }
      }
    }

    if (!userId) {
       res.status(401).json({ message: "Unauthorized. Please log in." });
       return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
       res.status(401).json({ message: "User session not found." });
       return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Unauthorized." });
  }
}
