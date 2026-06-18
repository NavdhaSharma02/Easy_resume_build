import { Router } from "express";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const signupSchema = credentialsSchema.extend({
  name: z.string().min(2)
});

router.post("/signup", validate(signupSchema), async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (existing) return res.status(409).json({ message: "Email already registered" });

  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      password: await hashPassword(req.body.password)
    }
  });
  const token = signToken({ userId: user.id, email: user.email });

  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/login", validate(credentialsSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || !(await verifyPassword(req.body.password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
