import { supabase } from "@/src/lib/supabase";
import { ServiceError } from "@/src/services/errors";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export type UserRole = "client" | "professional" | "admin";

export interface SignUpInput {
  email: string;
  password: string;
  full_name: string;
}

export interface SignUpResponse {
  userId: string;
  email: string;
}

interface PublicUserRow {
  id: string;
  email: string;
}

interface RawUserRow {
  id: string;
  email: string;
  full_name?: string | null;
  password_hash?: string;
  role?: string | null;
  created_at?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  role: UserRole;
}

export interface UserSummary {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string | null;
}

function normalizeRole(role: string | null | undefined): UserRole {
  if (role === "admin" || role === "professional") {
    return role;
  }

  return "client";
}

function mapUserRowToSummary(user: RawUserRow): UserSummary {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name ?? null,
    role: normalizeRole(user.role),
    createdAt: user.created_at ?? null,
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, 64).toString("hex");

  const storedBuffer = Buffer.from(storedHash, "hex");
  const derivedBuffer = Buffer.from(derivedHash, "hex");

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedBuffer);
}

export async function signUpUser(input: SignUpInput): Promise<SignUpResponse> {
  const passwordHash = hashPassword(input.password);

  const { data, error } = await supabase
    .schema("public")
    .from("users")
    .insert({
      email: input.email,
      password_hash: passwordHash,
      full_name: input.full_name
    })
    .select("id, email")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ServiceError("Email already exists", 409);
    }
    throw new ServiceError(error.message, 400);
  }

  const user = data as PublicUserRow;
  return {
    userId: user.id,
    email: user.email,
  };
}

export async function loginUser(input: LoginInput): Promise<LoginResponse> {
  const { data, error } = await supabase
    .schema("public")
    .from("users")
    .select("*")
    .eq("email", input.email)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  const user = data as RawUserRow | null;

  if (!user || !user.password_hash) {
    throw new ServiceError("Invalid email or password", 401);
  }

  const isValidPassword = verifyPassword(input.password, user.password_hash);

  if (!isValidPassword) {
    throw new ServiceError("Invalid email or password", 401);
  }

  const { error: updateError } = await supabase
    .schema("public")
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    throw new ServiceError(updateError.message, 500);
  }

  return {
    userId: user.id,
    email: user.email,
    role: normalizeRole(user.role),
  };
}

export async function getUserById(userId: string): Promise<LoginResponse | null> {
  const { data, error } = await supabase
    .schema("public")
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  if (!data) {
    return null;
  }

  const user = data as RawUserRow;

  return {
    userId: user.id,
    email: user.email,
    role: normalizeRole(user.role),
  };
}

export async function getUsers(): Promise<UserSummary[]> {
  const { data, error } = await supabase
    .schema("public")
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  const users = (data ?? []) as RawUserRow[];
  return users.map(mapUserRowToSummary);
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UserSummary> {
  const { data, error } = await supabase
    .schema("public")
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return mapUserRowToSummary(data as RawUserRow);
}
