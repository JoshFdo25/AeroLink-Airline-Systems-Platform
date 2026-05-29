"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, Plane } from "lucide-react";
import { authApi } from "../../../lib/api";
import { setToken, decodeToken, getUserRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PassengerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const role = getUserRole();
    if (role === "USER" || role === "ADMIN") {
      router.push("/passenger/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authApi.post("/auth/login", { email, password });
      const { access_token } = response.data;
      
      if (access_token) {
        setToken(access_token);
        const decoded = decodeToken(access_token);
        
        if (decoded?.role === "USER" || decoded?.role === "ADMIN") {
          router.push("/passenger/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-cyan-600/10 blur-[120px] pointer-events-none rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-[2rem] p-8 relative z-10 border border-white/5"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-cyan-500/20 p-4 rounded-full">
            <Plane className="text-cyan-400 w-8 h-8" />
          </div>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Passenger Portal</h2>
          <p className="text-slate-400 text-sm">Manage your AeroLink bookings and profile.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium pl-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all" 
                placeholder="passenger@example.com" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium pl-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-4 rounded-2xl transition-all flex justify-center items-center space-x-2 shadow-lg shadow-cyan-900/50"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center text-slate-400 text-sm">
          Don't have an account?{" "}
          <Link href="/passenger/register" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
            Register Here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
