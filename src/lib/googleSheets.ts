import { Trip, Expense, TripSettlement } from '../types';
import { formatDateDDMMYYYY } from './dateUtils';

export interface SheetSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  syncedExpensesCount: number;
  syncedAt: string;
}

/**
 * Creates a new Google Spreadsheet for the given trip.
 */
export async function createTripSpreadsheet(
  accessToken: string,
  trip: Trip
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `TripSync - ${trip.destination} (${trip.startDate || 'Trip'})`;

  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Expenses Log',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Settlement Summary',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to create spreadsheet (${response.status})`
    );
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Syncs all expenses and settlement summary into the Google Spreadsheet.
 */
export async function syncTripToGoogleSheets(
  accessToken: string,
  trip: Trip,
  expenses: Expense[],
  settlement?: TripSettlement
): Promise<SheetSyncResult> {
  let spreadsheetId = trip.sheetId;
  let spreadsheetUrl = trip.sheetUrl;

  // If no spreadsheet ID exists, create one
  if (!spreadsheetId) {
    const created = await createTripSpreadsheet(accessToken, trip);
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
  }

  // 1. Prepare Expenses Log data
  const expensesHeader = [
    'Date',
    'Description',
    'Category',
    'Paid By',
    `Amount (${trip.currency || '$'})`,
    'Split With',
    'Notes',
    'Logged Timestamp',
  ];

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const expenseRows = sortedExpenses.map((e) => [
    formatDateDDMMYYYY(e.date) || e.date || '',
    e.description || '',
    e.category || '',
    e.paidBy || '',
    Number(e.amount) || 0,
    e.splitWith && e.splitWith.length > 0 ? e.splitWith.join(', ') : 'All Participants',
    e.notes || '',
    e.createdAt || '',
  ]);

  const expensesData = [expensesHeader, ...expenseRows];

  // 2. Prepare Settlement Summary data
  const totalSpent = sortedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const participantsList = trip.participants?.join(', ') || 'None';

  const summaryData: (string | number)[][] = [
    ['TRIP OVERVIEW', ''],
    ['Trip Destination', trip.destination],
    ['Trip Code', trip.id],
    ['Start Date', formatDateDDMMYYYY(trip.startDate) || 'N/A'],
    ['End Date', formatDateDDMMYYYY(trip.endDate) || 'N/A'],
    ['Status', trip.status ? trip.status.toUpperCase() : 'ACTIVE'],
    ['Planned Budget', trip.budget ? `${trip.currency || '$'} ${trip.budget}` : 'None'],
    ['Total Expenses Logged', `${trip.currency || '$'} ${totalSpent.toFixed(2)}`],
    ['Participants', participantsList],
    ['Last Synced', new Date().toLocaleString()],
    [],
  ];

  if (settlement && settlement.participants && settlement.participants.length > 0) {
    summaryData.push(['PARTICIPANT BREAKDOWN', '', '', '', '']);
    summaryData.push([
      'Participant',
      `Total Paid (${trip.currency || '$'})`,
      `Fair Share (${trip.currency || '$'})`,
      `Net Balance (${trip.currency || '$'})`,
      'Settlement Status',
    ]);

    settlement.participants.forEach((p) => {
      const statusText =
        p.netBalance > 0
          ? `Gets back ${trip.currency || '$'}${p.netBalance.toFixed(2)}`
          : p.netBalance < 0
          ? `Owes ${trip.currency || '$'}${Math.abs(p.netBalance).toFixed(2)}`
          : 'Settled / Even';

      summaryData.push([
        p.name,
        p.totalPaid.toFixed(2),
        p.fairShare.toFixed(2),
        p.netBalance.toFixed(2),
        statusText,
      ]);
    });

    summaryData.push([]);
    summaryData.push(['SETTLEMENT TRANSFERS (WHO PAYS WHOM)', '', '', '']);
    summaryData.push(['From (Debtor)', 'To (Creditor)', `Amount (${trip.currency || '$'})`, 'Status']);

    if (settlement.transactions && settlement.transactions.length > 0) {
      settlement.transactions.forEach((t) => {
        summaryData.push([
          t.from,
          t.to,
          t.amount.toFixed(2),
          t.settled ? 'Settled (Paid)' : 'Pending Payment',
        ]);
      });
    } else {
      summaryData.push(['All balances are settled', '-', '0.00', 'Settled']);
    }
  }

  // 3. Batch Update values to Google Sheets
  // First clear old values in Expenses Log and Settlement Summary to avoid stale rows
  await Promise.all([
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Expenses Log'!A1:Z500:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    ).catch(() => null),
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Settlement Summary'!A1:Z500:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    ).catch(() => null),
  ]);

  // Write Expenses Log values
  const expRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Expenses Log'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'Expenses Log'!A1",
        majorDimension: 'ROWS',
        values: expensesData,
      }),
    }
  );

  if (!expRes.ok) {
    const err = await expRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to update Expenses Log in Google Sheets');
  }

  // Write Settlement Summary values
  const sumRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Settlement Summary'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'Settlement Summary'!A1",
        majorDimension: 'ROWS',
        values: summaryData,
      }),
    }
  );

  if (!sumRes.ok) {
    const err = await sumRes.json().catch(() => ({}));
    console.warn('Could not update Settlement tab:', err.error?.message);
  }

  return {
    spreadsheetId: spreadsheetId!,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    syncedExpensesCount: expenses.length,
    syncedAt: new Date().toISOString(),
  };
}
