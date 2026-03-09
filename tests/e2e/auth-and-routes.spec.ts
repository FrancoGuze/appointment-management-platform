import { expect, test } from "@playwright/test";

function randomEmail(): string {
  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `e2e_${token}@example.test`;
}

function expectRedirectLocation(
  location: string | undefined,
  expectedPath: string
): void {
  expect(location).toBeTruthy();
  const parsed = new URL(location!, "http://127.0.0.1:3000");
  expect(parsed.pathname).toBe(expectedPath);
}

test.describe("Auth and route protections", () => {
  test("GET /api/users/me returns 401 for guest", async ({ request }) => {
    const response = await request.get("/api/users/me");
    expect(response.status()).toBe(401);

    const payload = (await response.json()) as { ok?: boolean };
    expect(payload.ok).toBe(false);
  });

  test("signup creates session and allows /api/users/me", async ({ request }) => {
    const email = randomEmail();

    const signupResponse = await request.post("/api/users/signup", {
      data: {
        full_name: "E2E User",
        email,
        password: "e2e-password-123",
      },
    });

    expect(signupResponse.ok()).toBeTruthy();
    expect(signupResponse.headers()["set-cookie"]).toContain("booking_user_session=");

    const meResponse = await request.get("/api/users/me");
    expect(meResponse.ok()).toBeTruthy();

    const mePayload = (await meResponse.json()) as {
      ok: boolean;
      data: { userId: string; email: string };
    };

    expect(mePayload.ok).toBe(true);
    expect(mePayload.data.email).toBe(email);
    expect(mePayload.data.userId).toBeTruthy();
  });

  test("logout clears session and /api/users/me returns 401", async ({ request }) => {
    const email = randomEmail();

    await request.post("/api/users/signup", {
      data: {
        full_name: "E2E Logout User",
        email,
        password: "e2e-password-123",
      },
    });

    const logoutResponse = await request.post("/api/users/logout");
    expect(logoutResponse.ok()).toBeTruthy();

    const meResponse = await request.get("/api/users/me");
    expect(meResponse.status()).toBe(401);
  });

  test("guest is redirected from protected user routes", async ({ request }) => {
    const historyResponse = await request.get("/history", { maxRedirects: 0 });
    expect([307, 308]).toContain(historyResponse.status());
    expectRedirectLocation(historyResponse.headers().location, "/");
    expect(historyResponse.headers().location).toContain("auth=1");
    expect(historyResponse.headers().location).toContain("redirect=%2Fhistory");

    const profileResponse = await request.get("/profile?section=info", {
      maxRedirects: 0,
    });
    expect([307, 308]).toContain(profileResponse.status());
    expectRedirectLocation(profileResponse.headers().location, "/");
    expect(profileResponse.headers().location).toContain("auth=1");
    expect(profileResponse.headers().location).toContain(
      "redirect=%2Fprofile%3Fsection%3Dinfo"
    );
  });

  test("client is redirected from /admin with forbidden error", async ({ request }) => {
    await request.post("/api/users/signup", {
      data: {
        full_name: "E2E Client User",
        email: randomEmail(),
        password: "e2e-password-123",
      },
    });

    const response = await request.get("/admin", { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
    expectRedirectLocation(response.headers().location, "/");
    expect(response.headers().location).toContain("error=forbidden");
  });

  test("legacy route /appointments-history redirects to /history", async ({ request }) => {
    const response = await request.get("/appointments-history", {
      maxRedirects: 0,
    });

    expect([307, 308]).toContain(response.status());
    expectRedirectLocation(response.headers().location, "/history");
  });
});

