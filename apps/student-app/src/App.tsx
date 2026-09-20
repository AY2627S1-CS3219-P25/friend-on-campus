/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Connected Student App to live Supplier Service API (/api/suppliers), added dynamic supplier dropdown in errand creation, and added campus supplier directory browsing tab.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import React, { useState, useEffect } from 'react';
import {
  Compass,
  PlusCircle,
  Clock,
  Wallet,
  MapPin,
  ArrowRight,
  AlertCircle,
  Coins,
  ShieldCheck,
  Store,
  Search,
} from 'lucide-react';
import { OrderDTO, CreditWalletDTO, SupplierDTO } from '@campus-errand/common-dtos';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'post' | 'spots' | 'tasks' | 'wallet'>('feed');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Live Campus Suppliers State (M3)
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Wallet State
  const [wallet, setWallet] = useState<CreditWalletDTO>({
    userId: 'u1111111-1111-1111-1111-111111111111',
    availableCredits: 85,
    escrowCredits: 15,
    totalEarnedCredits: 45,
    updatedAt: new Date().toISOString(),
  });

  // Open Orders State
  const [orders, setOrders] = useState<OrderDTO[]>([
    {
      id: 'ord-1001',
      orderCode: 'E-1042',
      requesterId: 'u1111111-1111-1111-1111-111111111111',
      courierId: null,
      supplierId: 's1',
      supplierName: 'CoffeeBean @ COM3',
      campusZone: 'COM3',
      itemDescription: '1x Large Iced Hazelnut Latte (Oat Milk, Less Ice)',
      specialNotes: 'Table near staircase #01-02',
      dropoffLocation: 'COM2 #02-04 Discussion Room',
      requesterContactNote: 'Wearing blue NUS Computing hoodie',
      rewardCredits: 15,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    },
    {
      id: 'ord-1003',
      orderCode: 'E-1045',
      requesterId: 'u3333333-3333-3333-3333-333333333333',
      courierId: null,
      supplierId: 's3',
      supplierName: 'PGP Mailroom & Smart Lockers',
      campusZone: 'PGPR',
      itemDescription: 'Shopee Parcel Collection (Locker Box #412)',
      specialNotes: 'OTP Code: 6631',
      dropoffLocation: 'PGPR Block 20 Level 4 Lounge',
      rewardCredits: 18,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    },
  ]);

  // Post Form State
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: 'CoffeeBean @ COM3',
    campusZone: 'COM3',
    itemDescription: '',
    specialNotes: '',
    dropoffLocation: '',
    rewardCredits: 15,
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Fetch live active campus suppliers from Supplier Service
  const fetchLiveSuppliers = async () => {
    setIsSuppliersLoading(true);
    try {
      const res = await fetch('/api/suppliers?isActive=true');
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : json.data?.suppliers || [];
        if (items.length > 0) {
          setSuppliers(items);
          setFormData((prev) => ({
            ...prev,
            supplierId: items[0].id,
            supplierName: items[0].name,
            campusZone: items[0].campusZone,
          }));
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch live suppliers, falling back:', e);
    } finally {
      setIsSuppliersLoading(false);
    }

    // Fallback campus spots if gateway is connecting
    setSuppliers([
      {
        id: 's1',
        supplierCode: 'SUP-001',
        name: 'CoffeeBean @ COM3',
        campusZone: 'COM3',
        exactLocation: 'COM3 Level 1 Lobby',
        category: 'Beverages',
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
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  useEffect(() => {
    fetchLiveSuppliers();

    // Attempt WebSocket connection to Notification Service via Gateway
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYSTEM_BROADCAST') {
            setNotification(`📢 ${data.title}: ${data.message}`);
          }
        } catch (e) {}
      };
      ws.onerror = () => setWsStatus('disconnected');
      ws.onclose = () => setWsStatus('disconnected');
    } catch (e) {
      setWsStatus('disconnected');
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (wallet.availableCredits < formData.rewardCredits) {
      alert('Insufficient available credits to post errand.');
      return;
    }

    const newOrder: OrderDTO = {
      id: `ord-${Date.now()}`,
      orderCode: `E-${Math.floor(1000 + Math.random() * 9000)}`,
      requesterId: wallet.userId,
      courierId: null,
      supplierId: formData.supplierId || 's1',
      supplierName: formData.supplierName,
      campusZone: formData.campusZone,
      itemDescription: formData.itemDescription,
      specialNotes: formData.specialNotes,
      dropoffLocation: formData.dropoffLocation,
      rewardCredits: formData.rewardCredits,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    setOrders([newOrder, ...orders]);
    setWallet((prev) => ({
      ...prev,
      availableCredits: prev.availableCredits - formData.rewardCredits,
      escrowCredits: prev.escrowCredits + formData.rewardCredits,
    }));

    setNotification(`Errand ${newOrder.orderCode} posted! Escrow locked: ${formData.rewardCredits} Credits.`);
    setActiveTab('feed');

    setFormData({
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || 'CoffeeBean @ COM3',
      campusZone: suppliers[0]?.campusZone || 'COM3',
      itemDescription: '',
      specialNotes: '',
      dropoffLocation: '',
      rewardCredits: 15,
    });
  };

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? { ...ord, status: 'ACCEPTED', courierId: wallet.userId, version: ord.version + 1 }
          : ord
      )
    );
    setNotification('Errand accepted! Head to the pickup location.');
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedZone === 'ALL') return true;
    return o.campusZone === selectedZone;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.campusZone.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.exactLocation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 max-w-md mx-auto shadow-2xl relative font-sans">
      {/* Top Header */}
      <header className="bg-nus-blue text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-extrabold text-base tracking-tight flex items-center space-x-1.5">
              <span>NUS CampusErrand</span>
              <span className="bg-nus-orange text-[10px] font-black px-1.5 py-0.5 rounded tracking-normal">
                STUDENT
              </span>
            </h1>
            <p className="text-[11px] text-blue-200">Dual-Role Peer Network • Milestone D2</p>
          </div>
          <div className="flex items-center space-x-1 bg-blue-900/60 px-2.5 py-1 rounded-full border border-blue-400/30">
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs font-bold text-amber-300">{wallet.availableCredits} C</span>
          </div>
        </div>

        {/* Status Line */}
        <div className="mt-2.5 pt-2 border-t border-blue-800 flex justify-between items-center text-[11px]">
          <span className="flex items-center space-x-1.5 text-blue-200">
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>WS Hub: {wsStatus}</span>
          </span>
          <span className="text-blue-300">Escrow: {wallet.escrowCredits} C Held</span>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-medium shadow-md transition-all">
          {notification}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {/* TAB 1: Errand Feed */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Errand Feed</h2>
              <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-700 font-semibold">
                {filteredOrders.length} Open
              </span>
            </div>

            {/* Campus Zone Filter Pills */}
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {['ALL', 'COM3', 'UTown', 'PGPR', 'FASS', 'Science', 'Engineering'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedZone === zone
                      ? 'bg-nus-orange text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>

            {/* Errand Cards List */}
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-nus-blue border border-blue-100">
                      {order.campusZone}
                    </span>
                    <div className="flex items-center space-x-1 text-amber-600 font-black text-sm bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Coins className="w-3.5 h-3.5" />
                      <span>+{order.rewardCredits} Credits</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{order.itemDescription}</h3>
                  {order.specialNotes && (
                    <p className="text-xs text-slate-500 italic mt-0.5">"{order.specialNotes}"</p>
                  )}

                  <div className="mt-3 bg-slate-50 rounded-lg p-2.5 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-nus-blue shrink-0" />
                      <span className="font-semibold text-slate-600">Pickup:</span>
                      <span className="truncate">{order.supplierName}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-nus-orange shrink-0" />
                      <span className="font-semibold text-slate-600">Dropoff:</span>
                      <span className="truncate">{order.dropoffLocation}</span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires in ~25m</span>
                    </span>

                    {order.status === 'OPEN' ? (
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="bg-nus-orange hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition flex items-center space-x-1"
                      >
                        <span>Accept Errand</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
                        Accepted by You
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Post Errand */}
        {activeTab === 'post' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Post New Errand</h2>
            <form onSubmit={handlePostSubmit} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Pickup Store / Spot (Live M3 Directory)
                  </label>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    {suppliers.length} active spots
                  </span>
                </div>
                <select
                  value={formData.supplierId}
                  onChange={(e) => {
                    const chosen = suppliers.find((s) => s.id === e.target.value);
                    if (chosen) {
                      setFormData({
                        ...formData,
                        supplierId: chosen.id,
                        supplierName: chosen.name,
                        campusZone: chosen.campusZone,
                      });
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.campusZone} - {s.category})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selected Zone: <span className="font-bold text-slate-600">{formData.campusZone}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Description & Order Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1x Cold Brew Coffee + 1x Croissant"
                  value={formData.itemDescription}
                  onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Drop-off Study Spot & Visual Cue</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. COM2 Level 2 Room #02-04 (Wearing NUS grey hoodie)"
                  value={formData.dropoffLocation}
                  onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Special Delivery Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Less ice, separate paper bag, PIN code for lockers"
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Courier Reward Credits:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, rewardCredits: Math.max(5, f.rewardCredits - 5) }))}
                      className="w-6 h-6 rounded bg-amber-200 text-amber-900 font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="font-black text-sm text-amber-900">{formData.rewardCredits} C</span>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, rewardCredits: f.rewardCredits + 5 }))}
                      className="w-6 h-6 rounded bg-amber-200 text-amber-900 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Available: {wallet.availableCredits} C | Escrow hold applied upon posting.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-nus-blue hover:bg-blue-900 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
              >
                Post Errand & Reserve Escrow
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: Campus Spots Directory (M3 Live Integration) */}
        {activeTab === 'spots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Campus Spots (M3)</h2>
                <p className="text-xs text-slate-500">Live directory fetched from Supplier Service</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full">
                {filteredSuppliers.length} Verified
              </span>
            </div>

            {/* Spot Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search food, cafes, lockers, print hubs..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nus-blue shadow-sm"
              />
            </div>

            {/* Loading Indicator */}
            {isSuppliersLoading && (
              <div className="p-4 text-center text-xs text-slate-400">Loading campus spots...</div>
            )}

            {/* List of Verified Spots */}
            <div className="space-y-3">
              {filteredSuppliers.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {s.supplierCode}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{s.name}</h3>
                      <p className="text-xs text-slate-500">{s.exactLocation}</p>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
                      {s.campusZone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {s.category}
                    </span>
                    <button
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          supplierId: s.id,
                          supplierName: s.name,
                          campusZone: s.campusZone,
                        }));
                        setActiveTab('post');
                      }}
                      className="text-xs font-bold text-nus-orange hover:text-orange-700 flex items-center space-x-1"
                    >
                      <span>Pick for Errand</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: My Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">My Active Tasks</h2>
            <div className="space-y-3">
              {orders
                .filter((o) => o.courierId === wallet.userId || o.requesterId === wallet.userId)
                .map((task) => (
                  <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {task.orderCode}
                      </span>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {task.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{task.itemDescription}</p>
                    <p className="text-[11px] text-slate-500">Pickup: {task.supplierName}</p>
                    <p className="text-[11px] text-slate-500">Dropoff: {task.dropoffLocation}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 5: Wallet & Ledger */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Credit Wallet & Ledger</h2>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-nus-blue to-blue-950 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold tracking-wider text-blue-200 uppercase">NUS Closed Economy</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-blue-200 font-semibold">Total Account Balance</p>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-3xl font-black text-amber-300">
                  {wallet.availableCredits + wallet.escrowCredits}
                </span>
                <span className="text-sm text-blue-200 font-bold">Credits</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-blue-800/80">
                <div className="bg-blue-900/50 p-2.5 rounded-lg border border-blue-700/50">
                  <span className="text-[11px] text-blue-200 block">Available to Spend</span>
                  <span className="text-base font-bold text-emerald-400">{wallet.availableCredits} C</span>
                </div>
                <div className="bg-blue-900/50 p-2.5 rounded-lg border border-blue-700/50">
                  <span className="text-[11px] text-blue-200 block">Held in Escrow</span>
                  <span className="text-base font-bold text-amber-300">{wallet.escrowCredits} C</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>
                <strong>Closed Economy Guarantee:</strong> Credits cannot be bought or withdrawn with real money.
                Complete errands for peers to earn more credits.
              </span>
            </div>

            {/* Transaction Ledger */}
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-2">Recent Ledger Transactions</h3>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">Welcome Grant</p>
                    <p className="text-[10px] text-slate-400">Initial student signup allocation</p>
                  </div>
                  <span className="font-bold text-emerald-600">+100 C</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">Escrow Hold (E-1042)</p>
                    <p className="text-[10px] text-slate-400">Locked for active request</p>
                  </div>
                  <span className="font-bold text-amber-600">-15 C</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 px-3 py-2 flex justify-around items-center z-40">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center py-1 transition ${
            activeTab === 'feed' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('post')}
          className={`flex flex-col items-center py-1 transition ${
            activeTab === 'post' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Post</span>
        </button>

        <button
          onClick={() => setActiveTab('spots')}
          className={`flex flex-col items-center py-1 transition ${
            activeTab === 'spots' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Spots</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center py-1 transition ${
            activeTab === 'tasks' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Tasks</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center py-1 transition ${
            activeTab === 'wallet' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Wallet</span>
        </button>
      </nav>
    </div>
  );
}
