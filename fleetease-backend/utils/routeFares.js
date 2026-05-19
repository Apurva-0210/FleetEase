// Fixed route fares and peak-season logic for Fleetease
// Customer fares are fixed per route unless peak season applies.
// Corporate pricing can use fixed table or cost-plus (distance & expenses) or combined.

const PEAK_WINDOWS = [
  // Diwali (approx late Oct/Nov) – use a broad window
  { start: { m: 10, d: 15 }, end: { m: 11, d: 20 } },
  // Holi (Mar)
  { start: { m: 3, d: 1 }, end: { m: 3, d: 31 } },
  // Exam season (Apr-May)
  { start: { m: 4, d: 1 }, end: { m: 5, d: 31 } },
];

const PEAK_MULTIPLIER = 1.0; // Peak disabled to match fixed table exactly

// Normalized key builder for route mapping
function routeKey(src, dst){
  return `${String(src||'').trim().toLowerCase()}__${String(dst||'').trim().toLowerCase()}`;
}

// Bus type normalization
function normalizeBusType(t){
  const s = String(t||'')
    .toLowerCase()
    .replace(/\*/g,'x')
    .replace(/bus/g,'')
    .replace(/-/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return s;
}

function canonicalBusType(t){
  const s = normalizeBusType(t);
  const has = (k)=> s.includes(k);
  // Map common patterns to canonical keys used in table
  if (has('2x1') && has('lower') && has('sleeper') && has('ac')) return '2x1 lower sleeper ac';
  if (has('2x1') && has('48') && has('ac')) return '2x1 48 seat ac';
  if (has('2x1') && (has('sleeper') || has('lower'))) return '2x1 lower sleeper';
  if (has('2x2') && has('seat') && has('sleeper')) return '2x2 seat sleeper';
  if (has('2x2') && has('non') && has('ac')) return '2x2 non-ac';
  if (has('2x2') && has('ac')) return '2x2 ac';
  if (has('2x2')) return '2x2 ac';
  return s; // fallback to raw-normalized
}

// Corporate per-day rate by bus type (route-agnostic)
// Derived from provided corporate fares; treated as daily rates
const CORPORATE_DAILY_BY_TYPE = new Map([
  [normalizeBusType('2x2 AC'), 20000],
  [normalizeBusType('2x1 Lower Sleeper AC'), 35000],
  [normalizeBusType('2x1 48 seat AC'), 30000],
  [normalizeBusType('2x2 Non-AC'), 15000],
  [normalizeBusType('2x1 Lower Sleeper'), 38000],
  [normalizeBusType('2x2 Seat Sleeper'), 30000],
]);

function getCorporateDailyRate(busType){
  return CORPORATE_DAILY_BY_TYPE.get(normalizeBusType(busType)) || null;
}

// Fares table based on provided image
// Each entry keyed by routeKey, then by normalized bus type.
// Values: { capacity, customerFare, corporateFare }
const ROUTE_FARES = new Map([
  [routeKey('Patna','Purnea'), new Map([
    [canonicalBusType('2x2 Non-AC'), { capacity:41, customerFare:300, corporateFare:15000 }],
    [canonicalBusType('2x2 AC'), { capacity:41, customerFare:350, corporateFare:20000 }],
  ])],
  [routeKey('Purnea','Siliguri'), new Map([
    [normalizeBusType('2x2 AC'), { capacity:41, customerFare:300, corporateFare:20000 }],
  ])],
  [routeKey('Purnea','Patna'), new Map([
    [normalizeBusType('2x1 Lower Sleeper AC'), { capacity:42, customerFare:700, corporateFare:35000 }],
  ])],
  [routeKey('Purnea','Motihari'), new Map([
    [normalizeBusType('2x1 48 seat AC'), { capacity:48, customerFare:550, corporateFare:30000 }],
  ])],
  [routeKey('Purnea','Muzaffarpur'), new Map([
    [normalizeBusType('2x2 Non-AC'), { capacity:41, customerFare:400, corporateFare:15000 }],
  ])],
  [routeKey('Purnea','Darbhanga'), new Map([
    [normalizeBusType('2x2 AC'), { capacity:41, customerFare:250, corporateFare:20000 }],
  ])],
  [routeKey('Bhagalpur','Siliguri'), new Map([
    [normalizeBusType('2x1 Lower Sleeper AC'), { capacity:42, customerFare:550, corporateFare:35000 }],
  ])],
  [routeKey('Siliguri','Patna'), new Map([
    [normalizeBusType('2x1 Lower Sleeper'), { capacity:51, customerFare:700, corporateFare:38000 }],
  ])],
  [routeKey('Siliguri','Gaya'), new Map([
    [normalizeBusType('2x2 Seat Sleeper'), { capacity:62, customerFare:300, corporateFare:30000 }],
  ])],
  [routeKey('Purnea','Bhagalpur'), new Map([
    [normalizeBusType('2x2 Non-AC'), { capacity:41, customerFare:120, corporateFare:15000 }],
  ])],
  [routeKey('Purnea','Kishanganj'), new Map([
    [normalizeBusType('2x2 AC'), { capacity:41, customerFare:100, corporateFare:20000 }],
  ])],
]);

function isPeak(dateLike){
  const d = dateLike ? new Date(dateLike) : new Date();
  const m = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  for (const w of PEAK_WINDOWS){
    const sOk = (m > w.start.m) || (m === w.start.m && day >= w.start.d);
    const eOk = (m < w.end.m) || (m === w.end.m && day <= w.end.d);
    if (sOk && eOk) return true;
  }
  return false;
}

function getFixedFare({ source, destination, busType, date }){
  const rk = routeKey(source, destination);
  const rkRev = routeKey(destination, source);
  const bt = canonicalBusType(busType);
  let m = ROUTE_FARES.get(rk);
  if (!m) m = ROUTE_FARES.get(rkRev);
  if (!m) return null;
  const row = m.get(bt);
  if (!row) return null;
  const peak = false; // disabled
  const multiplier = 1.0;
  return {
    ...row,
    customerFare: Math.round(row.customerFare * multiplier),
    corporateFare: row.corporateFare, // legacy per-route corporate; not used when per-day is enabled
    peak,
    multiplier,
  };
}

module.exports = {
  getFixedFare,
  normalizeBusType,
  routeKey,
  PEAK_MULTIPLIER,
  isPeak,
  getCorporateDailyRate,
};

// Helper to list all fixed routes (source, destination) from the table
module.exports.listFixedRoutes = function listFixedRoutes(){
  const out = [];
  for (const k of ROUTE_FARES.keys()){
    const [s,d] = String(k).split('__');
    if (s && d) out.push({ source: s, destination: d });
  }
  return out;
};
