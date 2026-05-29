"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, PlaneTakeoff, ArrowRight } from "lucide-react";
import { flightApi } from "../lib/api";
import Link from "next/link";

export default function Home() {
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchFlights = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Connect to the Flight Service microservice
      const response = await flightApi.get("/flights");
      setFlights(response.data);
    } catch (error) {
      console.error("Failed to load flights:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-20 px-4 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none" />

      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10 mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          The Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Aviation</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
          Experience seamless global travel powered by an advanced distributed microservices architecture.
        </p>
      </motion.div>

      {/* Glassmorphic Search Module */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-5xl glass-panel rounded-[2rem] p-6 md:p-8 mb-16 z-10 shadow-2xl shadow-cyan-900/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 flex items-center space-x-3 transition-colors focus-within:border-cyan-500/50">
            <MapPin className="text-cyan-400 w-5 h-5 flex-shrink-0" />
            <input type="text" placeholder="From (e.g. LHR)" className="bg-transparent outline-none w-full text-slate-100 placeholder-slate-500 font-medium" defaultValue="LHR" />
          </div>
          
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 flex items-center space-x-3 transition-colors focus-within:border-blue-500/50">
            <MapPin className="text-blue-400 w-5 h-5 flex-shrink-0" />
            <input type="text" placeholder="To (e.g. JFK)" className="bg-transparent outline-none w-full text-slate-100 placeholder-slate-500 font-medium" defaultValue="JFK" />
          </div>
          
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 flex items-center space-x-3 transition-colors focus-within:border-slate-500/50">
            <Calendar className="text-slate-400 w-5 h-5 flex-shrink-0" />
            <input type="date" className="bg-transparent outline-none w-full text-slate-100 font-medium" />
          </div>
          
          <button 
            onClick={fetchFlights}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl p-4 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/25"
          >
            {loading ? (
              <span className="animate-pulse">Scanning DB...</span>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Search Flights</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Flight Results */}
      {hasSearched && (
        <div className="w-full max-w-5xl z-10 pb-20">
          <h2 className="text-2xl font-bold mb-6 text-white pl-2 border-l-4 border-cyan-500">Available Routes</h2>
          
          {flights.length === 0 && !loading ? (
            <div className="text-center py-12 glass-panel rounded-2xl text-slate-400">
              No flights found for this route.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flights.map((flight, i) => (
                <motion.div 
                  key={flight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="glass-panel p-6 rounded-2xl flex flex-col hover:border-cyan-500/40 transition-all hover:shadow-lg hover:shadow-cyan-900/20 group"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-wider">{flight.flightNumber}</h3>
                      <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {flight.status || "SCHEDULED"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">${flight.price}</p>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mt-1">Per Seat</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-8 px-2">
                    <div className="text-center">
                      <p className="text-4xl font-black text-white">{flight.origin}</p>
                      <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Origin</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
                      <div className="h-[2px] w-full bg-slate-700 relative">
                        <div className="absolute top-0 left-0 h-full w-0 bg-cyan-500 group-hover:w-full transition-all duration-1000 ease-out" />
                      </div>
                      <PlaneTakeoff className="absolute text-slate-500 w-6 h-6 group-hover:text-cyan-400 transition-colors duration-500" />
                    </div>
                    
                    <div className="text-center">
                      <p className="text-4xl font-black text-white">{flight.destination}</p>
                      <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Dest</p>
                    </div>
                  </div>

                  {/* Note: This routes to the secure Passenger Portal to trigger the Saga! */}
                  <Link 
                    href={`/passenger/booking/${flight.id}`}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3.5 text-center text-white font-semibold transition-all flex items-center justify-center space-x-2 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 group-hover:text-cyan-300"
                  >
                    <span>Proceed to Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
