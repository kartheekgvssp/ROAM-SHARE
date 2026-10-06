import React from 'react';
import { Trip, Expense, ExpenseCategory } from '../types';
import { formatDateDDMMYYYY } from '../lib/dateUtils';
import { PieChart, TrendingUp, DollarSign, Wallet, Users } from 'lucide-react';

interface BudgetChartsProps {
  trip: Trip;
  expenses: Expense[];
}

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; bar: string }> = {
  Food: { bg: 'bg-amber-100', text: 'text-amber-800', bar: 'bg-amber-500' },
  Transport: { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-500' },
  Lodging: { bg: 'bg-indigo-100', text: 'text-indigo-800', bar: 'bg-indigo-500' },
  Activities: { bg: 'bg-purple-100', text: 'text-purple-800', bar: 'bg-purple-500' },
  Shopping: { bg: 'bg-pink-100', text: 'text-pink-800', bar: 'bg-pink-500' },
  Misc: { bg: 'bg-gray-200', text: 'text-gray-800', bar: 'bg-gray-500' },
};

export const BudgetCharts: React.FC<BudgetChartsProps> = ({ trip, expenses }) => {
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const budget = trip.budget || 0;
  const budgetPercent = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0;
  const isOverBudget = budget > 0 && totalSpent > budget;

  // Category totals
  const categoryMap: Partial<Record<ExpenseCategory, number>> = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + (Number(e.amount) || 0);
  });

  const categoriesSorted = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]) as [
    ExpenseCategory,
    number,
  ][];

  // Spender totals
  const payerMap: Record<string, number> = {};
  expenses.forEach((e) => {
    payerMap[e.paidBy] = (payerMap[e.paidBy] || 0) + (Number(e.amount) || 0);
  });
  const payersSorted = Object.entries(payerMap).sort((a, b) => b[1] - a[1]);

  // Daily Spending Trend
  const dailyMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const d = e.date || 'Undated';
    dailyMap[d] = (dailyMap[d] || 0) + (Number(e.amount) || 0);
  });
  const dailySorted = Object.entries(dailyMap).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );
  const maxDaySpend = Math.max(...dailySorted.map((d) => d[1]), 1);

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500">
        <PieChart className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm font-medium">No expenses logged yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Add your first expense to unlock real-time budget charts & trend analysis!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Overall Budget Card */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Trip Budget Overview</h3>
              <p className="text-xs text-gray-500">
                {trip.currency}
                {totalSpent.toFixed(2)} total spent ({expenses.length} records)
              </p>
            </div>
          </div>
          {budget > 0 && (
            <div className="text-right">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isOverBudget
                    ? 'bg-red-100 text-red-700'
                    : budgetPercent > 80
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {isOverBudget
                  ? `Over Budget by ${trip.currency}${(totalSpent - budget).toFixed(2)}`
                  : `${budgetPercent}% of Budget`}
              </span>
            </div>
          )}
        </div>

        {budget > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
              <span>Spent: {trip.currency}{totalSpent.toFixed(2)}</span>
              <span>Target: {trip.currency}{budget.toFixed(2)}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isOverBudget ? 'bg-red-500' : budgetPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Grid: Categories & Spenders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200/80">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-gray-900">Spending by Category</h4>
          </div>

          <div className="space-y-2.5">
            {categoriesSorted.map(([cat, amt]) => {
              const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
              const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Misc;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${color.bar}`} />
                      {cat}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {trip.currency}
                      {amt.toFixed(2)} <span className="text-gray-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full ${color.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spender Breakdown */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200/80">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-gray-900">Who Paid What</h4>
          </div>

          <div className="space-y-2.5">
            {payersSorted.map(([payer, amt]) => {
              const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
              return (
                <div key={payer} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700">{payer}</span>
                    <span className="font-semibold text-gray-900">
                      {trip.currency}
                      {amt.toFixed(2)} <span className="text-gray-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Daily Spending Trend */}
      {dailySorted.length > 1 && (
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200/80">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-gray-900">Daily Spending Trend</h4>
          </div>

          <div className="flex items-end gap-2 pt-4 h-36 overflow-x-auto pb-1">
            {dailySorted.map(([day, amt]) => {
              const barHeight = Math.max(Math.round((amt / maxDaySpend) * 100), 10);
              const fullDateFormatted = formatDateDDMMYYYY(day);
              const dayShort = fullDateFormatted.slice(0, 5); // DD-MM
              return (
                <div
                  key={day}
                  className="flex flex-col items-center flex-1 min-w-[48px] group relative"
                  title={`${fullDateFormatted}: ${trip.currency}${amt.toFixed(2)}`}
                >
                  <div className="text-[10px] font-bold text-gray-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {trip.currency}
                    {amt.toFixed(0)}
                  </div>
                  <div className="w-full max-w-[28px] h-24 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-emerald-500 group-hover:bg-emerald-600 transition-all duration-300"
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] font-mono font-semibold text-gray-600 truncate w-full text-center">
                    {dayShort}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
