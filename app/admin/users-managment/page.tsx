"use client";

import { useCallback, useEffect, useState } from "react";

type UserRole = "client" | "professional" | "admin";

interface UserSummary {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string | null;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function UsersManagmentPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSaving, setIsSaving] = useState<string>("");

  const loadUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users", { method: "GET" });
      const payload = (await response.json()) as ApiResponse<UserSummary[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not load users");
      }

      setUsers(payload.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function onRoleChange(userId: string, role: UserRole): Promise<void> {
    setIsSaving(userId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      const payload = (await response.json()) as ApiResponse<UserSummary>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not update role");
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.userId === payload.data?.userId ? payload.data : user
        )
      );
      setSuccess(`Role updated for ${payload.data.email}`);
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSaving("");
    }
  }

  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">Users managment</h2>
      </div>

      {error ? <p className="px-4 pt-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="px-4 pt-4 text-sm text-green-600">{success}</p> : null}
      {isLoading ? <p className="px-4 py-4">Loading users...</p> : null}

      {!isLoading ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t">
                  <td className="px-4 py-3">{user.fullName ?? "-"}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border bg-background px-2 py-1"
                      value={user.role}
                      onChange={(event) =>
                        void onRoleChange(user.userId, event.target.value as UserRole)
                      }
                      disabled={isSaving === user.userId}
                    >
                      <option value="client">client</option>
                      <option value="professional">professional</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
