/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5), date: 2026-09-19
 * Scope: Replaced the hover-driven Filters dropdown (which closed before a checkbox could be
 *        clicked) with a centered modal popup — background dimmed/blurred, opened via a
 *        "Filters" button, closed via the × button, clicking the backdrop, or Escape. Type,
 *        Building and Floor remain checkbox (chip) multi-selects; Latitude, Longitude,
 *        StartingTime and ClosingTime are now drag-to-select dual-thumb range sliders
 *        (a small inline RangeSlider component defined in this same file, no new files/deps).
 *        Filtering stays purely client-side against the hardcoded dummy supplier list.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
import React, { useEffect, useMemo, useRef, useState } from 'react';

// ------------------------------------------------------------------
// Dummy data — mirrors the Supplier model in database/prisma/schema.prisma
// (and the seed CSV) so the shape matches what the backend will eventually
// return. NOT wired to the backend yet — TODO once the API calls are ready.
// ------------------------------------------------------------------
interface Supplier {
  name: string;
  type: string;
  building: string;
  floor: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  startingTime: string;
  closingTime: string;
}

const DUMMY_SUPPLIERS: Supplier[] = [
  { name: "Anna's x Soup Union", type: 'Food', building: 'Central Library', floor: '1', locationDescription: 'Next to NUS Co-op', latitude: 1.296444, longitude: 103.773032, startingTime: '0900hrs', closingTime: '1800hrs' },
  { name: 'NUS Co-op', type: 'Shopping', building: 'Central Library', floor: '1', locationDescription: 'Inside the library on the right side', latitude: 1.2967866, longitude: 103.7732677, startingTime: '0900hrs', closingTime: '1600hrs' },
  { name: 'Printer @ Com 2', type: 'Printing', building: 'Com 2', floor: '1', locationDescription: 'Next to LT19', latitude: 1.2938347, longitude: 103.7744572, startingTime: '0000hrs', closingTime: '2359hrs' },
  { name: 'Cool Spot', type: 'Food', building: 'Com2', floor: '1', locationDescription: 'Opp LT16', latitude: 1.2940156, longitude: 103.7738478, startingTime: '0900hrs', closingTime: '2130hrs' },
  { name: 'InstaChef', type: 'Food', building: 'Terrace', floor: '1', locationDescription: 'Next to foyer', latitude: 1.2938898, longitude: 103.7736305, startingTime: '0000hrs', closingTime: '2359hrs' },
  { name: 'Cafe+ Robot Cafe', type: 'Food/Coffee', building: 'Central Library', floor: '1', locationDescription: 'Opp to central library entrance', latitude: 1.296444, longitude: 103.773032, startingTime: '0000hrs', closingTime: '2359hrs' },
  { name: 'A Hot Hideout', type: 'Food', building: "Prince George's Park", floor: '2', locationDescription: 'Near PGP entrance', latitude: 1.2908445, longitude: 103.7770891, startingTime: '1100hrs', closingTime: '2130hrs' },
  { name: 'Arise and Shine', type: 'Food', building: 'Engineering Block E4', floor: '4', locationDescription: 'Near LT6', latitude: 1.2991517, longitude: 103.769064, startingTime: '0800hrs', closingTime: '1800hrs' },
];

// Dummy stat — not derived from anything yet, just a placeholder value.
const DUMMY_TOTAL_COMPLETED_PICKUPS = 1420;

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

const TYPE_OPTIONS = unique(DUMMY_SUPPLIERS.map((s) => s.type));
const BUILDING_OPTIONS = unique(DUMMY_SUPPLIERS.map((s) => s.building));
const FLOOR_OPTIONS = unique(DUMMY_SUPPLIERS.map((s) => s.floor));

// ------------------------------------------------------------------
// StartingTime / ClosingTime are stored as "HHMMhrs" strings — convert to/from
// minutes-since-midnight so they can drive a numeric range slider like
// Latitude/Longitude do.
// ------------------------------------------------------------------
function parseHoursToMinutes(value: string): number {
  const digits = value.replace(/hrs$/i, '').padStart(4, '0');
  const hours = parseInt(digits.slice(0, 2), 10) || 0;
  const minutes = parseInt(digits.slice(2, 4), 10) || 0;
  return hours * 60 + minutes;
}

