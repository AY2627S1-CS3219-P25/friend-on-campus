/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Sonnet 5); Google Antigravity Agent, date: 2026-09-29 to 2026-11-04
 * Scope: building/floor are now required columns (part of the new location-uniqueness constraint), so the seed script fails loudly with a clear error if a CSV row is..; updated across 4 AI-assisted revisions through D4 wrap-up (pR #222 review: a reseed (every container start) keeps coordinates an administrator has already recorded and only fills coordinates that are still missing;..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './client';

const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../../data/csv/supplier-seed-data.csv');

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

function readCsvText(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8.includes('')) return utf8;
  return new TextDecoder('windows-1252').decode(buffer);
}

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
      // ignore
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

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

function parseCoordinate(value: string, label: string, name: string): number {
  if (value.trim() === '') {
    throw new Error(`Missing required ${label} for supplier "${name}"`);
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid ${label} "${value}" for supplier "${name}"`);
  }
  return n;
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

function requireField(value: string, label: string, name: string): string {
  if (!value.trim()) {
    throw new Error(`Missing required ${label} for supplier "${name}"`);
  }
  return value.trim();
}

function mapBuildingToCampusZone(building: string | null): string {
  if (!building) return 'Kent Ridge';
  const b = building.toLowerCase();
  if (b.includes('com') || b.includes('terrace')) return 'COM3';
  if (b.includes('town') || b.includes('riady') || b.includes('erc')) return 'UTown';
  if (b.includes('prince george') || b.includes('pgp')) return 'PGPR';
  if (b.includes('central library') || b.includes('clb')) return 'Central Lib';
  if (b.includes('deck') || b.includes('fass') || b.includes('as1') || b.includes('as2')) return 'FASS';
  if (b.includes('science') || b.includes('frontier') || b.includes('s1')) return 'Science';
  if (b.includes('engineering') || b.includes('techno edge') || b.includes('ea') || b.includes('e1')) return 'Engineering';
  return building;
}

export async function seedSuppliers(csvPath: string) {
  console.log(`[seed] Reading suppliers from ${csvPath}`);
  const records = toRecords(parseCsv(readCsvText(csvPath)));
  console.log(`[seed] Parsed ${records.length} supplier rows`);

  let created = 0;
  let updated = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
    const code = `SUP-${String(i + 1).padStart(3, '0')}`;
    const building = requireField(r.Building, 'Building', r.Name);
    const floor = requireField(r.Floor, 'Floor', r.Name);
    const locationDesc = emptyToNull(r['Location Description']);
    const exactLocation = locationDesc || (building && floor ? `${building} Level ${floor}` : building || 'NUS Kent Ridge');
    const campusZone = mapBuildingToCampusZone(building);

    const data = {
      supplierCode: code,
      name: r.Name,
      campusZone,
      exactLocation,
      category: r.Type || 'General',
      description: locationDesc,
      building,
      floor,
      latitude: parseCoordinate(r.Latitude, 'latitude', r.Name),
      longitude: parseCoordinate(r.Longitude, 'longitude', r.Name),
      startingTime: emptyToNull(r.StartingTime),
      closingTime: emptyToNull(r.ClosingTime),
      imageUrl: emptyToNull(r.ImageURL),
      isActive: true,
    };

    const existing = await prisma.supplier.findUnique({ where: { supplierCode: code } });
    await prisma.supplier.upsert({
      where: { supplierCode: code },
      create: { id, ...data },
      update: {
        name: data.name,
        campusZone: data.campusZone,
        exactLocation: data.exactLocation,
        category: data.category,
        description: data.description,
        building: data.building,
        floor: data.floor,
        // An administrator's verified coordinates outrank the CSV on a reseed;
        // only a coordinate that is still missing is filled in. The CSV remains the source for new rows.
        latitude: existing?.latitude ?? data.latitude,
        longitude: existing?.longitude ?? data.longitude,
        startingTime: data.startingTime,
        closingTime: data.closingTime,
        imageUrl: data.imageUrl,
      },
    });

    if (existing) updated++;
    else created++;
    console.log(`[seed]   ${existing ? 'updated' : 'created'} [${code}]: ${data.name}`);
  }

  console.log(`[seed] Done. created=${created} updated=${updated}`);
}

async function main() {
  const csvPath = path.resolve(process.argv[2] ?? process.env.SEED_CSV_PATH ?? DEFAULT_CSV_PATH);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  await seedSuppliers(csvPath);
}

// Run only as the entry point (container CMD, npm run db:seed), not when a test imports seedSuppliers.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[seed] Failed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
