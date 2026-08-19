"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const handleRegister = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    localStorage.setItem(
      "token",
      "loggedin"
    );

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef7f1]">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md">
        <h1 className="text-5xl font-bold text-green-700 text-center mb-4">
          🌱 EcoLife
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Create account
        </p>

        <form
          onSubmit={handleRegister}
          className="space-y-5"
        >
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full border rounded-xl px-5 py-4"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full border rounded-xl px-5 py-4"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full border rounded-xl px-5 py-4"
          />

          <button className="w-full bg-green-700 hover:bg-green-800 text-white py-4 rounded-xl font-bold">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}