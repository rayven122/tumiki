import { db } from "@tumiki/db/server";
import { NextResponse } from "next/server";
import { createKeycloakUser } from "~/lib/keycloak-admin";

/**
 * ユーザー登録リクエストボディ型
 */
type RegisterRequestBody = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

/**
 * POST /api/auth/register
 * 新規ユーザー登録API
 *
 * Keycloakとデータベース両方にユーザーを作成します
 */
export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as RegisterRequestBody;
    const { email, password, firstName, lastName } = body;

    // バリデーション
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // パスワード強度チェック（最小8文字、大文字小文字数字記号を含む）
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter" },
        { status: 400 },
      );
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one lowercase letter" },
        { status: 400 },
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number" },
        { status: 400 },
      );
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one special character" },
        { status: 400 },
      );
    }

    // 既存ユーザーチェック
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    // 1. Keycloakにユーザーを作成
    const keycloakResult = await createKeycloakUser(
      email,
      password,
      firstName,
      lastName,
    );

    if (!keycloakResult.success || !keycloakResult.userId) {
      return NextResponse.json(
        {
          error: keycloakResult.error ?? "Failed to create user in Keycloak",
        },
        { status: 500 },
      );
    }

    // 2. データベースにユーザーを作成
    // Note: Accountレコードは NextAuth.js が初回ログイン時に自動作成するため、
    // ここでは User レコードのみを作成します
    const name = `${firstName} ${lastName}`;
    const user = await db.user.create({
      data: {
        id: keycloakResult.userId,
        email,
        name,
        emailVerified: new Date(), // Keycloakで既に検証済みとして作成
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
};
