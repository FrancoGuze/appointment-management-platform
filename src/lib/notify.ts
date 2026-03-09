import { toast } from "sonner";

const MAX_TOAST_MESSAGE_LENGTH = 50;

function normalizeMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Unexpected error";
  }

  if (normalized.length <= MAX_TOAST_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_TOAST_MESSAGE_LENGTH - 3).trimEnd()}...`;
}

export function toastSuccess(message: string): void {
  toast.success(normalizeMessage(message));
}

export function toastError(message: string): void {
  toast.error(normalizeMessage(message));
}

