import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "brewgo-secret-change-me";
const JWT_EXPIRES = "7d";

// REGISTER
router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, phone, password, firstName, lastName } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (!email && !phone) {
      return res.status(400).json({ error: "Email or phone is required" });
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(usersTable)
      .where(
        or(
          email ? eq(usersTable.email, email) : undefined,
          phone ? eq(usersTable.phone, phone) : undefined
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email || null,
        phone: phone || null,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
      })
      .returning();

    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// LOGIN
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ error: "Email/phone and password required" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          email ? eq(usersTable.email, email) : undefined,
          phone ? eq(usersTable.phone, phone) : undefined
        )
      )
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;