import { promisify } from "node:util";
import { execFile } from "node:child_process";

// Replit Mail integration (blueprint:replitmail). Sends email via the OpenInt
// mailer using the repl's Replit identity token — no manual API keys required.
// Pass `to` to deliver to a specific recipient (e.g. the consultant's own
// address); when omitted the mailer falls back to the account's verified email.
// This is best-effort: callers must tolerate failures (e.g. token/hostname
// absent) and continue with in-app notifications.

export interface SmtpMessage {
  to?: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

async function getAuthToken(): Promise<{
  authToken: string;
  hostname: string;
}> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error("REPLIT_CONNECTORS_HOSTNAME tidak tersedia");
  }
  const { stdout } = await promisify(execFile)(
    "replit",
    ["identity", "create", "--audience", `https://${hostname}`],
    { encoding: "utf8" },
  );

  const replitToken = stdout.trim();
  if (!replitToken) {
    throw new Error("Replit Identity Token not found for repl/depl");
  }

  return { authToken: `Bearer ${replitToken}`, hostname };
}

export async function sendEmail(message: SmtpMessage): Promise<{
  accepted: string[];
  rejected: string[];
  pending?: string[];
  messageId: string;
  response: string;
}> {
  const { hostname, authToken } = await getAuthToken();

  const response = await fetch(`https://${hostname}/api/v2/mailer/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Replit-Authentication": authToken,
    },
    body: JSON.stringify({
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || "Failed to send email",
    );
  }

  return (await response.json()) as {
    accepted: string[];
    rejected: string[];
    pending?: string[];
    messageId: string;
    response: string;
  };
}

/**
 * True when the environment can plausibly send Replit Mail. Used to degrade
 * gracefully (skip email, keep in-app notifications) when email is unavailable.
 */
export function isEmailAvailable(): boolean {
  return Boolean(process.env.REPLIT_CONNECTORS_HOSTNAME);
}
