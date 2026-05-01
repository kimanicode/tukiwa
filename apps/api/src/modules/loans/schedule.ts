import Decimal from "decimal.js";

export type RepaymentScheduleItem = {
  dueDate: Date;
  amount: number;
};

export function generateRepaymentSchedule(
  loanAmount: number,
  interestRate: number,
  installments: number,
  startDate = new Date()
): RepaymentScheduleItem[] {
  const total = new Decimal(loanAmount)
    .mul(new Decimal(1).plus(new Decimal(interestRate).div(100)))
    .round();
  const base = total.div(installments).floor();
  const remainder = total.minus(base.mul(installments)).toNumber();

  return Array.from({ length: installments }, (_, index) => {
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + index + 1);

    return {
      dueDate,
      amount: base.plus(index === installments - 1 ? remainder : 0).toNumber()
    };
  });
}
