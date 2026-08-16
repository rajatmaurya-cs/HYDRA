"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: "" });

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setStatus({
          type: "success",
          message: `Welcome back, ${data?.user?.name || "User"}! Login successful.`,
        });
        
        if (data?.user) {
          login(data.user);
          setTimeout(() => {
            router.push("/organizations");
          }, 800);
        }
      } else {
        setStatus({
          type: "error",
          message: data?.message || "Invalid credentials. Please try again.",
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: "Failed to connect to the backend server. Make sure it is running.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white text-black p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-8 md:p-10 shadow-xl">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-black text-white font-extrabold text-xl mb-4">
            H
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Welcome Back
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Log in to manage your developer platform
          </p>
        </div>

        
        {status.type && (
          <div
            className={`p-3.5 mb-6 rounded-lg text-sm border font-medium ${
              status.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {status.message}
          </div>
        )}

        
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[11px] font-bold text-black tracking-wider uppercase">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-black text-sm placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all disabled:opacity-50"
            />
            {errors.email && <span className="text-xs text-rose-600 font-medium mt-0.5">{errors.email}</span>}
          </div>

          
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-[11px] font-bold text-black tracking-wider uppercase">
                Password
              </label>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-black text-sm placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all disabled:opacity-50"
            />
            {errors.password && <span className="text-xs text-rose-600 font-medium mt-0.5">{errors.password}</span>}
          </div>

          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-black hover:bg-neutral-800 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        
        <div className="text-center text-sm text-neutral-600 mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-black font-bold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
