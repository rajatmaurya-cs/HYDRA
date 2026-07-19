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