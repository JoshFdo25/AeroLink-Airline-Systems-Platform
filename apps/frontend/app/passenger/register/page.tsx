"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Mail, Lock, User, FileText } from "lucide-react";
import { authApi } from "../../../lib/api";
import { getUserRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PassengerRegister() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const role = getUserRole();
    if (role === "USER" || role === "ADMIN") {
      router.push("/passenger/dashboard");
    }
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authApi.post("/auth/register", { 
        firstName, 
        lastName, 
        passportNumber, 
        email, 
        password 
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/passenger/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Email might already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative bg-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel rounded-[2rem] p-8 relative z-10 border border-white/5"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-slate-400 text-sm">Join AeroLink's Global Network</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg mb-6 text-sm text-center font-medium">
            KYC Verified! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium pl-1">First Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400" />
                <input 
                  type="text" 
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="John" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium pl-1">Last Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400" />
                <input 
                  type="text" 
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                  placeholder="Doe" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium pl-1">Passport Number (KYC)</label>
            <div className="relative group">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400" />
              <input 
                type="text" 
                required
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white uppercase focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="A12345678" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium pl-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="passenger@example.com" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium pl-1">Secure Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || success}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center space-x-2 mt-4"
          >
            {loading ? (
              <span className="animate-pulse">Processing KYC...</span>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Register Passenger</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?{" "}
          <Link href="/passenger/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
            Login Here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
