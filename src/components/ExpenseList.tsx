import React, { useState } from 'react';
import { Expense, ExpenseCategory, Trip } from '../types';
import { formatDateDDMMYYYY } from '../lib/dateUtils';
import {
  Utensils,
  Car,
  Home,
  Compass,
  ShoppingBag,
  MoreHorizontal,
  Search,
  Filter,
  CheckCircle,
  Trash2,
  Edit2,
  Users,
  ChevronDown,
  X,
  PieChart,
  TrendingUp,
  Tag,
} from 'lucide-react';

interface ExpenseListProps {
  trip: Trip;
  expenses: Expense[];
  currentUserName: string;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  {
    icon: React.ElementType;
    color: string;
    badge: string;
    border: string;
    barColor: string;
    accentColor: string;
  }
> = {
  Food: {
    icon: Utensils,
    color: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-amber-300',
    barColor: 'bg-amber-500',
    accentColor: 'text-amber-600',
  },
  Transport: {
    icon: Car,
    color: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    border: 'border-blue-300',
    barColor: 'bg-blue-500',
    accentColor: 'text-blue-600',
  },
  Lodging: {
    icon: Home,
    color: 'bg-indigo-100 text-indigo-700',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    border: 'border-indigo-300',
    barColor: 'bg-indigo-500',
    accentColor: 'text-indigo-600',
  },
  Activities: {
    icon: Compass,
    color: 'bg-purple-100 text-purple-700',
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    border: 'border-purple-300',
    barColor: 'bg-purple-500',
    accentColor: 'text-purple-600',
  },
  Shopping: {
    icon: ShoppingBag,
    color: 'bg-pink-100 text-pink-700',
    badge: 'bg-pink-50 text-pink-800 border-pink-200',
    border: 'border-pink-300',
    barColor: 'bg-pink-500',
    accentColor: 'text-pink-600',
  },
  Misc: {
    icon: MoreHorizontal,
    color: 'bg-gray-100 text-gray-700',
    badge: 'bg-gray-50 text-gray-800 border-gray-200',
    border: 'border-gray-300',
    barColor: 'bg-gray-500',
    accentColor: 'text-gray-600',
  },
};

const ALL_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Lodging',
  'Activities',
  'Shopping',
  'Misc',
];

