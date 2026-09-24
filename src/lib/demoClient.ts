// In-memory stand-in for the Supabase client, used only in demo mode (`npm run demo`).
// It never touches the network: every query runs against the sample data below, and changes
// live only until the page reloads. Only the calls the app actually uses are implemented.

import { format, subDays } from 'date-fns';

type Row = Record<string, any>;

const day = (daysAgo: number) => format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
const uid = () => crypto.randomUUID();

const LOC_MAIN = 'loc-main';
const LOC_STORE = 'loc-store';
const ADMIN_ID = 'demo-admin';

// Sample data for previewing the interface; not real stock.
const itemSeed: [string, number][] = [
  ['أوكسي تتراسيكلين ٢٠٪ عبوة ١٠٠ مل', 14],
  ['إيفرمكتين ١٪ عبوة ٥٠ مل', 9],
  ['بنسلين ستربتومايسين فيال', 22],
  ['ديكساميثازون أمبول', 0],
  ['ألبندازول ٢٫٥٪ عبوة لتر', 3],
  ['محلول ملحي ٠٫٩٪ عبوة ٥٠٠ مل', 31],
  ['بيتادين ١٠٪ عبوة ١٢٠ مل', 6],
  ['سرنجات ٥ مل', 140],
  ['قطن طبي لفة ٥٠٠ جم', 4],
];

const items: Row[] = itemSeed.map(([name, qty], i) => ({
  id: `item-${i}`,
  name,
  currentQuantity: qty,
  locationId: LOC_MAIN,
  createdAt: day(60),
}));

const transactions: Row[] = [];
items.forEach((item, i) => {
  // Opening stock, then a consumption every week, leaving the current quantity above.
  const weekly = [(i % 3) + 1, (i % 4) + 2, (i % 2) + 1, (i % 5) + 1];
  const consumed = weekly.reduce((a, b) => a + b, 0);
  transactions.push({
    id: uid(), itemId: item.id, itemName: item.name, type: 'إضافة',
    quantity: item.currentQuantity + consumed, date: day(35),
    locationId: LOC_MAIN, userId: ADMIN_ID, createdAt: day(35),
  });
  weekly.forEach((q, w) => {
    transactions.push({
      id: uid(), itemId: item.id, itemName: item.name, type: 'استهلاك',
      quantity: q, date: day(27 - w * 7 - (i % 3)),
      locationId: LOC_MAIN, userId: ADMIN_ID, createdAt: day(27 - w * 7),
    });
  });
});

const db: Record<string, Row[]> = {
  locations: [
    { id: LOC_MAIN, name: 'وحدة جزيرة شندويل البيطرية', createdAt: day(90) },
    { id: LOC_STORE, name: 'المخزن الفرعي', createdAt: day(90) },
  ],
  users: [
    { id: ADMIN_ID, email: 'demo@example.com', role: 'ADMIN', locationIds: [], nickname: 'حساب المعاينة', avatar_base64: null, createdAt: day(90) },
    { id: 'demo-clerk', email: 'clerk@example.com', role: 'CLIENT', locationIds: [LOC_MAIN], nickname: 'أمين العهدة', avatar_base64: null, createdAt: day(80) },
    { id: 'demo-viewer', email: 'viewer@example.com', role: 'MANAGER', locationIds: [LOC_MAIN, LOC_STORE], nickname: 'مراقب المخزون', avatar_base64: null, createdAt: day(70) },
  ],
  items,
  transactions,
  reconciliations: [
    { id: uid(), locationId: LOC_MAIN, date: day(29), note: 'مطابقة بحضور لجنة الجرد', createdBy: ADMIN_ID, createdat: day(29) },
    { id: uid(), locationId: LOC_MAIN, date: day(12), note: null, createdBy: ADMIN_ID, createdat: day(12) },
  ],
};

class Query implements PromiseLike<{ data: any; error: any }> {
  private filters: ((r: Row) => boolean)[] = [];
  private sort: { col: string; asc: boolean } | null = null;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private returnRows = false;
  private one = false;

  constructor(private table: string) {}

  select() { this.returnRows = true; return this; }
  insert(payload: Row | Row[]) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload: Row) { this.op = 'update'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col: string, val: any) { this.filters.push(r => r[col] === val); return this; }
  in(col: string, vals: any[]) { this.filters.push(r => vals.includes(r[col])); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.sort = { col, asc: opts?.ascending !== false }; return this; }
  single() { this.one = true; return this; }

  private run() {
    const rows = db[this.table] ?? (db[this.table] = []);
    const match = (r: Row) => this.filters.every(f => f(r));
    let result: Row[] = [];

    if (this.op === 'select') {
      result = rows.filter(match).map(r => ({ ...r }));
    } else if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
      result = list.map(p => ({ id: uid(), createdAt: new Date().toISOString(), ...p }));
      rows.push(...result);
    } else if (this.op === 'update') {
      result = rows.filter(match);
      result.forEach(r => Object.assign(r, this.payload));
    } else {
      result = rows.filter(match);
      db[this.table] = rows.filter(r => !match(r));
    }

    if (this.sort) {
      const { col, asc } = this.sort;
      result.sort((a, b) => String(a[col]).localeCompare(String(b[col]), 'ar') * (asc ? 1 : -1));
    }
    if (this.one) {
      return result[0]
        ? { data: result[0], error: null }
        : { data: null, error: { message: 'لا توجد بيانات' } };
    }
    return { data: this.op === 'select' || this.returnRows ? result : null, error: null };
  }

  then<A = { data: any; error: any }, B = never>(
    onFulfilled?: ((v: { data: any; error: any }) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: any) => B | PromiseLike<B>) | null
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(onFulfilled, onRejected);
  }
}

// Open the page with ?screen=login to preview the sign-in screen instead of the app.
const startSignedOut = new URLSearchParams(window.location.search).get('screen') === 'login';
const demoUser = { id: ADMIN_ID, email: 'demo@example.com' };
let session: any = startSignedOut ? null : { user: demoUser, access_token: 'demo' };
const listeners = new Set<(event: string, s: any) => void>();
const emit = (event: string) => listeners.forEach(l => l(event, session));

export const demoClient: any = {
  from: (table: string) => new Query(table),
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: (cb: (event: string, s: any) => void) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    signInWithPassword: async () => {
      session = { user: demoUser, access_token: 'demo' };
      emit('SIGNED_IN');
      return { data: { session }, error: null };
    },
    signOut: async () => { session = null; emit('SIGNED_OUT'); return { error: null }; },
    // Used by user management to create accounts; does not change the current session.
    signUp: async ({ email }: { email: string }) => ({ data: { user: { id: uid(), email } }, error: null }),
    updateUser: async () => ({ data: { user: demoUser }, error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
  },
};
