import { Expense, TripSettlement, ParticipantSummary, SettlementTransaction } from '../types';

export function calculateTripSettlement(
  participants: string[],
  expenses: Expense[]
): TripSettlement {
  const summaryMap: Record<string, { totalPaid: number; fairShare: number }> = {};

  // Ensure all known participants are initialized
  participants.forEach((name) => {
    summaryMap[name] = { totalPaid: 0, fairShare: 0 };
  });

  // Also include any person who paid or was included in an expense
  expenses.forEach((exp) => {
    if (!summaryMap[exp.paidBy]) {
      summaryMap[exp.paidBy] = { totalPaid: 0, fairShare: 0 };
    }
    exp.splitWith?.forEach((name) => {
      if (!summaryMap[name]) {
        summaryMap[name] = { totalPaid: 0, fairShare: 0 };
      }
    });
  });

  const allNames = Object.keys(summaryMap);
  let totalSpent = 0;

  // Process all expenses
  expenses.forEach((exp) => {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) return;

    totalSpent += amount;

    // Credit payer
    if (summaryMap[exp.paidBy]) {
      summaryMap[exp.paidBy].totalPaid += amount;
    }

    // Determine who shares this expense
    const sharedWith =
      exp.splitWith && exp.splitWith.length > 0
        ? exp.splitWith.filter((name) => allNames.includes(name))
        : allNames;

    const actualSharers = sharedWith.length > 0 ? sharedWith : [exp.paidBy];
    const perPersonCost = amount / actualSharers.length;

    actualSharers.forEach((name) => {
      if (summaryMap[name]) {
        summaryMap[name].fairShare += perPersonCost;
      }
    });
  });

  // Calculate Net Balances
  const participantSummaries: ParticipantSummary[] = allNames.map((name) => {
    const data = summaryMap[name];
    const totalPaid = Math.round(data.totalPaid * 100) / 100;
    const fairShare = Math.round(data.fairShare * 100) / 100;
    const netBalance = Math.round((totalPaid - fairShare) * 100) / 100;

    return {
      name,
      totalPaid,
      fairShare,
      netBalance,
    };
  });

  // Calculate Minimal Cash Flow Transactions (Debt Simplification)
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  participantSummaries.forEach((p) => {
    if (p.netBalance < -0.01) {
      debtors.push({ name: p.name, amount: Math.abs(p.netBalance) });
    } else if (p.netBalance > 0.01) {
      creditors.push({ name: p.name, amount: p.netBalance });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transfer = Math.min(debtor.amount, creditor.amount);
    const roundedTransfer = Math.round(transfer * 100) / 100;

    if (roundedTransfer > 0) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedTransfer,
        settled: false,
      });
    }

    debtor.amount -= transfer;
    creditor.amount -= transfer;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  const perPersonShare =
    allNames.length > 0 ? Math.round((totalSpent / allNames.length) * 100) / 100 : 0;

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    perPersonShare,
    participants: participantSummaries,
    transactions,
    calculatedAt: new Date().toISOString(),
  };
}
