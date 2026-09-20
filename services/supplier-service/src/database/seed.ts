/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated standalone development seed script that reads data/csv/supplier-seed-data.csv
 *        and upserts the rows into PostgreSQL via Prisma (including a minimal CSV parser and
 *        a Windows-1252 decoding fallback for the non-UTF-8 apostrophes in the CSV).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
//
// Standalone DEVELOPMENT script — not imported by the running application.
// Populates the supplier database with the initial seed data from the CSV.
//
// Usage (from services/supplier-service, after `prisma migrate dev` has created the tables):
//   npx tsx src/database/seed.ts                  # uses the default CSV path below
//   npx tsx src/database/seed.ts path/to/file.csv # or pass a CSV path explicitly
//   SEED_CSV_PATH=path/to/file.csv npx tsx src/database/seed.ts
//
// The script is idempotent: rows are upserted by supplier name, so re-running it
// updates existing suppliers rather than creating duplicates.

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './client';

// Repo root is four levels up: src/database -> src -> supplier-service -> services -> <root>
const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../../data/csv/supplier-seed-data.csv');

// Column headers exactly as they appear in the CSV.
const CSV_HEADERS = [
  'Name',
  'Type',
  'Building',
  'Floor',
  'Location Description',
  'Latitude',
  'Longitude',
  'StartingTime',
  'ClosingTime',
  'ImageURL',
] as const;

type CsvRow = Record<(typeof CSV_HEADERS)[number], string>;

// Reads the CSV as UTF-8, falling back to Windows-1252 if the file contains bytes
// that are not valid UTF-8 (the seed file has 0x92 "’" characters in a few names).
function readCsvText(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8.includes('�')) return utf8;
  return new TextDecoder('windows-1252').decode(buffer);
}

// Minimal RFC-4180-style CSV parser: handles quoted fields, embedded commas,
// doubled quotes inside quoted fields, and CRLF / LF line endings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignore; the following '\n' terminates the row
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the last row if the file does not end with a newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop completely empty rows (e.g. trailing blank line)
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function toRecords(rows: string[][]): CsvRow[] {
  const [header, ...body] = rows;
  const expected = CSV_HEADERS.join(',');
  const actual = header.map((h) => h.trim()).join(',');
  if (actual !== expected) {
    throw new Error(`Unexpected CSV header.\n  expected: ${expected}\n  actual:   ${actual}`);
  }

  return body.map((cells, index) => {
    if (cells.length !== CSV_HEADERS.length) {
      throw new Error(`Row ${index + 2} has ${cells.length} columns, expected ${CSV_HEADERS.length}`);
    }
    const record = {} as CsvRow;
    CSV_HEADERS.forEach((key, i) => {
      record[key] = cells[i].trim();
    });
    return record;
  });
}

function parseCoordinate(value: string, label: string, name: string): number | null {
  if (value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid ${label} "${value}" for supplier "${name}"`);
  }
  return n;
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

async function seedSuppliers(csvPath: string) {
  console.log(`[seed] Reading suppliers from ${csvPath}`);
  const records = toRecords(parseCsv(readCsvText(csvPath)));
  console.log(`[seed] Parsed ${records.length} supplier rows`);

  let created = 0;
  let updated = 0;

  for (const r of records) {
    const data = {
      name: r.Name,
      type: emptyToNull(r.Type),
      building: emptyToNull(r.Building),
      floor: emptyToNull(r.Floor),
      locationDescription: emptyToNull(r['Location Description']),
      latitude: parseCoordinate(r.Latitude, 'latitude', r.Name),
      longitude: parseCoordinate(r.Longitude, 'longitude', r.Name),
      startingTime: emptyToNull(r.StartingTime),
      closingTime: emptyToNull(r.ClosingTime),
      imageUrl: emptyToNull(r.ImageURL),
    };

    const existing = await prisma.supplier.findUnique({ where: { name: data.name } });
    await prisma.supplier.upsert({
      where: { name: data.name },
      create: data,
      update: data,
    });

    if (existing) updated++;
    else created++;
    console.log(`[seed]   ${existing ? 'updated' : 'created'}: ${data.name}`);
  }

  console.log(`[seed] Done. created=${created} updated=${updated}`);
}

async function main() {
  const csvPath = path.resolve(process.argv[2] ?? process.env.SEED_CSV_PATH ?? DEFAULT_CSV_PATH);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  await seedSuppliers(csvPath);

  // TODO: add any other one-off development create operations here
  // (e.g. additional fixtures, lookup tables) as the schema grows.
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
