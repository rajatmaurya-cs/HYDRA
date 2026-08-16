import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../utils/token';

export async function userRegister(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
       res.status(400).json({ message: "All fields (name, email, password) are required." });
       return;
    }

    if (password.length < 6) {
       res.status(400).json({ message: "Password must be at least 6 characters long." });
       return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
       res.status(409).json({ message: "A user with this email already exists." });
       return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "User registered successfully.",
      user: userWithoutPassword
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function userLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    console.log(`Request Reached the Backend Email ${email} & Password: ${password}`)

    console.log("✅ 1 ")

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    console.log("✅ 2 ")

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    console.log("✅ 3 ")

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    console.log("✅ 4 ")

    if (!user.passwordHash) {
      res.status(400).json({ message: "Account requires social login or password is not set." });
      return;
    }

    console.log("✅ 5 ")

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    console.log("✅ 6 ")

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);


    console.log("✅ 7 ")

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });

    console.log("✅ 8 ")

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful.",
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });

  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function userMe(req: Request, res: Response) {
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
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      user: userWithoutPassword
    });

  } catch (error: any) {
    console.error("Auth verification error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function userLogout(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };

    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function userRefreshToken(req: Request, res: Response) {
  try {
    const refreshToken = req.cookies?.refreshToken || (req.headers["x-refresh-token"] as string) || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: "Missing refresh token." });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({ message: "Invalid or expired refresh token." });
      return;
    }

    const dbRefreshToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!dbRefreshToken || dbRefreshToken.expiresAt <= new Date()) {
      res.status(401).json({ message: "Refresh token has expired or was revoked." });
      return;
    }

    const newAccessToken = generateAccessToken(decoded.userId);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      message: "Access token refreshed successfully.",
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}