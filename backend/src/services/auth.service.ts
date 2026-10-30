import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../lib/errors";
import { userRepository } from "../repositories/user.repository";

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) throw new UnauthorizedError("Invalid email or password");

    const token = jwt.sign({ email: user.email, role: user.role }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  },
};