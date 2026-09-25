import { after, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { currentUser, requireOwner } from '@/lib/auth';
import { errorResponse, fail, forbidden, unauthenticated } from '@/lib/api';
import { OWNER_EXPORT_LIMIT, getTurf, ownerTotals, streamOwnerBookings } from '@/lib/bookings';
import * as c from '@/content/owner';
import { fill } from '@/content/home';
import { businessDateKeyOf, describeSlots, formatDateKey, formatDateTime, formatRange } from '@/lib/slots';
import type { OwnerBookingDTO, OwnerQuery, OwnerTotals } from '@/lib/types';
import { parseOwnerQuery } from '@/lib/validation';

/**
 * GET /api/owner/export — the ledger as an Excel workbook. OWNER only.
 *
 * The same `parseOwnerQuery` the page uses reads the same params, so a
 * download can never quietly mean something different from the table it was
 * started from, and the rows arrive in the same order: last booked first.
 *
 * This is the largest pile of customer data the site will ever hand out —
 * every name, phone number and email in the filter — so it is owner-only,
 * never cached, capped, and logged with who took it and what they asked for.
 */
export async function GET(req: NextRequest) {
  try {
    const owner = await requireOwner();
    if (!owner) return (await currentUser()) ? forbidden() : unauthenticated();

    const turf = await getTurf();
    if (!turf) return fail({ error: 'NOT_FOUND' }, 404);

    const query: OwnerQuery = parseOwnerQuery(new URL(req.url).searchParams);
    const now = new Date();
    const totals = await ownerTotals(turf, query, now);

    const wb = new ExcelJS.Workbook();
    wb.creator = turf.name;
    wb.created = now;
    const ws = wb.addWorksheet(c.sheet.tab, {
      views: [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }],
      properties: { defaultRowHeight: 18 },
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
    });

    // Every value written to the sheet is measured on the way past, so the
    // widths set at the end fit the longest thing actually in each column —
    // nobody should have to drag a column border to read a phone number.
    const widest = COLUMNS.map(() => 0);
    const measure = (values: Cell[]) => {
      values.forEach((v, i) => {
        if (v === null || v === '') return;
        const len = typeof v === 'number' ? (COLS[i].money ? money(v).length : String(v).length) : longest(v);
        if (len > widest[i]) widest[i] = len;
      });
    };

    // ------------------------------------------------------------- banner
    // Added now so the row numbers are fixed (the header stays on row 7, and
    // the frozen split with it); styled at the very end, after the column
    // pass, which would otherwise overwrite their alignment.
    ws.addRow([fill(c.sheet.title, { turf: turf.name })]);
    ws.addRow([metaLine(query, now)]);
    ws.addRow([]);
    ws.addRow(spread(KPIS.map((k) => c.sheet.kpi[k.key])));
    ws.addRow(spread(KPIS.map((k) => k.value(totals))));
    ws.addRow([]);

    const headRow = ws.addRow(COLUMNS.map((col) => col.label));

    // ---------------------------------------------------------------- rows
    let count = 0;
    for await (const b of streamOwnerBookings(turf, query, now)) {
      const values = cells(b);
      measure(values);
      body(ws.addRow(values), b, count % 2 === 1);
      count++;
    }
    const lastBodyRow = HEADER_ROW + count;
    if (count === 0) {
      // An empty grid under a header reads as a broken download. Say it.
      const none = ws.addRow(fillAt({ Date: c.empty.title, Times: c.empty.body }));
      none.font = { italic: true, size: 10, color: { argb: MUTED } };
    }

    // -------------------------------------------------------------- totals
    ws.addRow([]);
    const totalRow = ws.addRow(
      fillAt({
        Date: c.sheet.total,
        Times: fill(c.sheet.totalCount, { count: totals.entries }),
        Players: totals.players,
        Collected: totals.collected / 100,
        Refunded: totals.refunded / 100,
      }),
    );
    const incomeRow = ws.addRow(
      fillAt({ Date: c.sheet.income, Times: c.sheet.incomeHint, Collected: totals.income / 100 }),
    );
    const blockedRow =
      totals.blockedCount > 0
        ? ws.addRow(
            fillAt({
              Date: c.sheet.blocked,
              Times: fill(c.sheet.blockedHint, { count: totals.blockedCount }),
              Amount: totals.blocked / 100,
            }),
          )
        : null;
    if (count >= OWNER_EXPORT_LIMIT) {
      const capped = ws.addRow([fill(c.sheet.capped, { limit: OWNER_EXPORT_LIMIT })]);
      capped.font = { italic: true, color: { argb: ROSE } };
    }

    // ------------------------------------------------------- column widths
    COLS.forEach((col, i) => {
      // The widest value in the column, and the heading with room for the
      // filter button Excel draws over its right-hand end.
      // Text columns carry an indent of one, so they need a character more.
      const padding = col.money || col.number ? 2 : 3;
      const needed = Math.max(Math.round(widest[i] * 1.02) + padding, col.label.length + ARROW);
      const width = Math.min(col.max ?? MAX_WIDTH, Math.max(col.min, needed));
      const column = ws.getColumn(i + 1);
      column.width = width;
      if (col.money) column.numFmt = MONEY;
      column.alignment = {
        vertical: 'top',
        horizontal: col.money ? 'right' : col.number ? 'center' : 'left',
        // Only a column whose longest value did not fit wraps; wrapping one
        // that fits makes every row taller for nothing.
        wrapText: needed > width,
        indent: col.money || col.number ? 0 : 1,
      };
    });

    // ------------------------------------------------------------- styling
    // All of it after the widths, because setting a column's alignment or
    // number format in ExcelJS rewrites every cell already in that column.
    banner(ws, turf.name);
    header(headRow);
    band(totalRow, INK, WHITE, 11, true);
    band(incomeRow, MINT, GREEN_DARK, 12);
    if (blockedRow) band(blockedRow, SKY, BLUE_DEEP, 11);

    if (count > 0) {
      ws.autoFilter = {
        from: { row: HEADER_ROW, column: 1 },
        to: { row: lastBodyRow, column: COLUMNS.length },
      };
    }

    after(() =>
      console.info(
        `[export] owner=${owner.email} rows=${count} filter=${JSON.stringify({
          q: query.q,
          from: query.from,
          to: query.to,
          status: query.status,
        })}`,
      ),
    );

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename(query, now)}"`,
        'Content-Length': String((buffer as ArrayBuffer).byteLength),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Row 7: the title, the meta line, the six figures and a spacer come first. */
const HEADER_ROW = 7;
/** Nothing is ever wider than this; past it the column wraps instead. */
const MAX_WIDTH = 46;
/** Room for the filter button Excel paints over the right of each heading. */
const ARROW = 4;
const MONEY = '"₹"#,##0.00';

/* ─────────────────────────────────────────────────────────────── palette */
/* The site's own tokens (app/globals.css) as ARGB, so the workbook reads as
   the same product as the desk it came from, not a default Excel grid. */
const INK = 'FF101817';
const INK_SOFT = 'FF3D4A48';
const MUTED = 'FF6B7876';
const WHITE = 'FFFFFFFF';
const GREEN_DARK = 'FF15803D';
const GREEN_DEEP = 'FF16A34A';
const MINT = 'FFB9F5C8';
const SOFT_GREEN = 'FFF1FFF5';
const ZEBRA = 'FFF2FAF5';
const SKY = 'FFBDEBFF';
const SOFT_BLUE = 'FFF0FAFF';
const BLUE_DEEP = 'FF0369A1';
const ROSE = 'FF9F1239';
const ROSE_SOFT = 'FFFFE4E8';
const AMBER = 'FF92400E';
const AMBER_SOFT = 'FFFDF1D8';
const LINE = 'FFE4EFE9';

const solid = (argb: string): ExcelJS.FillPattern => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const hair = (argb = LINE): Partial<ExcelJS.Border> => ({ style: 'thin', color: { argb } });
const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longest = (s: string) => s.split('\n').reduce((max, line) => Math.max(max, line.length), 0);

/* ─────────────────────────────────────────────────────────────── columns */

interface Column {
  key: string;
  label: string;
  /** Never narrower than this, however short the content is. */
  min: number;
  /** Never wider than this; a longer value wraps instead. */
  max?: number;
  /** Right-aligned and formatted as a rupee figure. */
  money?: boolean;
  number?: boolean;
}

const COLUMNS = [
  { key: 'Date', label: c.sheet.columns.Date, min: 13 },
  { key: 'Times', label: c.sheet.columns.Times, min: 22, max: 40 },
  { key: 'Players', label: c.sheet.columns.Players, min: 9, number: true },
  { key: 'Customer', label: c.sheet.columns.Customer, min: 16, max: 28 },
  { key: 'Phone', label: c.sheet.columns.Phone, min: 14 },
  { key: 'Email', label: c.sheet.columns.Email, min: 20, max: 34 },
  { key: 'Amount', label: c.sheet.columns.Amount, min: 13, money: true },
  { key: 'Collected', label: c.sheet.columns.Collected, min: 13, money: true },
  { key: 'Refunded', label: c.sheet.columns.Refunded, min: 13, money: true },
  { key: 'Method', label: c.sheet.columns.Method, min: 11 },
  { key: 'Status', label: c.sheet.columns.Status, min: 18, max: 26 },
  { key: 'Transaction', label: c.sheet.columns.Transaction, min: 18, max: 26 },
  { key: 'Order', label: c.sheet.columns.Order, min: 16, max: 26 },
  { key: 'Reference', label: c.sheet.columns.Reference, min: 11 },
  { key: 'Booked', label: c.sheet.columns.Booked, min: 18 },
  { key: 'Cancelled', label: c.sheet.columns.Cancelled, min: 14 },
  { key: 'Reason', label: c.sheet.columns.Reason, min: 16, max: 30 },
  { key: 'MovedFrom', label: c.sheet.columns.MovedFrom, min: 12 },
  { key: 'MovedTo', label: c.sheet.columns.MovedTo, min: 12 },
] as const satisfies readonly Column[];

type ColumnKey = (typeof COLUMNS)[number]['key'];
type Cell = string | number | null;

/**
 * The same list, widened. The literal tuple is what gives `fillAt` its
 * compile-time key checking; widening it is what makes the optional flags
 * readable. Styling reads `COLS`, key checks read `COLUMNS`.
 */
const COLS: readonly Column[] = COLUMNS;

const at = (key: ColumnKey) => COLUMNS.findIndex((col) => col.key === key) + 1;

/** Put values under the columns they belong to, leaving the rest empty. */
function fillAt(values: Partial<Record<ColumnKey, Cell>>): Cell[] {
  return COLUMNS.map((col) => values[col.key] ?? null);
}

function cells(b: OwnerBookingDTO): Cell[] {
  const start = new Date(b.startsAt);
  return fillAt({
    Date: formatDateKey(businessDateKeyOf(start)),
    // Cancelling deletes the Slot rows, so a cancelled booking keeps only
    // its span — the same fallback the desk table uses, so the download and
    // the screen never disagree.
    Times: b.slotStarts.length
      ? describeSlots(b.slotStarts.map((s) => new Date(s)))
      : formatRange(new Date(b.startsAt), new Date(b.endsAt)),
    Players: b.numPeople,
    Customer: b.customer.name ?? '',
    Phone: b.customer.phone ?? '',
    Email: b.customer.email,
    // What the booking is worth: for a block the turf made, that is what the
    // times would have sold for, which is why the status column says so.
    Amount: b.value / 100,
    Collected: b.collected / 100,
    Refunded: (b.refundStatus === 'FAILED' ? 0 : (b.refundAmount ?? 0)) / 100,
    Method: b.bookedByOwner ? '—' : b.paymentMethod ? (c.methods[b.paymentMethod] ?? b.paymentMethod) : '',
    Status: b.bookedByOwner ? `${statusWord(b)} · ${c.sheet.ownerBlock}` : statusWord(b),
    Transaction: b.transactionId ?? '',
    Order: b.orderId ?? '',
    Reference: b.id.slice(-6).toUpperCase(),
    Booked: formatDateTime(new Date(b.createdAt)),
    Cancelled: b.cancelledAt ? formatDateTime(new Date(b.cancelledAt)) : '',
    Reason: b.cancelReason ? (c.cancelReasons[b.cancelReason] ?? b.cancelReason) : '',
    MovedFrom: b.rescheduledFromId?.slice(-6).toUpperCase() ?? '',
    MovedTo: b.rescheduledToId?.slice(-6).toUpperCase() ?? '',
  });
}

const statusWord = (b: OwnerBookingDTO) =>
  b.status === 'CANCELLED' ? 'Cancelled' : b.status === 'PENDING' ? 'Awaiting payment' : 'Confirmed';

/* ──────────────────────────────────────────────────────────────── styling */

interface Kpi {
  key: keyof typeof c.sheet.kpi;
  /** The box's own tint, and the ink that reads on it. */
  tint: string;
  ink: string;
  money?: boolean;
  value: (t: OwnerTotals) => number;
}

/** The six figures across the top, in the order the desk shows them. */
const KPIS: readonly Kpi[] = [
  { key: 'entries', tint: SOFT_BLUE, ink: BLUE_DEEP, value: (t: OwnerTotals) => t.entries },
  { key: 'players', tint: SOFT_GREEN, ink: GREEN_DARK, value: (t: OwnerTotals) => t.players },
  { key: 'collected', tint: SOFT_GREEN, ink: GREEN_DARK, money: true, value: (t: OwnerTotals) => t.collected / 100 },
  { key: 'refunded', tint: ROSE_SOFT, ink: ROSE, money: true, value: (t: OwnerTotals) => t.refunded / 100 },
  { key: 'income', tint: MINT, ink: GREEN_DARK, money: true, value: (t: OwnerTotals) => t.income / 100 },
  { key: 'blocked', tint: SKY, ink: BLUE_DEEP, money: true, value: (t: OwnerTotals) => t.blocked / 100 },
];

/**
 * Where each of the six boxes starts and ends, in column numbers. Two columns
 * each, so all six are on screen at once — a figure you have to scroll right
 * to find is a figure nobody reads.
 */
const KPI_SPANS: Array<[number, number]> = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12],
];

