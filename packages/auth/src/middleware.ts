import { getToken } from "next-auth/jwt";
import { SignJWT } from "jose";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

export async function generateJWT(user: AuthUser): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

  const jwt = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  return jwt;
}

export async function getNextAuthToken(
  req: Request | { headers: Headers | Record<string, string> },
) {
  return await getToken({
    req: req,
    secret: process.env.AUTH_SECRET,
  });
}
