import { useEffect, useRef, useState } from 'react';
import { supabaseAdmin as supabase } from '../lib/supabase';

// Той самий системний акаунт, що й у ListingsPage — від його імені
// адмінка публікує оголошення маркетплейсу.
const SYSTEM_SELLER_ID = '42c09412-c566-4c5d-8bd4-c127f0af4bb3';

type Kind = 'products' | 'listings';

interface Named { id: string; name: string; slug?: string }
interface ModelOpt { id: string; brand_id: string; name: string }

interface ParsedRow {
  line: number;
  payload: Record<string, unknown> | null;
  title: string;
  errors: string[];
}

const COLUMNS: Record<Kind, { key: string; hint: string }[]> = {
  products: [
    { key: 'category', hint: 'назва або slug категорії (обов.)' },
    { key: 'brand', hint: 'назва бренду (обов.)' },
    { key: 'model', hint: 'назва моделі (якщо є в довіднику)' },
    { key: 'title', hint: 'назва товару (обов.)' },
    { key: 'price_usd', hint: 'ціна $ (обов.)' },
    { key: 'price_uah', hint: 'ціна ₴ (обов.)' },
    { key: 'condition', hint: 'new / used / parts (за замовч. new)' },
    { key: 'groups', hint: 'к-сть груп' },
    { key: 'year', hint: 'рік' },
    { key: 'boiler', hint: 'бойлер' },
    { key: 'warranty_months', hint: 'гарантія, міс.' },
    { key: 'description', hint: 'опис' },
    { key: 'stock_count', hint: 'залишок (0 = немає в наявності)' },
    { key: 'is_featured', hint: '1/0' },
    { key: 'is_hit', hint: '1/0' },
    { key: 'credit_available', hint: '1/0' },
    { key: 'photos', hint: 'URL фото через |' },
  ],
  listings: [
    { key: 'category', hint: 'назва або slug категорії (обов.)' },
    { key: 'brand', hint: 'назва бренду (обов.)' },
    { key: 'model', hint: 'назва моделі з довідника (обов.)' },
    { key: 'price_usd', hint: 'ціна $ (обов.)' },
    { key: 'price_uah', hint: 'ціна ₴ (обов.)' },
    { key: 'condition', hint: 'new / used / parts (за замовч. used)' },
    { key: 'groups', hint: 'к-сть груп' },
    { key: 'year', hint: 'рік' },
    { key: 'city', hint: 'місто (за замовч. Вся Україна)' },
    { key: 'description', hint: 'опис' },
    { key: 'status', hint: 'approved / pending (за замовч. approved)' },
    { key: 'safe_payment_enabled', hint: '1/0' },
    { key: 'photos', hint: 'URL фото через |' },
  ],
};

const EXAMPLE: Record<Kind, string[]> = {
  products: ['Кавомашини', 'La Marzocco', 'Linea Mini', 'La Marzocco Linea Mini', '4500', '185000', 'new', '2', '2024', '3.5 л', '12', 'Компактна професійна машина', '3', '1', '0', '0', 'https://example.com/1.jpg|https://example.com/2.jpg'],
  listings: ['Кавомашини', 'La Marzocco', 'Linea Mini', '3200', '132000', 'used', '2', '2021', 'Київ', 'Стан відмінний', 'approved', '0', 'https://example.com/1.jpg'],
};

