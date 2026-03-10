import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  formatUtcSlotDateLocal,
  formatUtcSlotTimeLocal,
  toLocalDateKeyFromUtcSlot,
} from "@/src/lib/datetime";
import type { CalendarSlot } from "@/src/services/slots";

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

function readEnvValue(name: string): string | undefined {
  const direct = process.env[name];
  if (direct) {
    return direct;
  }

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return undefined;
}

async function loadSlots(request: APIRequestContext): Promise<CalendarSlot[]> {
  const response = await request.get("/api/slots");
  const payload = (await response.json()) as { ok: boolean; data?: CalendarSlot[] };
  if (!response.ok() || !payload.ok) {
    return [];
  }
  return payload.data ?? [];
}

function pickFirstAvailableSlot(slots: CalendarSlot[]): CalendarSlot | null {
  return slots.find((slot) => slot.availability === "available") ?? null;
}

async function ensureAvailableSlot(request: APIRequestContext): Promise<CalendarSlot | null> {
  let slots = await loadSlots(request);
  let candidate = pickFirstAvailableSlot(slots);
  if (candidate) {
    return candidate;
  }

  const cronSecret = readEnvValue("CRON_SECRET");
  if (!cronSecret) {
    return null;
  }

  await request.post("/api/slots/generate", {
    headers: { authorization: `Bearer ${cronSecret}` },
  });

  slots = await loadSlots(request);
  candidate = pickFirstAvailableSlot(slots);
  return candidate ?? null;
}

function monthLabelFromDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthIndexFromLabel(label: string): { year: number; monthIndex: number } | null {
  const [monthName, yearValue] = label.split(" ");
  const year = Number.parseInt(yearValue ?? "", 10);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthIndex = monthNames.indexOf(monthName ?? "");
  if (!Number.isFinite(year) || monthIndex === -1) {
    return null;
  }
  return { year, monthIndex };
}

async function selectCalendarDate(page: Page, dateKey: string): Promise<void> {
  const calendar = page.locator("article").filter({ hasText: "Select a day" }).first();
  await expect(calendar).toBeVisible();
  const targetDate = new Date(`${dateKey}T00:00:00`);
  const targetLabel = monthLabelFromDate(targetDate);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const heading = calendar.getByRole("heading").first();
    const currentLabel = (await heading.textContent())?.trim() ?? "";
    if (currentLabel === targetLabel) {
      break;
    }

    const current = monthIndexFromLabel(currentLabel);
    const target = monthIndexFromLabel(targetLabel);
    if (!current || !target) {
      break;
    }

    const currentValue = current.year * 12 + current.monthIndex;
    const targetValue = target.year * 12 + target.monthIndex;

    if (currentValue < targetValue) {
      await calendar.getByRole("button", { name: ">" }).click();
    } else if (currentValue > targetValue) {
      await calendar.getByRole("button", { name: "<" }).click();
    }
  }

  const day = targetDate.getDate().toString();
  const dayButtons = calendar.locator("button", { hasText: day });
  const count = await dayButtons.count();

  for (let index = 0; index < count; index += 1) {
    const button = dayButtons.nth(index);
    if (await button.isDisabled()) {
      continue;
    }
    const className = (await button.getAttribute("class")) ?? "";
    if (className.includes("opacity-35")) {
      continue;
    }
    await button.click();
    return;
  }

  await dayButtons.first().click();
}

async function openSignupModal(page: Page): Promise<void> {
  await page.goto("/?auth=1");
  await page.getByRole("button", { name: "Sign up" }).first().click();
}

async function signupViaUi(page: Page, email: string): Promise<void> {
  await openSignupModal(page);
  await page.getByLabel("Full name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.locator("form").getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Account created and session started")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeHidden();
}

async function signupViaApi(
  request: APIRequestContext,
  email: string,
  fullName: string
): Promise<string> {
  const response = await request.post("/api/users/signup", {
    data: { full_name: fullName, email, password: "e2e-password-123" },
  });
  expect(response.ok()).toBeTruthy();
  const setCookie = response.headers()["set-cookie"] ?? "";
  const cookieValue = setCookie.split(";")[0]?.split("=")[1];
  expect(cookieValue).toBeTruthy();
  return cookieValue!;
}

async function bookSlotFromUi(page: Page, slot: CalendarSlot): Promise<void> {
  const localDateKey = toLocalDateKeyFromUtcSlot(slot.slot_date, slot.start_time);
  await selectCalendarDate(page, localDateKey);

  const startTime = formatUtcSlotTimeLocal(slot.slot_date, slot.start_time);
  const endTime = formatUtcSlotTimeLocal(slot.slot_date, slot.end_time);
  const timeLabel = `${startTime} - ${endTime}`;

  await page.getByRole("button", { name: new RegExp(timeLabel) }).click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
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



  test("double-book protection: second user gets conflict", async ({ browser, request }) => {
    const slot = await ensureAvailableSlot(request);
    test.skip(!slot, "No available slots found (and could not generate).");

    const baseURL =
      (test.info().project.use.baseURL as string) ?? "http://127.0.0.1:3000";

    const cookieA = await signupViaApi(request, randomEmail(), "E2E Client A");
    const cookieB = await signupViaApi(request, randomEmail(), "E2E Client B");

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    await contextA.addCookies([
      { name: "booking_user_session", value: cookieA, url: baseURL },
    ]);
    await contextB.addCookies([
      { name: "booking_user_session", value: cookieB, url: baseURL },
    ]);

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto("/");
    await pageB.goto("/");

    await bookSlotFromUi(pageA, slot!);
    await bookSlotFromUi(pageB, slot!);

    await expect(pageA.getByText("Appointment booked successfully")).toBeVisible();
    await expect(
      pageB.getByText(
        /Slot already has an appointment|Slot is not available|Could not create appointment/
      )
    ).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
