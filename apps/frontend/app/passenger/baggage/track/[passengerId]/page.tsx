"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Luggage, ShieldCheck, PlaneTakeoff, PlaneLanding, MapPin, ArrowLeft } from "lucide-react";
import { baggageApi } from "../../../../../lib/api";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_STEPS = [
  { id: 'CHECKED_IN', label: 'Checked In', icon: Luggage, color: 'text-amber-400', bg: 'bg-amber-400' },
  { id: 'LOADED', label: 'Loaded', icon: PlaneTakeoff, color: 'text-blue-400', bg: 'bg-blue-400' },
  { id: 'IN_TRANSIT', label: 'In Transit', icon: PlaneLanding, color: 'text-purple-400', bg: 'bg-purple-400' },
  { id: 'READY_FOR_PICKUP', label: 'Ready', icon: MapPin, color: 'text-emerald-400', bg: 'bg-emerald-400' },
  { id: 'CLAIMED', label: 'Claimed', icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-400' },
];

export default function PassengerBaggageTracker() {
  const params = useParams();
  const passengerId = params.passengerId as string;
  const [bags, setBags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!passengerId) return;

    // Initial Fetch
    const fetchBags = async () => {
      try {
        const res = await baggageApi.get(`/baggage/passenger/${passengerId}`);
        setBags(res.data);
      } catch (error) {
        console.error("Failed to fetch bags", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBags();

    // WebSocket Connection
    const socket: Socket = io("http://localhost:3004");
    
    socket.on("connect", () => {
      console.log("Connected to Baggage WebSocket!");
    });

    socket.on("baggage.updated", (updatedBag: any) => {
      if (updatedBag.passengerId === passengerId) {
        console.log("Real-time bag update received:", updatedBag);
        setBags(prevBags => {
          // If the bag already exists, update it. Otherwise, add it (in case they just checked it in).
          const exists = prevBags.some(b => b.id === updatedBag.id);
          if (exists) {
            return prevBags.map(b => b.id === updatedBag.id ? updatedBag : b);
          }
          return [updatedBag, ...prevBags];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [passengerId]);

  const getStepIndex = (status: string) => {
    return STATUS_STEPS.findIndex(s => s.id === status);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-20 text-slate-200">
      <div className="max-w-4xl mx-auto relative z-10">
        
        <div className="mb-8 flex items-center space-x-4">
          <Link href="/passenger/dashboard" className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition-colors border border-slate-800">
            <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-white" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
              <Luggage className="w-8 h-8 text-cyan-400" />
              <span>Live Baggage Tracker</span>
            </h1>
            <p className="text-slate-400 mt-1">Real-time tracking powered by WebSockets</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-cyan-400 animate-pulse font-medium text-lg">
            Connecting to baggage network...
          </div>
        ) : bags.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-16 text-center shadow-xl glass-panel">
            <Luggage className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Baggage Found</h2>
            <p className="text-slate-400">You haven't checked in any bags for your recent flights.</p>
          </div>
        ) : (
          <div className="space-y-12">
            <AnimatePresence>
              {bags.map((bag, i) => {
                const currentStepIndex = getStepIndex(bag.status);
                
                return (
                  <motion.div 
                    key={bag.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                  >
                    {/* Background glow specific to the bag's current status */}
                    <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full opacity-10 pointer-events-none transition-colors duration-1000 ${STATUS_STEPS[currentStepIndex]?.bg || 'bg-slate-500'}`} />
                    
                    <div className="flex justify-between items-end mb-10 relative z-10 border-b border-slate-800 pb-6">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Bag Tag Number</div>
                        <div className="text-2xl font-mono text-white">{bag.id.split('-')[0].toUpperCase()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Current Location</div>
                        <div className="text-xl font-medium text-cyan-400 flex items-center justify-end space-x-2">
                          <MapPin className="w-5 h-5" />
                          <motion.span 
                            key={bag.location} // Animate when location changes
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            {bag.location}
                          </motion.span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Tracker */}
                    <div className="relative z-10 px-4">
                      {/* Connecting Line */}
                      <div className="absolute top-6 left-12 right-12 h-1 bg-slate-800 rounded-full z-0 overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                          transition={{ duration: 1, type: "spring" }}
                        />
                      </div>

                      {/* Steps */}
                      <div className="flex justify-between relative z-10">
                        {STATUS_STEPS.map((step, index) => {
                          const Icon = step.icon;
                          const isCompleted = index <= currentStepIndex;
                          const isCurrent = index === currentStepIndex;

                          return (
                            <div key={step.id} className="flex flex-col items-center">
                              <motion.div 
                                animate={{
                                  backgroundColor: isCompleted ? '#0f172a' : '#020617', // slate-900 : slate-950
                                  borderColor: isCompleted ? (isCurrent ? '#22d3ee' : '#334155') : '#1e293b',
                                  scale: isCurrent ? 1.2 : 1,
                                }}
                                transition={{ duration: 0.5 }}
                                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg relative ${isCurrent ? 'shadow-cyan-900/50' : ''}`}
                              >
                                <Icon className={`w-5 h-5 ${isCompleted ? step.color : 'text-slate-600'}`} />
                                
                                {isCurrent && (
                                  <motion.div 
                                    className={`absolute inset-0 rounded-full border-2 ${step.color} opacity-50`}
                                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                )}
                              </motion.div>
                              <div className={`mt-4 text-xs font-bold uppercase tracking-wider text-center w-24 ${isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                                {step.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