/** One body row: zebra stripe, hairline grid, and colour where it means something. */
function body(row: ExcelJS.Row, b: OwnerBookingDTO, striped: boolean) {
  const dead = b.status === 'CANCELLED';
  row.font = { size: 10, color: { argb: dead ? ROSE : INK_SOFT } };
  for (let i = 1; i <= COLUMNS.length; i++) {
    const cell = row.getCell(i);
    cell.border = { top: hair(), bottom: hair(), left: hair(), right: hair() };
    if (striped) cell.fill = solid(ZEBRA);
  }

  const tone = b.bookedByOwner
    ? { bg: SKY, fg: BLUE_DEEP }
    : dead
      ? { bg: ROSE_SOFT, fg: ROSE }
      : b.status === 'PENDING'
        ? { bg: AMBER_SOFT, fg: AMBER }
        : { bg: MINT, fg: GREEN_DARK };
  const status = row.getCell(at('Status'));
  status.fill = solid(tone.bg);
  status.font = { bold: true, size: 10, color: { argb: tone.fg } };

  // The day and the name are what an owner scans down; the money is what
  // they check. Everything else stays quiet.
  const strong = { bold: true, size: 10, color: { argb: dead ? ROSE : INK } };
  row.getCell(at('Date')).font = strong;
  row.getCell(at('Customer')).font = strong;
  if (b.collected > 0) {
    row.getCell(at('Collected')).font = { bold: true, size: 10, color: { argb: GREEN_DARK } };
  }
  if (b.refundAmount && b.refundStatus !== 'FAILED') {
    row.getCell(at('Refunded')).font = { bold: true, size: 10, color: { argb: ROSE } };
  }
  if (b.refundStatus === 'FAILED') {
    const cell = row.getCell(at('Reason'));
    cell.fill = solid(ROSE_SOFT);
    cell.font = { bold: true, size: 10, color: { argb: ROSE } };
  }
}

