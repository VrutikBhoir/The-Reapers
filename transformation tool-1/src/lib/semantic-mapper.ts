import type { AnalysisResult, SemanticMapping, SemanticType } from '../types';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (s: string) => norm(s).split(' ').filter(Boolean);

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v: unknown) => {
  if (v === null || v === undefined) return false;
  const digits = String(v).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};
const hasCurrency = (v: unknown) => {
  if (v === null || v === undefined) return false;
  const s = String(v).toLowerCase();
  return /[$€£₹]|(usd|eur|gbp|inr|cad|aud)/.test(s);
};
const isNumeric = (v: unknown) => {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return true;
  const s = String(v).trim();
  if (s === '') return false;
  return !isNaN(Number(s));
};
const isBooleanish = (v: unknown) => {
  if (typeof v === 'boolean') return true;
  const s = String(v).trim().toLowerCase();
  return ['true', 'false', 'yes', 'no', 'y', 'n', '0', '1'].includes(s);
};
const isDateish = (v: unknown) => {
  if (v === null || v === undefined || v === '') return false;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|^\d{4}\/\d{2}\/\d{2}/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

const idTokens = new Set([
  'id','uid','user_id','customer_id','client_id','record_id','invoice','invoice_id','order','order_id',
  'vin','vehicle_id','serial','serial_number','chassis','ticket','case','mrn','patient_id'
]);
const nameTokens = new Set([
  'name','full_name','fullname','first_name','last_name','display_name','given_name','family_name','company','organization','org','title'
]);
const amountTokens = new Set([
  'amount','price','cost','salary','wage','income','revenue','total','balance','msrp','ctc','fee','payment'
]);
const contactTokens = new Set([
  'email','mail','email_address','e-mail','phone','mobile','cell','tel','contact'
]);
const dateTokens = new Set([
  'date','dob','doj','joined_at','created_at','updated_at','timestamp','time','year'
]);
const categoryHintTokens = new Set([
  'status','type','category','class','group','segment','color','make','model','fuel','fuel_type','transmission'
]);
const textTokens = new Set([
  'description','notes','note','comment','remarks','address','summary','details','text'
]);

export const inferSemanticMapping = (analysis: AnalysisResult, data: Array<Record<string, unknown>>): SemanticMapping => {
  const mapping: SemanticMapping = {};
  const cols = analysis.columns.map(c => c.name);

  cols.forEach(col => {
    const vals = data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
    const nonNull = vals.length;
    const uniques = new Set(vals.map(v => String(v)));
    const uniqueRatio = nonNull > 0 ? uniques.size / nonNull : 0;
    const strVals = vals.map(v => String(v));
    const avgLen = strVals.length > 0 ? strVals.reduce((a, b) => a + b.length, 0) / strVals.length : 0;
    const numRatio = nonNull > 0 ? vals.filter(isNumeric).length / nonNull : 0;
    const boolRatio = nonNull > 0 ? vals.filter(isBooleanish).length / nonNull : 0;
    const emailRatio = nonNull > 0 ? vals.filter(isEmail).length / nonNull : 0;
    const phoneRatio = nonNull > 0 ? vals.filter(isPhone).length / nonNull : 0;
    const currencyHit = vals.some(hasCurrency);

    const tks = tokens(col);
    const hasToken = (set: Set<string>) => tks.some(t => set.has(t));

    let inferred: SemanticType | null = null;

    if (emailRatio > 0.5 || phoneRatio > 0.5 || hasToken(contactTokens)) {
      inferred = 'contact_info';
    } else if (boolRatio > 0.7) {
      inferred = 'boolean_flag';
    } else if (hasToken(dateTokens) || (nonNull > 0 && vals.filter(isDateish).length / nonNull > 0.6)) {
      inferred = 'date';
    } else if ((uniqueRatio > 0.9 && avgLen >= 6) || hasToken(idTokens)) {
      inferred = 'identifier';
    } else if ((numRatio > 0.7 && (currencyHit || hasToken(amountTokens)))) {
      inferred = 'numeric_amount';
    } else if (hasToken(nameTokens)) {
      inferred = 'name';
    } else if (hasToken(textTokens) || avgLen > 20) {
      inferred = 'free_text';
    } else if (hasToken(categoryHintTokens) || uniqueRatio < 0.2) {
      inferred = 'categorical';
    } else if (numRatio > 0.7) {
      inferred = 'numeric_amount';
    } else {
      inferred = 'free_text';
    }

    mapping[col] = inferred;
  });

  return mapping;
};
