import axios from "axios";
import { z } from "zod";
import { redis as defaultRedis } from "../redis";

const TOKEN_CACHE_KEY = "mpesa:oauth:access-token";
const TOKEN_TTL_SECONDS = 55 * 60;

const callbackItemSchema = z.object({
  Name: z.string(),
  Value: z.union([z.string(), z.number()]).optional()
});

const stkCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(callbackItemSchema)
        })
        .optional()
    })
  })
});

const c2bCallbackSchema = z.object({
  TransactionType: z.string(),
  TransID: z.string(),
  TransTime: z.string(),
  TransAmount: z.union([z.string(), z.number()]),
  BusinessShortCode: z.string(),
  BillRefNumber: z.string(),
  InvoiceNumber: z.string().optional(),
  OrgAccountBalance: z.union([z.string(), z.number()]).optional(),
  ThirdPartyTransID: z.string().optional(),
  MSISDN: z.union([z.string(), z.number()]),
  FirstName: z.string().optional(),
  MiddleName: z.string().optional(),
  LastName: z.string().optional()
});

export type MpesaCallback = {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  receiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
};

export type C2BCallbackPayload = z.infer<typeof c2bCallbackSchema>;

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
};

export type MpesaClientDeps = {
  redis?: RedisLike;
};

export class MpesaClient {
  private readonly redis: RedisLike;

  constructor(deps: MpesaClientDeps = {}) {
    this.redis = deps.redis ?? defaultRedis;
  }

  async getAccessToken(): Promise<string> {
    const cached = await this.redis.get(TOKEN_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const credentials = Buffer.from(
      `${requireEnv("MPESA_CONSUMER_KEY")}:${requireEnv("MPESA_CONSUMER_SECRET")}`
    ).toString("base64");

    const response = await axios.get<{ access_token: string }>(
      `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`
        }
      }
    );

    await this.redis.set(
      TOKEN_CACHE_KEY,
      response.data.access_token,
      "EX",
      TOKEN_TTL_SECONDS
    );

    return response.data.access_token;
  }

  async stkPush(
    phone: string,
    amount: number,
    accountRef: string,
    description: string
  ): Promise<{ checkoutRequestId: string }> {
    const token = await this.getAccessToken();
    const timestamp = darajaTimestamp();
    const shortcode = requireEnv("MPESA_SHORTCODE");
    const password = Buffer.from(
      `${shortcode}${requireEnv("MPESA_PASSKEY")}${timestamp}`
    ).toString("base64");

    const response = await axios.post<{
      CheckoutRequestID: string;
    }>(
      `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: requireEnv("MPESA_CALLBACK_URL"),
        AccountReference: accountRef,
        TransactionDesc: description
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return { checkoutRequestId: response.data.CheckoutRequestID };
  }

  async b2cTransfer(
    phone: string,
    amount: number,
    remarks: string
  ): Promise<{ conversationId: string }> {
    const token = await this.getAccessToken();

    const response = await axios.post<{
      ConversationID: string;
    }>(
      `${baseUrl()}/mpesa/b2c/v1/paymentrequest`,
      {
        InitiatorName: requireEnv("MPESA_B2C_INITIATOR_NAME"),
        SecurityCredential: requireEnv("MPESA_B2C_SECURITY_CREDENTIAL"),
        CommandID: "BusinessPayment",
        Amount: amount,
        PartyA: requireEnv("MPESA_SHORTCODE"),
        PartyB: phone,
        Remarks: remarks,
        QueueTimeOutURL: requireEnv("MPESA_CALLBACK_URL"),
        ResultURL: requireEnv("MPESA_CALLBACK_URL"),
        Occasion: "Tukiwa payout"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return { conversationId: response.data.ConversationID };
  }

  async registerC2BUrls(input: {
    shortCode: string;
    confirmationURL: string;
    validationURL: string;
  }): Promise<void> {
    const token = await this.getAccessToken();

    await axios.post(
      `${baseUrl()}/mpesa/c2b/v1/registerurl`,
      {
        ShortCode: input.shortCode,
        ResponseType: "Completed",
        ConfirmationURL: input.confirmationURL,
        ValidationURL: input.validationURL
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  }
}

const defaultClient = new MpesaClient();

export function getAccessToken(): Promise<string> {
  return defaultClient.getAccessToken();
}

export function stkPush(
  phone: string,
  amount: number,
  accountRef: string,
  description: string
): Promise<{ checkoutRequestId: string }> {
  return defaultClient.stkPush(phone, amount, accountRef, description);
}

export function b2cTransfer(
  phone: string,
  amount: number,
  remarks: string
): Promise<{ conversationId: string }> {
  return defaultClient.b2cTransfer(phone, amount, remarks);
}

export function registerC2BUrls(input: {
  shortCode: string;
  confirmationURL: string;
  validationURL: string;
}): Promise<void> {
  return defaultClient.registerC2BUrls(input);
}

export function validateCallback(payload: unknown): MpesaCallback {
  const parsed = stkCallbackSchema.parse(payload).Body.stkCallback;
  const metadata = parsed.CallbackMetadata?.Item ?? [];

  return {
    merchantRequestId: parsed.MerchantRequestID,
    checkoutRequestId: parsed.CheckoutRequestID,
    resultCode: parsed.ResultCode,
    resultDesc: parsed.ResultDesc,
    amount: numberValue(metadata, "Amount"),
    receiptNumber: stringValue(metadata, "MpesaReceiptNumber"),
    transactionDate: stringValue(metadata, "TransactionDate"),
    phoneNumber: stringValue(metadata, "PhoneNumber")
  };
}

export function validateC2BCallback(payload: unknown): C2BCallbackPayload {
  const parsed = c2bCallbackSchema.parse(payload);
  return {
    ...parsed,
    TransAmount: String(parsed.TransAmount),
    MSISDN: String(parsed.MSISDN)
  };
}

function numberValue(items: Array<z.infer<typeof callbackItemSchema>>, name: string) {
  const value = items.find((item) => item.Name === name)?.Value;
  return typeof value === "number" ? value : undefined;
}

function stringValue(items: Array<z.infer<typeof callbackItemSchema>>, name: string) {
  const value = items.find((item) => item.Name === name)?.Value;
  return value === undefined ? undefined : String(value);
}

function baseUrl(): string {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function darajaTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for M-Pesa`);
  }

  return value;
}