/** The column headings: dark, bold, and frozen above everything. */
function header(row: ExcelJS.Row) {
  row.height = 26;
  row.font = { bold: true, size: 10, color: { argb: WHITE } };
  for (let i = 1; i <= COLS.length; i++) {
    const col = COLS[i - 1];
    const cell = row.getCell(i);
    cell.fill = solid(INK);
    cell.border = { bottom: { style: 'medium', color: { argb: GREEN_DEEP } }, right: hair(INK_SOFT) };
    // A right-aligned heading hugs the very edge the filter button is drawn
    // on, so it reads as "Amou▾". The indent moves it clear of the button.
    cell.alignment = {
      vertical: 'middle',
      horizontal: col.money ? 'right' : col.number ? 'center' : 'left',
      indent: col.money ? 2 : col.number ? 0 : 1,
      wrapText: false,
    };
  }
}

/** The title, the line that says what this download is, and the six figures. */
function banner(ws: ExcelJS.Worksheet, turfName: string) {
  const span = COLUMNS.length;

  const titleRow = ws.getRow(1);
  titleRow.height = 34;
  for (let i = 1; i <= span; i++) titleRow.getCell(i).fill = solid(INK);
  const title = titleRow.getCell(1);
  title.value = fill(c.sheet.title, { turf: turfName });
  title.font = { bold: true, size: 18, color: { argb: WHITE } };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.mergeCells(1, 1, 1, span);

  const metaRow = ws.getRow(2);
  metaRow.height = 20;
  for (let i = 1; i <= span; i++) metaRow.getCell(i).fill = solid(GREEN_DEEP);
  const meta = metaRow.getCell(1);
  meta.font = { bold: true, size: 10, color: { argb: WHITE } };
  meta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.mergeCells(2, 1, 2, span);

  ws.getRow(3).height = 7;

  const labels = ws.getRow(4);
  const values = ws.getRow(5);
  labels.height = 17;
  values.height = 27;
  KPIS.forEach((kpi, i) => {
    const [from, to] = KPI_SPANS[i];
    for (let col = from; col <= to; col++) {
      labels.getCell(col).fill = solid(kpi.tint);
      values.getCell(col).fill = solid(kpi.tint);
    }
    const label = labels.getCell(from);
    label.font = { bold: true, size: 9, color: { argb: kpi.ink } };
    label.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    label.border = { top: { style: 'medium', color: { argb: kpi.ink } } };

    const value = values.getCell(from);
    value.font = { bold: true, size: 15, color: { argb: kpi.ink } };
    value.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    value.numFmt = kpi.money ? MONEY : '#,##0';
    value.border = { bottom: { style: 'thin', color: { argb: kpi.ink } } };

    ws.mergeCells(4, from, 4, to);
    ws.mergeCells(5, from, 5, to);
  });

  ws.getRow(6).height = 9;
}

