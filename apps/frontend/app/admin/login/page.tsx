"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal } from "lucide-react";
import { authApi } from "../../../lib/api";
import { setToken, decodeToken, getUserRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const role = getUserRole();
    if (role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (role === "USER") {
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
        
        if (decoded?.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          // If a passenger tries to log in here, kick them out
          setError("ACCESS DENIED: Insufficient Clearance.");
          // removeToken();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "ACCESS DENIED: Invalid Credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative bg-black font-mono">
      {/* Intense red glow for restricted area vibe */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-red-900/20 blur-[150px] pointer-events-none rounded-full" />
      
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-zinc-950/80 border border-red-900/50 rounded-lg p-8 relative z-10 shadow-2xl shadow-red-900/20"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-red-950/50 border border-red-900 p-4 rounded-md">
            <ShieldAlert className="text-red-500 w-8 h-8" />
          </div>
        </div>
        
        <div className="text-center mb-8 border-b border-red-900/30 pb-6">
          <h2 className="text-2xl font-bold text-red-500 tracking-widest uppercase">Restricted Access</h2>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">AeroLink Staff Terminal</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500 text-red-400 p-3 rounded mb-6 text-sm flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-zinc-400 text-xs uppercase tracking-widest">Staff Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-700 outline-none transition-colors" 
              placeholder="admin@aerolink.com" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-zinc-400 text-xs uppercase tracking-widest">Clearance Code (Password)</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 focus:border-red-500 rounded p-3 text-red-100 placeholder-zinc-700 outline-none transition-colors tracking-widest" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-100 font-bold py-3 px-4 rounded transition-all uppercase tracking-widest mt-4"
          >
            {loading ? "Authenticating..." : "Establish Connection"}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
            Unauthorized access is strictly prohibited and monitored.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
