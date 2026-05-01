import africastalking from "africastalking";

type SmsClient = {
  send(options: { to: string[]; message: string; from?: string }): Promise<unknown>;
};

type AfricasTalkingClient = {
  SMS: SmsClient;
};

let client: AfricasTalkingClient | undefined;

export async function sendSms(phone: string, message: string): Promise<void> {
  if (shouldUseDevelopmentSms()) {
    console.log(`[dev-sms] +${phone}: ${message}`);
    return;
  }

  await getClient().SMS.send({
    to: [`+${phone}`],
    message
  });
}

function getClient(): AfricasTalkingClient {
  client ??= africastalking({
    apiKey: requireEnv("AT_API_KEY"),
    username: requireEnv("AT_USERNAME")
  }) as AfricasTalkingClient;

  return client;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to send SMS`);
  }

  return value;
}

function shouldUseDevelopmentSms(): boolean {
  if (process.env.SMS_PROVIDER === "africastalking") {
    return false;
  }

  return process.env.NODE_ENV !== "production" && (!process.env.AT_API_KEY || !process.env.AT_USERNAME);
}
