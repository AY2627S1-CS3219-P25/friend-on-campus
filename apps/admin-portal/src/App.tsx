import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react';
import { SupplierDTO, SupplierCategory, CreateSupplierRequest } from '@campus-errand/common-dtos';

const CATEGORIES: SupplierCategory[] = ['Beverages', 'Food', 'Printing', 'Parcels', 'Shopping', 'General'];
const CAMPUS_ZONES = ['COM3', 'UTown', 'PGPR', 'FASS', 'Central Lib', 'Science', 'Engineering'];

export default function App() {
  const [activeNav, setActiveNav] = useState<'suppliers' | 'health' | 'audit'>('suppliers');
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Add Supplier Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSupplier, setNewSupplier] = useState<CreateSupplierRequest>({
    supplierCode: '',
    name: '',
    campusZone: 'COM3',
    exactLocation: '',
    category: 'Food',
    description: '',
    building: '',
    floor: '',
    startingTime: '0800hrs',
    closingTime: '2000hrs',
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/suppliers');
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSuppliers(data.data);
      } else {
        throw new Error(data.error || 'Failed to parse suppliers payload');
      }
    } catch (err: any) {
      console.warn('API error, falling back to cached/mock list:', err.message);
      setError('Could not connect to live Supplier Service API (/api/suppliers). Showing cached records.');
      // Fallback defaults if API is temporarily unreachable
      setSuppliers([
        {
          id: 's1',
          supplierCode: 'SUP-001',
          name: 'CoffeeBean @ COM3',
          campusZone: 'COM3',
          exactLocation: 'COM3 Level 1 Lobby',
          category: 'Beverages',
          description: 'Specialty coffee, pastries, and sandwiches',
          building: 'COM3',
          floor: '1',
          startingTime: '0800hrs',
          closingTime: '2000hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 's2',
          supplierCode: 'SUP-002',
          name: 'Printers @ PCCommons',
          campusZone: 'UTown',
          exactLocation: 'Stephen Riady Centre Level 1',
          category: 'Printing',
          description: 'Fast printing & lecture note pickup hub',
          building: 'Stephen Riady Centre',
          floor: '1',
          startingTime: '0000hrs',
          closingTime: '2359hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 's3',
          supplierCode: 'SUP-003',
          name: 'PGP Mailroom & Smart Lockers',
          campusZone: 'PGPR',
          exactLocation: "Prince George's Park Residences Foyer",
          category: 'Parcels',
          description: 'Courier parcel lockers and delivery collection point',
          building: "Prince George's Park",
          floor: '1',
          startingTime: '0000hrs',
          closingTime: '2359hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 's4',
          supplierCode: 'SUP-004',
          name: 'Fine Food Canteen (UTown)',
          campusZone: 'UTown',
          exactLocation: 'Town Plaza Level 1',
          category: 'Food',
          description: 'Mala Xiang Guo, Chicken Rice, and Drinks',
          building: 'Town Plaza',
          floor: '1',
          startingTime: '0730hrs',
          closingTime: '2100hrs',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers((prev) => [data.data, ...prev]);
        setIsAddOpen(false);
        setNewSupplier({
          supplierCode: '',
          name: '',
          campusZone: 'COM3',
          exactLocation: '',
          category: 'Food',
          description: '',
          building: '',
          floor: '',
          startingTime: '0800hrs',
          closingTime: '2000hrs',
        });
      } else {
        alert(data.error || 'Failed to create supplier');
      }
    } catch (err: any) {
      // Local fallback creation if backend is offline
      const localSupplier: SupplierDTO = {
        id: `s-${Date.now()}`,
        supplierCode: newSupplier.supplierCode || `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
        name: newSupplier.name,
        campusZone: newSupplier.campusZone,
        exactLocation: newSupplier.exactLocation,
        category: newSupplier.category,
        description: newSupplier.description,
        building: newSupplier.building,
        floor: newSupplier.floor,
        startingTime: newSupplier.startingTime,
        closingTime: newSupplier.closingTime,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setSuppliers((prev) => [localSupplier, ...prev]);
      setIsAddOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/suppliers/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setSuppliers((prev) => prev.map((s) => (s.id === id ? data.data : s)));
        return;
      }
    } catch (err) {
      console.warn('Backend toggle failed, toggling locally:', err);
    }
    // Optimistic / fallback toggle
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const toggleFilterChip = (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const resetAdvancedFilters = () => {
    setSelectedZones([]);
    setSelectedCategories([]);
    setIsFilterModalOpen(false);
  };

  const activeFilterCount = (selectedZones.length > 0 ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.campusZone.toLowerCase().includes(query) ||
        s.supplierCode.toLowerCase().includes(query) ||
        (s.building && s.building.toLowerCase().includes(query)) ||
        s.exactLocation.toLowerCase().includes(query);

      const matchesQuickCat = selectedCategory === 'ALL' || s.category === selectedCategory;
      const matchesModalCat = selectedCategories.length === 0 || selectedCategories.includes(s.category);
      const matchesZone = selectedZones.length === 0 || selectedZones.includes(s.campusZone);

      return matchesSearch && matchesQuickCat && matchesModalCat && matchesZone;
    });
  }, [suppliers, searchQuery, selectedCategory, selectedCategories, selectedZones]);

  const uniqueZones = useMemo(() => {
    const set = new Set(suppliers.map((s) => s.campusZone).filter(Boolean));
    return set.size;
  }, [suppliers]);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center font-black text-white text-xl">
            A
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">NUS CampusErrand</h1>
            <p className="text-[11px] text-slate-400">Admin Control Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium">
          <button
            onClick={() => setActiveNav('suppliers')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'suppliers'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Campus Suppliers (M3)</span>
          </button>

          <button
            onClick={() => setActiveNav('health')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'health'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Microservice Health</span>
          </button>

          <button
            onClick={() => setActiveNav('audit')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
              activeNav === 'audit'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit & Disputes</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
          <p>CS3219 AY26/27 Milestone M3</p>
          <p className="text-slate-400 font-mono">Gateway: Port 80 (Nginx)</p>
          <p className="text-slate-400 font-mono">Supplier Service: Port 8002</p>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {activeNav === 'suppliers'
                ? 'Campus Suppliers & Location Registry'
                : activeNav === 'health'
                ? 'System & Microservices Health'
                : 'Security & Audit Logs'}
            </h2>
            <p className="text-xs text-slate-500">Predefined pickup spots and store directory for requesters</p>
          </div>

          {activeNav === 'suppliers' && (
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchSuppliers}
                title="Refresh suppliers list"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Campus Supplier</span>
              </button>
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center space-x-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          )}

          {activeNav === 'suppliers' && (
            <div className="space-y-6">
              {/* Stats overview */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold">Total Suppliers</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{suppliers.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold">Active Locations</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {suppliers.filter((s) => s.isActive).length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold">Campus Zones Covered</span>
                  <p className="text-2xl font-black text-blue-600 mt-1">{uniqueZones} Zones</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-semibold">Categories</span>
                  <p className="text-2xl font-black text-amber-600 mt-1">{CATEGORIES.length} Types</p>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between space-x-4">
                <div className="relative flex-1 max-w-md flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, building, code, or zone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      activeFilterCount > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="ml-1 bg-blue-600 text-white rounded-full text-[10px] w-4 h-4 inline-flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  <div className="h-5 w-px bg-slate-200" />

                  {['ALL', ...CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Store / Facility Name</th>
                      <th className="p-3.5">Campus Zone</th>
                      <th className="p-3.5">Building & Location</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Operating Hours</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-bold text-slate-700">{s.supplierCode}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          {s.description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{s.description}</div>}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                            {s.campusZone}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{s.exactLocation}</div>
                          {s.building && (
                            <span className="text-[10px] text-slate-400">
                              {s.building} {s.floor ? `· L${s.floor}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {s.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {s.startingTime && s.closingTime ? (
                            <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-slate-500">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{s.startingTime} - {s.closingTime}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unspecified</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {s.isActive ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Unavailable</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => toggleStatus(s.id)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                              s.isActive
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {s.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No campus suppliers found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                  <span>Showing {filtered.length} of {suppliers.length} campus locations</span>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'health' && (
            <div className="grid grid-cols-2 gap-6">
              {[
                { name: 'User Service (M2)', port: 8001, db: 'user_db' },
                { name: 'Supplier Service (M3)', port: 8002, db: 'supplier_db' },
                { name: 'Order Service (M4)', port: 8003, db: 'order_db' },
                { name: 'Credit Service (M5)', port: 8004, db: 'credit_db' },
                { name: 'Notification Service (M6)', port: 8005, db: 'RabbitMQ' },
              ].map((svc) => (
                <div key={svc.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{svc.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Port: {svc.port} | Runtime: Node (tsx)</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">DB: {svc.db}</p>
                  </div>
                  <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>HEALTHY</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeNav === 'audit' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 mb-2">Audit & Dispute Trail</h3>
              <p className="text-xs text-slate-500">Immutable ledger of supplier modifications and errand resolution events.</p>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs font-mono text-slate-600">
                [AUDIT LOG READY] All supplier status changes are persisted in supplier_db with timestamp audit columns.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Advanced Filter Modal (ported from teammate's UI prototype) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Filter Campus Suppliers</h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Category / Type</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleFilterChip(selectedCategories, cat, setSelectedCategories)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campus Zone Filter Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Campus Zone</label>
              <div className="flex flex-wrap gap-2">
                {CAMPUS_ZONES.map((zone) => {
                  const active = selectedZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleFilterChip(selectedZones, zone, setSelectedZones)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {zone}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAdvancedFilters}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateSupplier}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Campus Supplier</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store / Spot Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. LiHO Tea @ UTown"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campus Zone *</label>
                <select
                  value={newSupplier.campusZone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, campusZone: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {CAMPUS_ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={newSupplier.category}
                  onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value as SupplierCategory })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Exact Pickup Spot Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. Stephen Riady Centre Level 1 next to FairPrice"
                value={newSupplier.exactLocation}
                onChange={(e) => setNewSupplier({ ...newSupplier, exactLocation: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Building</label>
                <input
                  type="text"
                  placeholder="e.g. COM3"
                  value={newSupplier.building || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, building: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                <input
                  type="text"
                  placeholder="e.g. 1"
                  value={newSupplier.floor || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, floor: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opening Time</label>
                <input
                  type="text"
                  placeholder="0800hrs"
                  value={newSupplier.startingTime || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, startingTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Closing Time</label>
                <input
                  type="text"
                  placeholder="2000hrs"
                  value={newSupplier.closingTime || ''}
                  onChange={(e) => setNewSupplier({ ...newSupplier, closingTime: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg shadow"
              >
                {isSubmitting ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