export const ExpenseList: React.FC<ExpenseListProps> = ({
  trip,
  expenses,
  currentUserName,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPayer, setSelectedPayer] = useState<string>('All');
  const [showSummaryDetails, setShowSummaryDetails] = useState(true);

  // Compute category-based summaries
  const totalTripSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const categoryTotals: Record<ExpenseCategory, { total: number; count: number }> = {
    Food: { total: 0, count: 0 },
    Transport: { total: 0, count: 0 },
    Lodging: { total: 0, count: 0 },
    Activities: { total: 0, count: 0 },
    Shopping: { total: 0, count: 0 },
    Misc: { total: 0, count: 0 },
  };

  expenses.forEach((e) => {
    if (categoryTotals[e.category]) {
      categoryTotals[e.category].total += Number(e.amount) || 0;
      categoryTotals[e.category].count += 1;
    }
  });

  // Find top spending category
  const topCategory = ALL_CATEGORIES.reduce(
    (max, cat) => (categoryTotals[cat].total > categoryTotals[max].total ? cat : max),
    ALL_CATEGORIES[0]
  );

  // Filtered expense list
  const filteredExpenses = expenses
    .filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory === 'All' || e.category === selectedCategory;
      const matchPayer = selectedPayer === 'All' || e.paidBy === selectedPayer;
      return matchSearch && matchCat && matchPayer;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* 1. Category Summaries Card Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Category-Based Summaries
              </h3>
              <p className="text-[11px] text-gray-500">
                {expenses.length} total logged expenses &bull; Tap a card to quick-filter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset to All</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSummaryDetails(!showSummaryDetails)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              {showSummaryDetails ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Category Cards Grid */}
        {showSummaryDetails && (
          <div className="mt-3.5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {ALL_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                const data = categoryTotals[cat];
                const isSelected = selectedCategory === cat;
                const percentage =
                  totalTripSpent > 0 ? Math.round((data.total / totalTripSpent) * 100) : 0;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? 'All' : cat)}
                    className={`p-3 rounded-2xl border text-left transition active:scale-98 cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-gray-200/90 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${config.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">
                        {data.count} {data.count === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-gray-800 truncate">{cat}</div>
                    <div className="text-sm sm:text-base font-black text-gray-900 mt-0.5 tracking-tight">
                      {trip.currency}
                      {data.total.toFixed(0)}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${config.barColor}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium mt-1">
                      <span>{percentage}%</span>
                      {cat === topCategory && data.total > 0 && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1 rounded">
                          Top
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Filter Toolbar: Search + Category Filter Dropdown + Payer Dropdown */}
      <div className="bg-white p-3.5 rounded-3xl border border-gray-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses by title, note, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            {/* Category Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <div className="pointer-events-none absolute left-3 top-3 text-emerald-700">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <select
                aria-label="Filter expenses by category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100/60 py-2.5 pl-8 pr-9 text-xs sm:text-sm font-bold text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer transition"
              >
                <option value="All">All Categories ({expenses.length})</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c} ({categoryTotals[c].count} items - {trip.currency}
                    {categoryTotals[c].total.toFixed(0)})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-3.5 w-3.5 text-gray-400" />
            </div>

            {/* Payer Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <div className="pointer-events-none absolute left-3 top-3 text-emerald-700">
                <Users className="w-3.5 h-3.5" />
              </div>
              <select
                aria-label="Filter expenses by payer"
                value={selectedPayer}
                onChange={(e) => setSelectedPayer(e.target.value)}
                className="w-full sm:w-auto appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100/60 py-2.5 pl-8 pr-9 text-xs sm:text-sm font-bold text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden cursor-pointer transition"
              >
                <option value="All">All Payers</option>
                {trip.participants.map((p) => (
                  <option key={p} value={p}>
                    Paid by {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filter Indicator Banner */}
        {(selectedCategory !== 'All' || selectedPayer !== 'All' || search) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>
                Showing <strong>{filteredExpenses.length}</strong> matching records
                {selectedCategory !== 'All' && (
                  <span className="font-semibold text-emerald-800"> &bull; Category: {selectedCategory}</span>
                )}
                {selectedPayer !== 'All' && (
                  <span className="font-semibold text-emerald-800"> &bull; Payer: {selectedPayer}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-emerald-900">
                Filtered Total: {trip.currency}
                {filteredTotal.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedPayer('All');
                  setSearch('');
                }}
                className="text-[11px] font-bold underline hover:text-emerald-700 cursor-pointer ml-1"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Expense Items List */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-gray-900">No matching expenses found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {expenses.length === 0
              ? 'No expenses recorded for this trip yet. Tap "Add Expense" to get started!'
              : 'Try clearing your search query or switching your category filter dropdown.'}
          </p>
          {(selectedCategory !== 'All' || selectedPayer !== 'All' || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedPayer('All');
                setSearch('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map((expense) => {
            const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.Misc;
            const Icon = config.icon;
            const isMyExpense = expense.paidBy === currentUserName;
            const dateFormatted = formatDateDDMMYYYY(expense.date);

            return (
              <div
                key={expense.id}
                className="group flex items-center justify-between p-3.5 sm:p-4 rounded-3xl bg-white border border-gray-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div
                    className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl ${config.color}`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-gray-900 text-sm sm:text-base truncate">
                        {expense.description}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${config.badge}`}
                      >
                        {expense.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
                      {/* Date formatted as DD-MM-YYYY */}
                      <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                        {dateFormatted}
                      </span>
                      <span>&bull;</span>
                      <span className="font-semibold text-gray-800">
                        Paid by {expense.paidBy} {isMyExpense ? '(You)' : ''}
                      </span>
                      {expense.splitWith && expense.splitWith.length > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span>{expense.splitWith.length} people</span>
                          </span>
                        </>
                      )}
                      {expense.syncedToSheet && (
                        <>
                          <span>&bull;</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Sheets</span>
                          </span>
                        </>
                      )}
                    </div>

                    {expense.notes && (
                      <p className="text-xs text-gray-500 italic mt-1 truncate max-w-md">
                        &ldquo;{expense.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-2.5 sm:gap-3 pl-3 shrink-0">
                  <div className="text-right">
                    <div className="text-base sm:text-xl font-black text-gray-900 whitespace-nowrap tracking-tight">
                      {trip.currency}
                      {Number(expense.amount).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditExpense(expense)}
                      className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition cursor-pointer"
                      title="Edit expense"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${expense.description}" (${trip.currency}${expense.amount})?`
                          )
                        ) {
                          onDeleteExpense(expense.id);
                        }
                      }}
                      className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
