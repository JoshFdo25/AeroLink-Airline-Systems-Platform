"use client";

import { useState, useEffect } from "react";
import { Terminal, Plus, Trash2, Plane, Activity, ChevronLeft } from "lucide-react";
import { flightApi } from "../../../lib/api";
import { getUserRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FlightOperations() {
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Form state
  const [flightNumber, setFlightNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [price, setPrice] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  
  // To avoid date-picker complexity in a terminal, we'll auto-generate relative times
  // or allow simple ISO string input. Let's auto-generate them on submit for simplicity.

  useEffect(() => {
    const role = getUserRole();
    if (role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchFlights();
  }, [router]);

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

  const handleCreateFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mock departure (tomorrow) and arrival (+5 hours)
      const dep = new Date();
      dep.setDate(dep.getDate() + 1);
      const arr = new Date(dep);
      arr.setHours(arr.getHours() + 5);

      await flightApi.post("/flights", {
        flightNumber,
        origin,
        destination,
        price: parseFloat(price),
        availableSeats: parseInt(availableSeats),
        departureTime: dep.toISOString(),
        arrivalTime: arr.toISOString(),
      });
      
      // Reset form
      setFlightNumber("");
      setOrigin("");
      setDestination("");
      setPrice("");
      setAvailableSeats("");
      
      await fetchFlights();
    } catch (error) {
      console.error("Failed to create flight", error);
      alert("COMMAND FAILED: Unable to execute write to PostgreSQL");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlight = async (id: string) => {
    if (!confirm("CRITICAL WARNING: Are you sure you want to delete this flight record?")) return;
    try {
      await flightApi.delete(`/flights/${id}`);
      await fetchFlights();
    } catch (error) {
      console.error("Failed to delete flight", error);
      alert("COMMAND FAILED: Active bookings may prevent deletion.");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await flightApi.patch(`/flights/${id}`, { status: newStatus });
      await fetchFlights();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("COMMAND FAILED: Unable to update status");
    }
  };

  return (
    <div className="min-h-screen bg-black font-mono text-zinc-300 p-8">
      {/* Security overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-8 border-b border-red-900/30 pb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-zinc-500 hover:text-red-500 transition-colors p-2 border border-zinc-800 rounded mr-2">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="bg-red-950/50 border border-red-900 p-2 rounded">
              <Terminal className="text-red-500 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-500 tracking-widest uppercase">Flight Operations Center</h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest">CQRS Write Model Interface</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Creation Command Module */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-red-900/50" />
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                <Plus className="w-5 h-5 mr-2 text-red-500" />
                Initialize Flight
              </h3>
              
              <form onSubmit={handleCreateFlight} className="space-y-4">
                <div>
                  <label className="text-zinc-500 text-xs uppercase tracking-widest">Flight Code</label>
                  <input type="text" required value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="AL-999" className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-800 outline-none uppercase transition-colors mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 text-xs uppercase tracking-widest">Origin</label>
                    <input type="text" required value={origin} onChange={e => setOrigin(e.target.value)} placeholder="JFK" className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-800 outline-none uppercase transition-colors mt-1" />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs uppercase tracking-widest">Dest</label>
                    <input type="text" required value={destination} onChange={e => setDestination(e.target.value)} placeholder="LHR" className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-800 outline-none uppercase transition-colors mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 text-xs uppercase tracking-widest">Price ($)</label>
                    <input type="number" required value={price} onChange={e => setPrice(e.target.value)} placeholder="450" className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-800 outline-none transition-colors mt-1" />
                  </div>
                  <div>
                    <label className="text-zinc-500 text-xs uppercase tracking-widest">Seats</label>
                    <input type="number" required value={availableSeats} onChange={e => setAvailableSeats(e.target.value)} placeholder="200" className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-800 outline-none transition-colors mt-1" />
                  </div>
                </div>
                
                <button type="submit" disabled={loading} className="w-full bg-red-900/20 hover:bg-red-900/50 border border-red-900/50 text-red-400 font-bold py-3 px-4 rounded transition-all uppercase tracking-widest mt-6">
                  Execute Creation Command
                </button>
              </form>
            </div>
          </div>

          {/* Active Flights Data Grid */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-emerald-500" />
                  Live Flight Grid
                </h3>
                <span className="text-zinc-500 text-xs uppercase flex items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  Sync: Redis Cached
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                      <th className="pb-3 font-normal">Flight</th>
                      <th className="pb-3 font-normal">Route</th>
                      <th className="pb-3 font-normal">Status</th>
                      <th className="pb-3 font-normal">Seats</th>
                      <th className="pb-3 font-normal text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flights.map((flight) => (
                      <tr key={flight.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center text-white font-bold">
                            <Plane className="w-4 h-4 mr-2 text-zinc-600" />
                            {flight.flightNumber}
                          </div>
                        </td>
                        <td className="py-4 text-zinc-400">
                          {flight.origin} → {flight.destination}
                        </td>
                        <td className="py-4">
                          <select 
                            value={flight.status}
                            onChange={(e) => handleUpdateStatus(flight.id, e.target.value)}
                            className="bg-black border border-emerald-900 text-emerald-500 rounded text-xs uppercase tracking-wider p-1 outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            <option value="SCHEDULED">SCHEDULED</option>
                            <option value="BOARDING">BOARDING</option>
                            <option value="DEPARTED">DEPARTED</option>
                            <option value="ARRIVED">ARRIVED</option>
                            <option value="DELAYED">DELAYED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="py-4 text-zinc-400 font-mono">
                          {flight.availableSeats}
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleDeleteFlight(flight.id)}
                            className="text-zinc-500 hover:text-red-500 p-2 transition-colors"
                            title="Terminate Flight"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {flights.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-600 uppercase tracking-widest">
                          No Active Flights Detected in Database
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
