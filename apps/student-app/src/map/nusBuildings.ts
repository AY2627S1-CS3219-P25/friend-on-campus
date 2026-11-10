/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: matchBuildingInText finds the building named in free text (the assistant draft's drop-off), ignoring case, punctuation and spacing ("LT27" = "LT 27"); the..; updated across 2 AI-assisted revisions through D4 wrap-up (the NUS building list behind the drop-off picker (author's decisions D10: static snapshot, D13: records sharing a name are merged and the first record's..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { longestSpanKm } from './creditEstimate';
import { NUS_BUILDING_RECORDS } from './nusBuildingsData';

export interface NusBuilding {
  elementId: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** One entry per name (compared case-insensitively); the first record of each name is kept. */
export function dedupeBuildingsByName(records: NusBuilding[]): NusBuilding[] {
  const byName = new Map<string, NusBuilding>();
  for (const record of records) {
    const key = record.name.trim().toLowerCase();
    if (key && !byName.has(key)) byName.set(key, record);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Case-insensitive name match; names starting with the query come first, then alphabetical. */
export function searchBuildings(buildings: NusBuilding[], query: string, limit = 8): NusBuilding[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return buildings
    .filter((building) => building.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
      const bPrefix = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
      return aPrefix - bPrefix || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * The building whose name appears in the text as whole words, or null. Spacing inside a name is ignored, so "LT27",
 * "LT 27" and "lt-27" all match "LT 27". When several names match, the longest one wins, so "Central Library Annexe"
 * beats "Central Library".
 */
export function matchBuildingInText(buildings: NusBuilding[], text: string): NusBuilding | null {
  const words = tokens(text);
  if (words.length === 0) return null;
  let best: NusBuilding | null = null;
  let bestLength = 0;
  for (const building of buildings) {
    const name = tokens(building.name).join('');
    if (!name || name.length <= bestLength) continue;
    // Does some run of consecutive words, joined without spaces, spell the name exactly?
    const found = words.some((_, start) => {
      let joined = '';
      for (let end = start; end < words.length && joined.length < name.length; end += 1) {
        joined += words[end];
        if (joined === name) return true;
      }
      return false;
    });
    if (found) {
      best = building;
      bestLength = name.length;
    }
  }
  return best;
}

export const NUS_BUILDINGS: NusBuilding[] = dedupeBuildingsByName(NUS_BUILDING_RECORDS);

/** D_MAX: the longest straight-line distance between two buildings in the list, in km. */
export const NUS_SPAN_KM: number = longestSpanKm(NUS_BUILDINGS);
