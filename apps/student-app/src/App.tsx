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
} from 'lucide-react';
import { OrderDTO, CreditWalletDTO } from '@campus-errand/common-dtos';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'post' | 'tasks' | 'wallet'>('feed');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

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
    supplierName: 'CoffeeBean @ COM3',
    campusZone: 'COM3',
    itemDescription: '',
    specialNotes: '',
    dropoffLocation: '',
    rewardCredits: 15,
  });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
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

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'ACCEPTED', courierId: wallet.userId } : o))
    );
    setNotification('🎉 Errand Accepted! Navigate to pickup point.');
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wallet.availableCredits < formData.rewardCredits) {
      alert('Insufficient available credits! Earn credits by fulfilling errands first.');
      return;
    }

    const newOrder: OrderDTO = {
      id: `ord-${Date.now()}`,
      orderCode: `E-${Math.floor(1000 + Math.random() * 9000)}`,
      requesterId: wallet.userId,
      courierId: null,
      supplierId: 's1',
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

    setFormData({
      supplierName: 'CoffeeBean @ COM3',
      campusZone: 'COM3',
      itemDescription: '',
      specialNotes: '',
      dropoffLocation: '',
      rewardCredits: 15,
    });

    setActiveTab('feed');
    setNotification('✅ Errand posted & escrow locked! Couriers have been notified.');
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredOrders = selectedZone === 'ALL' ? orders : orders.filter((o) => o.campusZone === selectedZone);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-2xl border-x border-slate-200">
      {/* Top Header */}
      <header className="bg-nus-blue text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-nus-orange flex items-center justify-center font-black text-white text-lg">
              E
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">CampusErrand</h1>
              <p className="text-xs text-blue-200">NUS Peer-to-Peer Network</p>
            </div>
          </div>

          {/* Wallet Header Pill */}
          <button
            onClick={() => setActiveTab('wallet')}
            className="flex items-center space-x-1.5 bg-blue-900/80 hover:bg-blue-800 px-3 py-1.5 rounded-full border border-blue-700 transition"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs text-amber-300">{wallet.availableCredits} C</span>
          </button>
        </div>

        {/* Real-time Status Badge */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-blue-200 border-t border-blue-800/60 pt-1.5">
          <span className="flex items-center space-x-1">
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
              {['ALL', 'COM3', 'UTown', 'PGPR', 'FASS'].map((zone) => (
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Store / Spot (M3)</label>
                <select
                  value={formData.supplierName}
                  onChange={(e) => {
                    const val = e.target.value;
                    let zone = 'COM3';
                    if (val.includes('UTown')) zone = 'UTown';
                    if (val.includes('PGP')) zone = 'PGPR';
                    if (val.includes('Deck')) zone = 'FASS';
                    setFormData({ ...formData, supplierName: val, campusZone: zone });
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-nus-blue outline-none"
                >
                  <option value="CoffeeBean @ COM3">CoffeeBean @ COM3 (Level 1)</option>
                  <option value="Printers @ PCCommons">Printers @ PCCommons (UTown SRC L1)</option>
                  <option value="PGP Mailroom & Smart Lockers">PGP Mailroom & Smart Lockers</option>
                  <option value="Fine Food Canteen (UTown)">Fine Food Canteen (UTown Plaza)</option>
                  <option value="The Deck @ FASS">The Deck @ FASS</option>
                </select>
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

        {/* TAB 3: Tasks & Tracking */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">My Active Tasks</h2>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-nus-orange bg-orange-50 px-2 py-0.5 rounded">
                  Courier Mode
                </span>
                <span className="text-xs font-bold text-emerald-600">IN_TRANSIT</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">CS3219 Tutorial 4 Handouts</h3>
              <p className="text-xs text-slate-500">From: Printers @ PCCommons → To: UTown ERC Deck</p>

              {/* State Machine Progress */}
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold pt-2">
                <div className="bg-emerald-500 text-white py-1 rounded">1. Created</div>
                <div className="bg-emerald-500 text-white py-1 rounded">2. Accepted</div>
                <div className="bg-nus-orange text-white py-1 rounded animate-pulse">3. In Transit</div>
                <div className="bg-slate-200 text-slate-500 py-1 rounded">4. Delivered</div>
              </div>

              <button
                onClick={() => {
                  setNotification('🚀 Delivery marked as completed! 20 credits deposited.');
                  setWallet((w) => ({
                    ...w,
                    availableCredits: w.availableCredits + 20,
                    totalEarnedCredits: w.totalEarnedCredits + 20,
                  }));
                  setTimeout(() => setNotification(null), 4000);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg mt-2 transition"
              >
                Mark as Delivered & Claim Credits
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Closed Credit Wallet */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Campus Credit Wallet</h2>

            {/* Total Balance High-Contrast Card */}
            <div className="bg-gradient-to-br from-nus-blue to-blue-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-28 h-28" />
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
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40">
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
