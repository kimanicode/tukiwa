import axios from "axios";

export type InboundWhatsAppMessage = {
  from: string;
  body: string;
};

export async function sendMessage(phone: string, message: string): Promise<void> {
  if (process.env.WHATSAPP_PROVIDER === "twilio") {
    await sendViaTwilio(phone, message);
    return;
  }

  await sendViaAfricasTalking(phone, message);
}

export function parseInbound(payload: unknown): InboundWhatsAppMessage {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid WhatsApp payload");
  }

  const value = payload as Record<string, unknown>;
  const from =
    stringValue(value.from) ??
    stringValue(value.From) ??
    stringValue(value.phoneNumber) ??
    stringValue(value.sender) ??
    stringValue(value.wa_id);
  const body =
    stringValue(value.body) ??
    stringValue(value.Body) ??
    stringValue(value.text) ??
    textBody(value.messages);

  if (!from || !body) {
    throw new Error("Invalid WhatsApp payload");
  }

  return {
    from: normalizePhone(from),
    body: body.trim()
  };
}

async function sendViaAfricasTalking(phone: string, message: string): Promise<void> {
  const url = process.env.WHATSAPP_AT_URL ?? "https://api.africastalking.com/version1/messaging";
  await axios.post(
    url,
    new URLSearchParams({
      username: requireEnv("AT_USERNAME"),
      to: `+${phone}`,
      message
    }),
    {
      headers: {
        apiKey: requireEnv("AT_API_KEY"),
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );
}

async function sendViaTwilio(phone: string, message: string): Promise<void> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    new URLSearchParams({
      From: requireEnv("TWILIO_WHATSAPP_FROM"),
      To: `whatsapp:+${phone}`,
      Body: message
    }),
    {
      auth: {
        username: accountSid,
        password: authToken
      }
    }
  );
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7")) return `254${digits}`;
  return digits;
}

function textBody(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const first = value[0] as { text?: { body?: string } } | undefined;
  return first?.text?.body;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for WhatsApp`);
  return value;
}
