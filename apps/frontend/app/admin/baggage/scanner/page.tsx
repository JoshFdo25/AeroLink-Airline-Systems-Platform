"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScanBarcode, Luggage, MapPin, CheckCircle, RefreshCcw } from "lucide-react";
import { baggageApi } from "../../../../lib/api";

export default function AdminBaggageScanner() {
  const [bags, setBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // States for new bag simulation
  const [newPassengerId, setNewPassengerId] = useState("");
  const [newFlightId, setNewFlightId] = useState("");

  useEffect(() => {
    fetchBags();
  }, []);

  const fetchBags = async () => {
    setLoading(true);
    try {
      const res = await baggageApi.get('/baggage');
      setBags(res.data);
    } catch (error) {
      console.error("Failed to fetch bags", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, newLocation: string) => {
    setUpdating(id);
    try {
      await baggageApi.patch(`/baggage/${id}/status`, {
        status: newStatus,
        location: newLocation
      });
      await fetchBags(); // Refresh list
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckInBag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await baggageApi.post('/baggage', {
        passengerId: newPassengerId,
        flightId: newFlightId
      });
      setNewPassengerId("");
      setNewFlightId("");
      await fetchBags();
    } catch (error) {
      console.error("Failed to check in bag", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CHECKED_IN': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'LOADED': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'IN_TRANSIT': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'READY_FOR_PICKUP': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'CLAIMED': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-20 text-slate-200">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/20 flex items-center justify-center border border-cyan-500/30">
              <ScanBarcode className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Baggage Scanner Hub</h1>
              <p className="text-slate-400">Ground Crew Operations Dashboard</p>
            </div>
          </div>
          <button onClick={fetchBags} className="p-3 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700">
            <RefreshCcw className={`w-5 h-5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Check-in new bag form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Luggage className="w-5 h-5 text-cyan-400" />
                <span>Simulate Bag Drop</span>
              </h2>
              <form onSubmit={handleCheckInBag} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Passenger ID</label>
                  <input 
                    type="text" 
                    required
                    value={newPassengerId}
                    onChange={e => setNewPassengerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-mono text-sm"
                    placeholder="e.g. 5ada06b7-..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Flight ID</label>
                  <input 
                    type="text" 
                    required
                    value={newFlightId}
                    onChange={e => setNewFlightId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-mono text-sm"
                    placeholder="Flight ID..."
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-900/30"
                >
                  Check In Baggage
                </button>
              </form>
            </div>
          </div>

          {/* List of active bags */}
          <div className="lg:col-span-2 space-y-4">
            {loading && bags.length === 0 ? (
              <div className="text-center py-20 text-slate-500 animate-pulse">Loading active bags...</div>
            ) : bags.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
                <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No active bags</h3>
                <p className="text-slate-400 mt-2">All checked baggage has been processed.</p>
              </div>
            ) : (
              bags.map((bag, i) => (
                <motion.div 
                  key={bag.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col sm:flex-row gap-4 justify-between items-center"
                >
                  <div className="flex-1 w-full">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">BAG: {bag.id.split('-')[0]}...</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${getStatusColor(bag.status)}`}>
                        {bag.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Pax:</span> <span className="font-mono text-xs">{bag.passengerId.split('-')[0]}</span></div>
                      <div><span className="text-slate-500">Flt:</span> <span className="font-mono text-xs">{bag.flightId.split('-')[0]}</span></div>
                      <div className="col-span-2 flex items-center space-x-2 text-cyan-400 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs font-medium">{bag.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 w-full sm:w-auto">
                    <select 
                      disabled={updating === bag.id}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [newStatus, newLocation] = val.split('|');
                        handleUpdateStatus(bag.id, newStatus, newLocation);
                      }}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:border-cyan-500 outline-none w-full sm:w-48"
                      value="" // Always reset to placeholder
                    >
                      <option value="" disabled>Scan & Update...</option>
                      <option value="CHECKED_IN|Drop-off Counter">Set: Check-In</option>
                      <option value="LOADED|Aircraft Cargo Hold">Set: Loaded (Aircraft)</option>
                      <option value="IN_TRANSIT|Destination Airport">Set: In Transit</option>
                      <option value="READY_FOR_PICKUP|Carousel 4">Set: Ready for Pickup</option>
                      <option value="CLAIMED|Exit Gate">Set: Claimed</option>
                    </select>
                  </div>
                </motion.div>
              ))
            )}
          </div>

        </div>
      </div>
      
      {/* Background decoration */}
      <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
}
