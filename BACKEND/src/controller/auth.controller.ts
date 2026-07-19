import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

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
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../utils/token';

export async function userLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    if (!user.passwordHash) {
      res.status(400).json({ message: "Account requires social login or password is not set." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

   
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

  
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

  
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful.",
      user: userWithoutPassword
    });

  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function userMe(req: Request, res: Response) {
  try {
    const { accessToken, refreshToken } = req.cookies;

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
            sameSite: 'lax',
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