// Мінімальний CSV-парсер: лапки, "" як екранована лапка, переноси рядків
// усередині лапок. Роздільник (, або ;) визначаємо по першому рядку —
// Excel в українській локалі зберігає CSV з ";".
function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function csvEscape(v: string) {
  return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadTemplate(kind: Kind) {
  const header = COLUMNS[kind].map((c) => c.key).join(';');
  const example = EXAMPLE[kind].map(csvEscape).join(';');
  // BOM — щоб Excel відкрив кирилицю правильно.
  const blob = new Blob(['﻿' + header + '\n' + example + '\n'], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = kind === 'products' ? 'products-template.csv' : 'listings-template.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

const norm = (s: string) => s.trim().toLowerCase();
const num = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
const flag = (s: string) => ['1', 'true', 'так', 'yes', 'y', '+'].includes(norm(s));

export default function BulkImportPage() {
  const [kind, setKind] = useState<Kind>('products');
  const [categories, setCategories] = useState<Named[]>([]);
  const [brands, setBrands] = useState<Named[]>([]);
  const [models, setModels] = useState<ModelOpt[]>([]);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: b }, { data: m }] = await Promise.all([
        supabase.from('categories').select('id, name, slug'),
        supabase.from('brands').select('id, name'),
        supabase.from('models').select('id, brand_id, name'),
      ]);
      setCategories(c ?? []);
      setBrands(b ?? []);
      setModels(m ?? []);
    })();
  }, []);

  function reset() {
    setRows([]);
    setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function switchKind(k: Kind) {
    setKind(k);
    reset();
  }

  function buildRow(get: (k: string) => string, line: number): ParsedRow {
    const errors: string[] = [];
    const cat = categories.find((c) => norm(c.name) === norm(get('category')) || (c.slug && norm(c.slug) === norm(get('category'))));
    if (!cat) errors.push(`категорію "${get('category')}" не знайдено`);
    const brand = brands.find((b) => norm(b.name) === norm(get('brand')));
    if (!brand) errors.push(`бренд "${get('brand')}" не знайдено`);
    const model = brand ? models.find((m) => m.brand_id === brand.id && norm(m.name) === norm(get('model'))) : undefined;
    const priceUsd = num(get('price_usd'));
    const priceUah = num(get('price_uah'));
    if (!(priceUsd > 0)) errors.push('некоректна price_usd');
    if (!(priceUah > 0)) errors.push('некоректна price_uah');

    const condition = norm(get('condition')) || (kind === 'products' ? 'new' : 'used');
    if (!['new', 'used', 'parts'].includes(condition)) errors.push(`condition "${condition}" — має бути new/used/parts`);

    const optInt = (k: string) => {
      const v = get(k).trim();
      if (!v) return null;
      const n = Math.trunc(num(v));
      if (!Number.isFinite(n)) { errors.push(`некоректне поле ${k}`); return null; }
      return n;
    };
    const photos = get('photos').split('|').map((s) => s.trim()).filter(Boolean);

    const base = {
      brand_id: brand?.id,
      category_id: cat?.id,
      price_usd: priceUsd,
      price_uah: priceUah,
      condition,
      groups: optInt('groups'),
      year: optInt('year'),
      description: get('description').trim(),
      photos,
    };

    if (kind === 'products') {
      const title = get('title').trim();
      if (!title) errors.push('порожня назва');
      const stock = optInt('stock_count') ?? 0;
      const warranty = optInt('warranty_months');
      return {
        line,
        title,
        errors,
        payload: errors.length ? null : {
          ...base,
          title,
          model_id: model?.id ?? null,
          boiler: get('boiler').trim() || null,
          warranty_months: warranty,
          stock_count: stock,
          in_stock: stock > 0,
          is_featured: flag(get('is_featured')),
          is_hit: flag(get('is_hit')),
          credit_available: flag(get('credit_available')),
          is_coffee_one_seller: true,
        },
      };
    }

    if (!model) errors.push(`модель "${get('model')}" не знайдено для цього бренду`);
    const status = norm(get('status')) || 'approved';
    if (!['approved', 'pending'].includes(status)) errors.push(`status "${status}" — має бути approved/pending`);
    const title = `${get('brand').trim()} ${get('model').trim()}`;
    return {
      line,
      title,
      errors,
      payload: errors.length ? null : {
        ...base,
        title,
        model_id: model!.id,
        city: get('city').trim() || 'Вся Україна',
        status,
        safe_payment_enabled: flag(get('safe_payment_enabled')),
        is_coffee_one_seller: true,
        user_id: SYSTEM_SELLER_ID,
      },
    };
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const table = parseCsv(await file.text());
    if (table.length < 2) {
      setRows([]);
      alert('Файл порожній або містить лише заголовок');
      return;
    }
    const header = table[0].map(norm);
    const required = COLUMNS[kind].filter((c) => c.hint.includes('(обов.)')).map((c) => c.key);
    const missing = required.filter((k) => !header.includes(k));
    if (missing.length) {
      setRows([]);
      alert(`У файлі немає обов'язкових колонок: ${missing.join(', ')}. Завантажте шаблон і використайте його заголовки.`);
      return;
    }
    setRows(table.slice(1).map((cells, i) => {
      const get = (k: string) => {
        const idx = header.indexOf(k);
        return idx >= 0 ? (cells[idx] ?? '') : '';
      };
      return buildRow(get, i + 2);
    }));
  }

  const valid = rows.filter((r) => r.payload);
  const invalid = rows.filter((r) => !r.payload);

  async function runImport() {
    if (valid.length === 0) return;
    if (!confirm(`Імпортувати ${valid.length} ${kind === 'products' ? 'товарів' : 'оголошень'}?`)) return;
    setImporting(true);
    setResult(null);
    let done = 0;
    const failures: string[] = [];
    const table = kind === 'products' ? 'products' : 'listings';
    for (let i = 0; i < valid.length; i += 50) {
      const chunk = valid.slice(i, i + 50);
      const { error } = await supabase.from(table).insert(chunk.map((r) => r.payload!));
      if (error) failures.push(`рядки ${chunk[0].line}–${chunk[chunk.length - 1].line}: ${error.message}`);
      else done += chunk.length;
    }
    setImporting(false);
    setResult(`Імпортовано: ${done} з ${valid.length}.${failures.length ? ' Помилки — ' + failures.join('; ') : ''}`);
    if (!failures.length) {
      setRows([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#20303C]">Масовий імпорт</h1>
        <p className="text-[#8893A2] mt-1">Завантаження товарів магазину або оголошень маркетплейсу з CSV-файлу (Excel: «Зберегти як → CSV UTF-8»)</p>
      </div>

      <div className="flex gap-2 mb-5">
        {(['products', 'listings'] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => switchKind(k)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold ${kind === k ? 'bg-[#187FD8] text-white' : 'bg-white text-[#546070] border border-[#D7DFEA]'}`}
          >
            {k === 'products' ? '🛍 Товари магазину' : '🔍 Маркетплейс'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 mb-5 border border-[#E5EAF1]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[#20303C]">Колонки файлу</h2>
          <button onClick={() => downloadTemplate(kind)} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#EAF3FC] text-[#187FD8] hover:bg-[#D9EAFA]">
            ⬇ Завантажити шаблон
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-[#546070]">
          {COLUMNS[kind].map((c) => (
            <li key={c.key}><span className="font-mono font-bold text-[#20303C]">{c.key}</span> — {c.hint}</li>
          ))}
        </ul>
        <p className="text-xs text-[#8893A2] mt-3">
          Бренд, категорія й модель мають уже існувати в довідниках. Фото — посилання (URL) через «|».
          {kind === 'listings' && ' Оголошення публікуються від імені системного акаунта Coffee One.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#E5EAF1]">
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0])} className="text-sm" />

        {rows.length > 0 && (
          <>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="font-bold text-[#20303C]">{fileName}</span>
              <span className="text-green-600 font-bold">✓ готово: {valid.length}</span>
              {invalid.length > 0 && <span className="text-red-600 font-bold">✗ з помилками: {invalid.length}</span>}
            </div>

            {invalid.length > 0 && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-red-50 p-3 text-sm text-red-700 space-y-1">
                {invalid.map((r) => (
                  <div key={r.line}>Рядок {r.line}{r.title ? ` («${r.title}»)` : ''}: {r.errors.join('; ')}</div>
                ))}
              </div>
            )}

            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-[#E5EAF1]">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F7FA] text-left text-[#546070]">
                  <tr><th className="p-2">Рядок</th><th className="p-2">Назва</th><th className="p-2">$</th><th className="p-2">₴</th><th className="p-2">Стан</th></tr>
                </thead>
                <tbody>
                  {valid.slice(0, 100).map((r) => (
                    <tr key={r.line} className="border-t border-[#E5EAF1]">
                      <td className="p-2">{r.line}</td>
                      <td className="p-2">{r.title}</td>
                      <td className="p-2">{String(r.payload!.price_usd)}</td>
                      <td className="p-2">{String(r.payload!.price_uah)}</td>
                      <td className="p-2">{String(r.payload!.condition)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {valid.length > 100 && <div className="p-2 text-xs text-[#8893A2]">…і ще {valid.length - 100}</div>}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={runImport}
                disabled={importing || valid.length === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#187FD8] text-white hover:bg-[#1169B8] disabled:opacity-50"
              >
                {importing ? 'Імпортую…' : `Імпортувати ${valid.length}`}
              </button>
              <button onClick={reset} disabled={importing} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F5F7FA] text-[#546070]">Скасувати</button>
            </div>
            {invalid.length > 0 && <p className="text-xs text-[#8893A2] mt-2">Рядки з помилками буде пропущено.</p>}
          </>
        )}

        {result && <div className="mt-4 text-sm font-bold text-[#20303C]">{result}</div>}
      </div>
    </div>
  );
}
