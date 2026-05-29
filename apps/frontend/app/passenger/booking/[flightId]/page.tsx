"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plane, Calendar, CreditCard, CheckCircle2, ChevronLeft, ShieldCheck, Clock, Armchair } from "lucide-react";
import { flightApi, bookingApi } from "../../../../lib/api";
import { getUserId, getUserRole, decodeToken, getToken } from "../../../../lib/auth";
import Link from "next/link";
import { io, Socket } from "socket.io-client";

export default function PassengerBookingCheckout() {
  const params = useParams();
  const router = useRouter();
  const flightId = params.flightId as string;
  
  const [flight, setFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentToken, setPaymentToken] = useState("");
  const [error, setError] = useState("");
  const [kycFailed, setKycFailed] = useState(false);

  // Seat Selection State
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [seatLockError, setSeatLockError] = useState("");

  useEffect(() => {
    const role = getUserRole();
    if (role !== "USER" && role !== "ADMIN") {
      router.push("/passenger/login");
      return;
    }

    const token = getToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded?.kycVerified === false) {
        setKycFailed(true);
      }
    }

    const initData = async () => {
      try {
        const [flightRes, seatsRes] = await Promise.all([
          flightApi.get(`/flights/${flightId}`),
          flightApi.get(`/flights/${flightId}/seats`)
        ]);
        setFlight(flightRes.data);
        setBookedSeats(seatsRes.data.bookedSeats || []);
        setLockedSeats(seatsRes.data.lockedSeats || []);
      } catch (err) {
        console.error("Failed to fetch flight data", err);
        setError("Flight not found. It may have been removed.");
      } finally {
        setLoading(false);
      }
    };

    initData();

    // Initialize WebSocket connection to Flight Service (Port 3001)
    const newSocket = io("http://localhost:3001/flights");
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Flight WebSocket Gateway');
    });

    newSocket.on('seat.status.updated', (payload: { flightId: string, seatNumber: string, status: string }) => {
      if (payload.flightId === flightId) {
        if (payload.status === 'LOCKED') {
          setLockedSeats(prev => Array.from(new Set([...prev, payload.seatNumber])));
        } else if (payload.status === 'BOOKED') {
          setBookedSeats(prev => Array.from(new Set([...prev, payload.seatNumber])));
          setLockedSeats(prev => prev.filter(s => s !== payload.seatNumber));
        } else if (payload.status === 'AVAILABLE') {
          setLockedSeats(prev => prev.filter(s => s !== payload.seatNumber));
          setBookedSeats(prev => prev.filter(s => s !== payload.seatNumber));
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [flightId, router]);

  // Handle Seat Click (Phantom Hold)
  const handleSeatClick = async (seatNumber: string) => {
    // If seat is booked, or it is locked by SOMEONE ELSE, block it.
    if (bookedSeats.includes(seatNumber) || (lockedSeats.includes(seatNumber) && selectedSeat !== seatNumber) || kycFailed) {
      return; // Can't select
    }

    setSeatLockError("");

    if (selectedSeat === seatNumber) {
      // Deselect (Unlock)
      try {
        await flightApi.delete(`/flights/${flightId}/seats/lock/${seatNumber}`);
        setSelectedSeat(null);
      } catch (err: any) {
        setSeatLockError("Failed to unlock seat.");
      }
      return;
    }

    // If changing seat, unlock the previous one first
    if (selectedSeat) {
      try {
        await flightApi.delete(`/flights/${flightId}/seats/lock/${selectedSeat}`);
      } catch (e) {
        console.error("Failed to unlock previous seat", e);
      }
    }

    try {
      // POST to Flight Service to acquire Phantom Hold
      await flightApi.post(`/flights/${flightId}/seats/lock`, { seatNumber });
      setSelectedSeat(seatNumber);
    } catch (err: any) {
      setSeatLockError(err.response?.data?.message || "Failed to lock seat. Another user may have just grabbed it!");
    }
  };

  const getSeatClass = (row: number) => {
    if (row <= 4) return { name: "First Class", markup: 200, color: "bg-amber-500/20 border-amber-500/50 text-amber-300" };
    if (row <= 10) return { name: "Business", markup: 100, color: "bg-blue-500/20 border-blue-500/50 text-blue-300" };
    return { name: "Economy", markup: 0, color: "bg-slate-700/50 border-slate-600 text-slate-300" };
  };

  const calculateFinalPrice = () => {
    if (!flight) return 0;
    let price = flight.price;
    if (selectedSeat) {
      const row = parseInt(selectedSeat.replace(/\D/g, ''));
      price += getSeatClass(row).markup;
    }
    return price;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) {
      setSeatLockError("You must select a seat to proceed.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const passengerId = getUserId();
      await bookingApi.post("/bookings", {
        passengerId,
        flightId,
        seatNumber: selectedSeat,
        paymentToken,
        price: calculateFinalPrice(),
      });
      
      router.push("/passenger/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Checkout failed to initialize Saga sequence.");
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex justify-center items-center text-cyan-400 font-bold animate-pulse tracking-widest">Establishing secure link...</div>;
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <div className="bg-red-500/10 text-red-400 border border-red-500/30 p-4 rounded-xl max-w-md text-center mb-4">
          {error}
        </div>
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">Return to Home</Link>
      </div>
    );
  }

  // Generate 42 Rows x 6 Seats
  const rows = Array.from({ length: 42 }, (_, i) => i + 1);
  const cols = ['A', 'B', 'C', '', 'D', 'E', 'F']; // Empty string for aisle

  return (
    <div className="min-h-screen bg-slate-950 pt-20 px-4 sm:px-8 pb-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center space-x-2 w-fit mb-4">
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Search</span>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Flight {flight.flightNumber}</h1>
            <p className="text-slate-400">Select your seat and complete your reservation.</p>
          </div>
          <div className="hidden lg:flex space-x-4 text-sm font-medium">
            <div className="flex items-center"><div className="w-4 h-4 bg-amber-500/20 border border-amber-500/50 rounded mr-2" /> First Class (+$200)</div>
            <div className="flex items-center"><div className="w-4 h-4 bg-blue-500/20 border border-blue-500/50 rounded mr-2" /> Business (+$100)</div>
            <div className="flex items-center"><div className="w-4 h-4 bg-slate-700/50 border border-slate-600 rounded mr-2" /> Economy</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Pane: Interactive Plane Diagram (66%) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-2/3 glass-panel p-8 rounded-3xl border border-white/5 h-[800px] overflow-y-auto custom-scrollbar relative"
          >
            <div className="absolute top-4 right-4 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync Active</span>
            </div>

            <div className="flex flex-col items-center">
              {/* Airplane Nose Graphic */}
              <div className="w-64 h-32 border-t-4 border-l-4 border-r-4 border-slate-800 rounded-t-[100px] mb-8 relative">
                <div className="absolute bottom-4 w-full text-center text-slate-500 uppercase tracking-widest text-xs font-bold">Cockpit</div>
              </div>

              {seatLockError && (
                <div className="w-full max-w-md bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center mb-6">
                  {seatLockError}
                </div>
              )}

              {/* Seat Grid */}
              <div className="flex flex-col space-y-3 w-full max-w-md pb-20">
                {rows.map((row) => (
                  <div key={row} className="flex justify-center items-center">
                    <div className="w-8 text-center text-slate-500 text-xs font-bold mr-4">{row}</div>
                    <div className="flex space-x-2">
                      {cols.map((col, idx) => {
                        if (col === '') return <div key={`aisle-${idx}`} className="w-8" />; // Aisle
                        
                        const seatNumber = `${row}${col}`;
                        const isBooked = bookedSeats.includes(seatNumber);
                        // If it's locked, but WE selected it, it's ours!
                        const isSelected = selectedSeat === seatNumber;
                        const isLocked = lockedSeats.includes(seatNumber) && !isSelected;
                        
                        const seatClass = getSeatClass(row);
                        
                        let stateStyles = seatClass.color + " hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.5)] cursor-pointer";
                        
                        if (isSelected) {
                          stateStyles = "bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.8)] scale-110 z-10 cursor-default";
                        } else if (isBooked) {
                          stateStyles = "bg-red-950/40 border-red-900/50 text-red-900/50 cursor-not-allowed line-through";
                        } else if (isLocked) {
                          stateStyles = "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed";
                        }

                        return (
                          <button
                            key={seatNumber}
                            onClick={() => handleSeatClick(seatNumber)}
                            disabled={isBooked || isLocked || isSelected || kycFailed}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-t-lg rounded-b-sm border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${stateStyles}`}
                            title={isBooked ? 'Booked' : isLocked ? 'Locked by another user' : `${seatClass.name} Seat`}
                          >
                            {seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Pane: Summary & Payment (33%) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/3 flex flex-col space-y-6"
          >
            {/* Trip Summary */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Trip Summary</h3>
              
              <div className="flex justify-between items-center mb-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-cyan-400">{flight.origin}</p>
                </div>
                <div className="flex-1 px-2 flex justify-center text-slate-600">
                  <Plane className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-cyan-400">{flight.destination}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                  <div className="flex items-center text-slate-300">
                    <Clock className="w-4 h-4 mr-2 text-blue-400" />
                    <span>Departure</span>
                  </div>
                  <span className="font-medium text-white">{new Date(flight.departureTime).toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                  <div className="flex items-center text-slate-300">
                    <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                    <span>Arrival</span>
                  </div>
                  <span className="font-medium text-white">{new Date(flight.arrivalTime).toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                  <div className="flex items-center text-slate-300">
                    <Armchair className="w-4 h-4 mr-2 text-amber-400" />
                    <span>Selected Seat</span>
                  </div>
                  <span className={`font-black ${selectedSeat ? 'text-cyan-400 text-lg' : 'text-slate-500'}`}>
                    {selectedSeat || 'None'}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                <div>
                  <p className="text-slate-400 text-sm">Total Price</p>
                  <p className="text-3xl font-bold text-white">${calculateFinalPrice().toFixed(2)}</p>
                </div>
                <p className="text-emerald-500 text-xs flex items-center font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  No Hidden Fees
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Payment Method</h3>
              
              <form onSubmit={handleCheckout} className="space-y-4">
                {kycFailed ? (
                  <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 mb-6 flex flex-col space-y-2">
                    <div className="flex items-start space-x-3">
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                      <p className="font-bold uppercase tracking-wider">KYC Verification Failed</p>
                    </div>
                    <p className="text-sm">Your background check failed. You are restricted from booking any flights.</p>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl text-blue-400 text-xs mb-4 flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Enter any token (e.g. "tok_visa") to trigger the saga.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-slate-300 text-xs font-medium pl-1">Mock Payment Token</label>
                  <div className="relative group">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      required
                      value={paymentToken}
                      onChange={(e) => setPaymentToken(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm" 
                      placeholder="tok_visa_success" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={processing || kycFailed || !selectedSeat}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center space-x-2 shadow-lg shadow-cyan-900/50 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="animate-pulse">Processing Saga...</span>
                  ) : kycFailed ? (
                    <span>Booking Restricted</span>
                  ) : !selectedSeat ? (
                    <span>Select a Seat</span>
                  ) : (
                    <span>Confirm & Pay ${calculateFinalPrice().toFixed(2)}</span>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
