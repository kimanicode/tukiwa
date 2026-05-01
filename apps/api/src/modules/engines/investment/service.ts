import Decimal from "decimal.js";
import { prisma as defaultPrisma } from "../../../lib/prisma";

export class InvestmentEngineService {
  constructor(private readonly deps: { prisma?: any } = {}) {}

  private get prisma() {
    return this.deps.prisma ?? defaultPrisma;
  }

  async create(chamaId: string, input: any) {
    return this.prisma.investment.create({ data: { chamaId, ...input } });
  }

  async update(investmentId: string, input: any) {
    return this.prisma.investment.update({ where: { id: investmentId }, data: input });
  }

  async recordReturn(chamaId: string, investmentId: string, amount: number, notes?: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const created = await tx.return.create({ data: { investmentId, amount, notes } });
      await tx.auditLog.create({
        data: { chamaId, action: "INVESTMENT_RETURN_RECORDED", entity: "Return", entityId: created.id, meta: { amount } }
      });
      return created;
    });
  }

  async portfolio(chamaId: string) {
    const [investments, members] = await Promise.all([
      this.prisma.investment.findMany({ where: { chamaId }, include: { returns: true } }),
      this.prisma.chamaMember.findMany({ where: { chamaId, isActive: true }, include: { user: true } })
    ]);
    const totalValue = investments.reduce((sum: Decimal, investment: any) => sum.plus(investment.currentValue), new Decimal(0));
    const totalShares = members.reduce((sum: Decimal, member: any) => sum.plus(member.shares), new Decimal(0));
    return {
      investments: investments.map((investment: any) => {
        const gainLoss = new Decimal(investment.currentValue).minus(investment.amount);
        return {
          name: investment.name,
          type: investment.type,
          amountInvested: investment.amount,
          currentValue: investment.currentValue,
          gainLoss: gainLoss.toNumber(),
          gainLossPct: investment.amount === 0 ? 0 : gainLoss.div(investment.amount).mul(100).toDecimalPlaces(2).toNumber()
        };
      }),
      members: members.map((member: any) => ({
        memberId: member.id,
        userId: member.userId,
        fullName: member.user.fullName,
        shares: member.shares,
        shareValue: totalShares.eq(0) ? 0 : totalValue.mul(member.shares).div(totalShares).toDecimalPlaces(0).toNumber()
      }))
    };
  }
}
