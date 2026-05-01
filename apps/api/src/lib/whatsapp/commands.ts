import { ContributionStatus, LoanStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "../prisma";
import { stkPush as defaultStkPush } from "../mpesa";

export type WhatsAppCommandDeps = {
  prisma?: any;
  stkPush?: (
    phone: string,
    amount: number,
    accountRef: string,
    description: string
  ) => Promise<{ checkoutRequestId: string }>;
};

export async function handleWhatsAppCommand(
  from: string,
  body: string,
  deps: WhatsAppCommandDeps = {}
): Promise<string> {
  const prisma = deps.prisma ?? defaultPrisma;
  const user = await prisma.user.findUnique({ where: { phone: from } });
  if (!user) return "We could not find your Tukiwa account. Open the app and sign in first.";

  const [command, ...rest] = body.trim().split(/\s+/);
  const keyword = command?.toUpperCase();

  if (keyword === "BALANCE" || keyword === "BAL") return balance(user.id, prisma);
  if (keyword === "PAY") return pay(user, rest, prisma, deps.stkPush ?? defaultStkPush);
  if (keyword === "STATUS") return status(user.id, prisma);
  if (keyword === "HISTORY") return history(user.id, prisma);
  if (keyword === "HELP") return help();

  return "Type HELP to see available commands";
}

async function balance(userId: string, prisma: any): Promise<string> {
  const memberships = await prisma.chamaMember.findMany({
    where: { userId, isActive: true },
    include: { chama: true, contributions: true }
  });
  if (memberships.length === 0) return "You are not in any active chamas yet.";
  return memberships
    .map((membership: any) => {
      const paid = sum(
        membership.contributions.filter((item: any) => item.status === ContributionStatus.PAID)
      );
      const pending = sum(
        membership.contributions.filter((item: any) => item.status !== ContributionStatus.PAID)
      );
      return `${membership.chama.name}: paid ${money(paid)}, outstanding ${money(pending)}`;
    })
    .join("\n");
}

async function pay(
  user: { id: string; phone: string },
  parts: string[],
  prisma: any,
  stkPush: NonNullable<WhatsAppCommandDeps["stkPush"]>
): Promise<string> {
  const amountKes = Number(parts[0]);
  const chamaName = parts.slice(1).join(" ");
  if (!Number.isFinite(amountKes) || amountKes <= 0 || !chamaName) {
    return "Use: PAY [amount] [chama name]";
  }
  const membership = await prisma.chamaMember.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      chama: { name: { equals: chamaName, mode: "insensitive" } }
    },
    include: { chama: true }
  });
  if (!membership) return `Could not find an active chama named ${chamaName}.`;

  const contribution = await prisma.contribution.create({
    data: {
      chamaId: membership.chamaId,
      memberId: membership.id,
      amount: amountKes * 100,
      status: ContributionStatus.PENDING,
      dueDate: new Date()
    }
  });
  const { checkoutRequestId } = await stkPush(
    user.phone,
    amountKes,
    contribution.id,
    "Tukiwa WhatsApp contribution"
  );
  await prisma.contribution.update({
    where: { id: contribution.id },
    data: { mpesaRef: checkoutRequestId }
  });
  return `STK Push sent to ${maskPhone(user.phone)}`;
}

async function status(userId: string, prisma: any): Promise<string> {
  const loans = await prisma.loan.findMany({
    where: {
      borrowerId: userId,
      status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] }
    },
    include: { repayments: true, chama: true }
  });
  if (loans.length === 0) return "You have no active loans.";
  return loans
    .map((loan: any) => {
      const repaid = sum(loan.repayments);
      return `${loan.chama.name}: outstanding ${money(Math.max(loan.totalDue - repaid, 0))}`;
    })
    .join("\n");
}

async function history(userId: string, prisma: any): Promise<string> {
  const contributions = await prisma.contribution.findMany({
    where: { member: { userId } },
    include: { chama: true },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  if (contributions.length === 0) return "No contribution history yet.";
  return contributions
    .map((item: any) => `${item.chama.name}: ${money(item.amount)} ${item.status}`)
    .join("\n");
}

function help(): string {
  return [
    "Tukiwa WhatsApp commands:",
    "BALANCE or BAL - contribution balances",
    "PAY [amount] [chama name] - start M-Pesa payment",
    "STATUS - active loan status",
    "HISTORY - last 5 contributions",
    "HELP - show commands"
  ].join("\n");
}

function sum(items: Array<{ amount: number }>): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

function money(cents: number): string {
  return `KES ${(cents / 100).toFixed(2)}`;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}XXXX${phone.slice(-3)}`;
}
