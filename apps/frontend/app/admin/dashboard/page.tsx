"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Server, Users, Plane, ShieldCheck, LogOut, Terminal, Zap } from "lucide-react";
import { flightApi } from "../../../lib/api";
import { removeToken, getUserRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const role = getUserRole();
    if (role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }

    const fetchFlights = async () => {
      try {
        const response = await flightApi.get("/flights");
        setFlights(response.data);
      } catch (error) {
        console.error("Failed to load flights", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-black font-mono text-zinc-300 p-8">
      {/* Security overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-12 border-b border-red-900/30 pb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-red-950/50 border border-red-900 p-2 rounded">
              <ShieldCheck className="text-red-500 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-500 tracking-widest uppercase">System Overview</h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest">AeroLink Mainframe // Authorized Access Only</p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="border border-red-900 text-red-500 hover:bg-red-950/50 py-2 px-4 rounded transition-all flex items-center space-x-2 text-xs uppercase tracking-widest">
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Status Card 1 */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/50" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Active Flights</p>
                <p className="text-4xl font-bold text-white">{flights.length}</p>
              </div>
              <Plane className="w-8 h-8 text-zinc-700" />
            </div>
            <div className="mt-4 flex items-center space-x-2 text-emerald-500 text-xs uppercase">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Redis Cache Synchronized</span>
            </div>
          </div>

          {/* Status Card 2 */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500/50" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Microservices</p>
                <p className="text-4xl font-bold text-white">4 / 4</p>
              </div>
              <Server className="w-8 h-8 text-zinc-700" />
            </div>
            <div className="mt-4 flex items-center space-x-2 text-blue-500 text-xs uppercase">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>API Gateway Online</span>
            </div>
          </div>

          {/* Status Card 3 */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-purple-500/50" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Event Bus</p>
                <p className="text-4xl font-bold text-white">Healthy</p>
              </div>
              <Zap className="w-8 h-8 text-zinc-700" />
            </div>
            <div className="mt-4 flex items-center space-x-2 text-purple-500 text-xs uppercase">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>Saga Choreography Active</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-zinc-400 tracking-widest uppercase mb-6 border-b border-zinc-800 pb-2">Command Modules</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/flights" className="bg-zinc-950 border border-zinc-800 hover:border-red-500/50 p-6 rounded transition-all group relative">
            <Terminal className="absolute top-4 right-4 w-5 h-5 text-zinc-700 group-hover:text-red-500/50" />
            <h4 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Flight Operations</h4>
            <p className="text-zinc-500 text-sm">Create, update, or cancel active flights. Modifies PostgreSQL via CQRS Write Model.</p>
          </Link>

          <Link href="/admin/baggage/scanner" className="bg-zinc-950 border border-zinc-800 hover:border-red-500/50 p-6 rounded transition-all group relative">
            <Terminal className="absolute top-4 right-4 w-5 h-5 text-zinc-700 group-hover:text-red-500/50" />
            <h4 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Baggage Scanner</h4>
            <p className="text-zinc-500 text-sm">Manual airport staff interface to scan luggage barcodes and broadcast real-time WebSockets.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