/** One of the summary bands under the table — a full-width block of colour. */
function band(row: ExcelJS.Row, bg: string, fg: string, size: number, top = false) {
  row.height = 22;
  for (let i = 1; i <= COLUMNS.length; i++) {
    const cell = row.getCell(i);
    cell.fill = solid(bg);
    cell.font = { bold: true, size, color: { argb: fg } };
    if (top) cell.border = { top: { style: 'medium', color: { argb: GREEN_DEEP } } };
  }
  for (const col of [1, 2]) {
    row.getCell(col).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }
}

/* ─────────────────────────────────────────────────────────────── helpers */

/** Values laid out at the start of each of the six boxes. */
function spread(values: readonly (string | number)[]): Cell[] {
  const row: Cell[] = COLUMNS.map(() => null);
  KPI_SPANS.forEach(([from], i) => {
    row[from - 1] = values[i] ?? null;
  });
  return row;
}

/** The single line under the title: what was asked for, and when. */
function metaLine(q: OwnerQuery, now: Date): string {
  const m = c.sheet.meta;
  return [
    c.sheet.subtitle,
    `${m.dates}: ${rangeText(q)}`,
    `${m.filter}: ${c.filters.chip.status[q.status] ?? m.all}`,
    `${m.search}: ${q.q ?? m.none}`,
    `${m.generated}: ${formatDateTime(now)}`,
  ].join('   ·   ');
}

function rangeText(q: OwnerQuery): string {
  const m = c.sheet.meta;
  if (q.from && q.to && q.from === q.to) return fill(m.on, { value: formatDateKey(q.from) });
  if (q.from && q.to) return fill(m.range, { from: formatDateKey(q.from), to: formatDateKey(q.to) });
  if (q.from) return fill(m.from, { value: formatDateKey(q.from) });
  if (q.to) return fill(m.to, { value: formatDateKey(q.to) });
  return m.allDates;
}

function filename(q: OwnerQuery, now: Date): string {
  const span = q.from && q.to ? `${q.from}-to-${q.to}` : (q.from ?? q.to ?? businessDateKeyOf(now));
  // Built from parsed dates only — never from anything the caller typed.
  return `bookings-${span}.xlsx`.replace(/[^a-zA-Z0-9.\-]/g, '');
}