function formatMinutesToHours(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}hrs`;
}

const LATITUDE_VALUES = DUMMY_SUPPLIERS.map((s) => s.latitude);
const LONGITUDE_VALUES = DUMMY_SUPPLIERS.map((s) => s.longitude);
const LATITUDE_MIN = Math.min(...LATITUDE_VALUES);
const LATITUDE_MAX = Math.max(...LATITUDE_VALUES);
const LONGITUDE_MIN = Math.min(...LONGITUDE_VALUES);
const LONGITUDE_MAX = Math.max(...LONGITUDE_VALUES);
const LATITUDE_STEP = (LATITUDE_MAX - LATITUDE_MIN) / 200 || 0.0001;
const LONGITUDE_STEP = (LONGITUDE_MAX - LONGITUDE_MIN) / 200 || 0.0001;

const TIME_MIN_MINUTES = 0;
const TIME_MAX_MINUTES = 23 * 60 + 59; // 1439 = 23:59
const TIME_STEP_MINUTES = 15;

// ------------------------------------------------------------------
// Filters — everything except Name (that's what the search bar is for) and
// "All Fields" (redundant once each field has its own section). Type/Building/Floor
// are checkbox (chip) multi-selects; Latitude/Longitude/StartingTime/ClosingTime are
// dual-thumb range sliders.
// ------------------------------------------------------------------
type CheckboxCategoryKey = 'type' | 'building' | 'floor';
type SliderCategoryKey = 'latitude' | 'longitude' | 'startingTime' | 'closingTime';

interface RangeValue {
  min: number;
  max: number;
}

interface FilterState {
  type: Set<string>;
  building: Set<string>;
  floor: Set<string>;
  latitude: RangeValue;
  longitude: RangeValue;
  startingTime: RangeValue;
  closingTime: RangeValue;
}

function createEmptyFilters(): FilterState {
  return {
    type: new Set(),
    building: new Set(),
    floor: new Set(),
    latitude: { min: LATITUDE_MIN, max: LATITUDE_MAX },
    longitude: { min: LONGITUDE_MIN, max: LONGITUDE_MAX },
    startingTime: { min: TIME_MIN_MINUTES, max: TIME_MAX_MINUTES },
    closingTime: { min: TIME_MIN_MINUTES, max: TIME_MAX_MINUTES },
  };
}

interface CheckboxCategoryConfig {
  key: CheckboxCategoryKey;
  label: string;
  kind: 'checkbox';
  options: string[];
}

interface SliderCategoryConfig {
  key: SliderCategoryKey;
  label: string;
  kind: 'slider';
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
}

type CategoryConfig = CheckboxCategoryConfig | SliderCategoryConfig;

function isCheckboxCategory(category: CategoryConfig): category is CheckboxCategoryConfig {
  return category.kind === 'checkbox';
}

const FILTER_CATEGORIES: CategoryConfig[] = [
  { key: 'type', label: 'Type', kind: 'checkbox', options: TYPE_OPTIONS },
  { key: 'building', label: 'Building', kind: 'checkbox', options: BUILDING_OPTIONS },
  { key: 'floor', label: 'Floor', kind: 'checkbox', options: FLOOR_OPTIONS },
  { key: 'latitude', label: 'Latitude', kind: 'slider', min: LATITUDE_MIN, max: LATITUDE_MAX, step: LATITUDE_STEP, formatValue: (v) => v.toFixed(4) },
  { key: 'longitude', label: 'Longitude', kind: 'slider', min: LONGITUDE_MIN, max: LONGITUDE_MAX, step: LONGITUDE_STEP, formatValue: (v) => v.toFixed(4) },
  { key: 'startingTime', label: 'StartingTime', kind: 'slider', min: TIME_MIN_MINUTES, max: TIME_MAX_MINUTES, step: TIME_STEP_MINUTES, formatValue: formatMinutesToHours },
  { key: 'closingTime', label: 'ClosingTime', kind: 'slider', min: TIME_MIN_MINUTES, max: TIME_MAX_MINUTES, step: TIME_STEP_MINUTES, formatValue: formatMinutesToHours },
];

// Small inline search icon so we don't need an icon library dependency.
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ------------------------------------------------------------------
// A minimal dual-thumb drag-to-select range slider. Kept as a plain function
// defined in this same file (not a new file) per the "no extra components" scope.
// Uses native Pointer Capture so dragging keeps working even once the cursor
// moves off the thumb — no window-level listeners or extra deps needed.
// ------------------------------------------------------------------
interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (next: RangeValue) => void;
  formatValue?: (value: number) => string;
}

function RangeSlider({ min, max, step, valueMin, valueMax, onChange, formatValue }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const percentFor = (value: number): number => {
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 100;
  };

  const valueFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleMinPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    const next = valueFromClientX(event.clientX);
    onChange({ min: Math.min(next, valueMax), max: valueMax });
  };

  const handleMaxPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    const next = valueFromClientX(event.clientX);
    onChange({ min: valueMin, max: Math.max(next, valueMin) });
  };

  const display = formatValue ?? ((value: number) => String(value));

  return (
    <div style={styles.sliderWrapper}>
      <div ref={trackRef} style={styles.sliderTrack}>
        <div
          style={{
            ...styles.sliderRangeFill,
            left: `${percentFor(valueMin)}%`,
            right: `${100 - percentFor(valueMax)}%`,
          }}
        />
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMin}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handleMinPointerMove}
          onPointerUp={handlePointerUp}
          style={{ ...styles.sliderThumb, left: `${percentFor(valueMin)}%` }}
        />
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMax}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handleMaxPointerMove}
          onPointerUp={handlePointerUp}
          style={{ ...styles.sliderThumb, left: `${percentFor(valueMax)}%` }}
        />
      </div>
      <div style={styles.sliderLabelsRow}>
        <span>{display(valueMin)}</span>
        <span>{display(valueMax)}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [searchName, setSearchName] = useState('');
  const [appliedSearchName, setAppliedSearchName] = useState('');

  const [pendingFilters, setPendingFilters] = useState<FilterState>(createEmptyFilters());
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(createEmptyFilters());

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Close the Filters popup on Escape, like most modal dialogs.
  useEffect(() => {
    if (!isFiltersOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsFiltersOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFiltersOpen]);

  const toggleCheckboxValue = (category: CheckboxCategoryKey, value: string) => {
    setPendingFilters((prev) => {
      const nextSet = new Set(prev[category]);
      if (nextSet.has(value)) nextSet.delete(value);
      else nextSet.add(value);
      return { ...prev, [category]: nextSet };
    });
  };

  const updateRangeValue = (category: SliderCategoryKey, next: RangeValue) => {
    setPendingFilters((prev) => ({ ...prev, [category]: next }));
  };

  const resetFilters = () => {
    const empty = createEmptyFilters();
    setPendingFilters(empty);
    setAppliedFilters(empty);
  };

  const applyFilters = () => {
    setAppliedFilters(pendingFilters);
    setIsFiltersOpen(false);
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) setIsFiltersOpen(false);
  };

  // Only re-runs when the user actually submits a search (Enter or the Search button),
  // matching the "does not need to work live yet" skeleton scope.
  const runSearch = () => {
    setAppliedSearchName(searchName);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch();
  };

  const filteredSuppliers = useMemo(() => {
    const name = appliedSearchName.trim().toLowerCase();

    return DUMMY_SUPPLIERS.filter((supplier) => {
      if (name && !supplier.name.toLowerCase().includes(name)) return false;

      if (appliedFilters.type.size > 0 && !appliedFilters.type.has(supplier.type)) return false;
      if (appliedFilters.building.size > 0 && !appliedFilters.building.has(supplier.building)) return false;
      if (appliedFilters.floor.size > 0 && !appliedFilters.floor.has(supplier.floor)) return false;

      if (supplier.latitude < appliedFilters.latitude.min || supplier.latitude > appliedFilters.latitude.max) return false;
      if (supplier.longitude < appliedFilters.longitude.min || supplier.longitude > appliedFilters.longitude.max) return false;

      const startingMinutes = parseHoursToMinutes(supplier.startingTime);
      const closingMinutes = parseHoursToMinutes(supplier.closingTime);
      if (startingMinutes < appliedFilters.startingTime.min || startingMinutes > appliedFilters.startingTime.max) return false;
      if (closingMinutes < appliedFilters.closingTime.min || closingMinutes > appliedFilters.closingTime.max) return false;

      return true;
    });
  }, [appliedSearchName, appliedFilters]);

  const campusZonesCovered = useMemo(() => {
    return Array.from(new Set(filteredSuppliers.map((s) => s.building)));
  }, [filteredSuppliers]);

  return (
    <main style={styles.page}>
      {/* Header row: title + Add New Supplier button */}
      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Campus Suppliers &amp; Facility Directory</h1>
          <p style={styles.subtitle}>Manage pre-registered merchant pickups and facility stations</p>
        </div>
        <button type="button" style={styles.primaryButton}>
          + Add New Supplier
        </button>
      </header>

      {/* Stats row */}
      <section style={styles.statsRow}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>TOTAL ACTIVE SUPPLIERS</span>
          <span style={styles.statValue}>{filteredSuppliers.length} Locations</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>CAMPUS ZONES COVERED</span>
          <span style={styles.statValue}>
            {campusZonesCovered.length} ({campusZonesCovered.slice(0, 2).join(', ')}
            {campusZonesCovered.length > 2 ? ', ...' : ''})
          </span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>TOTAL COMPLETED PICKUPS</span>
          <span style={styles.statValue}>{DUMMY_TOTAL_COMPLETED_PICKUPS.toLocaleString()} Orders</span>
        </div>
      </section>

      {/* Search + filter row */}
      <section style={styles.searchRow}>
        <div style={styles.searchInputWrapper}>
          <span style={styles.searchIcon}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search supplier name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={styles.searchInput}
          />
        </div>

        <button type="button" style={styles.filtersToggleButton} onClick={() => setIsFiltersOpen(true)}>
          Filters
        </button>

        <button type="button" style={styles.searchButton} onClick={runSearch}>
          Search
        </button>
      </section>

      {/* Filters popup: dimmed/blurred backdrop + centered card, ChatGPT-settings style */}
      {isFiltersOpen && (
        <div style={styles.modalOverlay} onClick={handleOverlayClick}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Filters</h2>
              <button
                type="button"
                style={styles.modalCloseButton}
                onClick={() => setIsFiltersOpen(false)}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {FILTER_CATEGORIES.map((category) => (
                <div key={category.key} style={styles.filterSection}>
                  <span style={styles.filterSectionLabel}>{category.label}</span>

                  {isCheckboxCategory(category) ? (
                    <div style={styles.filterChipsRow}>
                      {category.options.map((option) => {
                        const checked = pendingFilters[category.key].has(option);
                        return (
                          <label key={option} style={checked ? { ...styles.filterChip, ...styles.filterChipChecked } : styles.filterChip}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCheckboxValue(category.key, option)}
                              style={styles.filterChipInput}
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <RangeSlider
                      min={category.min}
                      max={category.max}
                      step={category.step}
                      valueMin={pendingFilters[category.key].min}
                      valueMax={pendingFilters[category.key].max}
                      onChange={(next) => updateRangeValue(category.key, next)}
                      formatValue={category.formatValue}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.resetFiltersButton} onClick={resetFilters}>
                Reset Filters
              </button>
              <button type="button" style={styles.applyFiltersButton} onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      <section style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Building</th>
              <th style={styles.th}>Floor</th>
              <th style={styles.th}>Latitude</th>
              <th style={styles.th}>Longitude</th>
              <th style={styles.th}>StartingTime</th>
              <th style={styles.th}>ClosingTime</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.name}>
                <td style={styles.td}>{supplier.name}</td>
                <td style={styles.td}>{supplier.type}</td>
                <td style={styles.td}>{supplier.building}</td>
                <td style={styles.td}>{supplier.floor}</td>
                <td style={styles.td}>{supplier.latitude}</td>
                <td style={styles.td}>{supplier.longitude}</td>
                <td style={styles.td}>{supplier.startingTime}</td>
                <td style={styles.td}>{supplier.closingTime}</td>
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={8}>
                  No suppliers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p style={styles.tableFooter}>
          Showing {filteredSuppliers.length} of {DUMMY_SUPPLIERS.length} campus suppliers
        </p>
      </section>
    </main>
  );
}

// Plain inline styles for now — no CSS file / Tailwind setup yet, this is a
// skeleton pass only. TODO: replace with the project's chosen styling approach.
const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '32px 40px',
    backgroundColor: '#f5f6f8',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: 14,
    color: '#6b7280',
  },
  primaryButton: {
    backgroundColor: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
  },
  searchRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    color: '#9ca3af',
    display: 'flex',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  filtersToggleButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
    cursor: 'pointer',
  },
  searchButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // ---- Filters popup ----
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85vh',
    backgroundColor: '#fff',
    borderRadius: 14,
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    lineHeight: 1,
    color: '#6b7280',
    cursor: 'pointer',
    padding: 4,
  },
  modalBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
    overflowY: 'auto',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
  },

  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 13,
    cursor: 'pointer',
    userSelect: 'none',
  },
  filterChipChecked: {
    backgroundColor: '#111827',
    borderColor: '#111827',
    color: '#fff',
  },
  filterChipInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },

  resetFiltersButton: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  applyFiltersButton: {
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // ---- Range slider ----
  sliderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingTop: 6,
  },
  sliderTrack: {
    position: 'relative',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    margin: '0 8px',
  },
  sliderRangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#111827',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '2px solid #111827',
    transform: 'translate(-50%, -50%)',
    cursor: 'grab',
    touchAction: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  sliderLabelsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#6b7280',
  },

  tableCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 16,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    fontSize: 14,
    color: '#111827',
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  tableFooter: {
    marginTop: 12,
    fontSize: 13,
    color: '#6b7280',
  },
};
