"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plane, Calendar, Luggage, Search, LogOut, Armchair, Activity } from "lucide-react";
import { bookingApi } from "../../../lib/api";
import { getUserId, removeToken } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PassengerDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      const userId = getUserId();
      if (!userId) {
        router.push("/passenger/login");
        return;
      }
      try {
        const response = await bookingApi.get(`/bookings/passenger/${userId}`);
        setBookings(response.data);
      } catch (error) {
        console.error("Failed to load bookings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push("/passenger/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 pt-20">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Trips</h1>
            <p className="text-slate-400">Manage your upcoming AeroLink flights.</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/" className="bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 font-medium py-2 px-4 rounded-xl transition-all flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Book Flight</span>
            </Link>
            <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-xl transition-all flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-cyan-400 animate-pulse">Loading securely via CQRS Read Model...</div>
        ) : bookings.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border border-white/5">
            <Plane className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl text-white font-bold mb-2">No Upcoming Trips</h2>
            <p className="text-slate-400 mb-6">You haven't booked any flights yet.</p>
            <Link href="/" className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-xl transition-all">
              Search Flights
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking, i) => (
              <motion.div 
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Booking Ref</span>
                    <p className="text-lg font-mono text-cyan-400">{booking.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-800">
                  <div className="flex items-center space-x-3 text-slate-300 mb-3">
                    <Plane className="w-5 h-5 text-slate-500" />
                    <span className="font-medium">Flight ID: {booking.flightId}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300 mb-3">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <span>Flight Status: <span className="font-bold text-emerald-400">{booking.flightStatus || 'SCHEDULED'}</span></span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300 mb-3">
                    <Armchair className="w-5 h-5 text-slate-500" />
                    <span>Seat: <span className="font-bold text-amber-400">{booking.seatNumber || 'UNASSIGNED'}</span></span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-300">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <span>Price Paid: ${booking.price}</span>
                  </div>
                </div>

                <Link 
                  href={`/passenger/baggage/track/${booking.passengerId}`}
                  className="w-full bg-slate-800 hover:bg-cyan-600 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center space-x-2 group-hover:shadow-lg group-hover:shadow-cyan-900/50"
                >
                  <Luggage className="w-5 h-5" />
                  <span>Track Baggage</span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Background glow */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
}
