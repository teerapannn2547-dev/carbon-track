"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (isRegister) {
        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          uid,
          name,
          email,
          totalPoints: 0,
          carbonSaved: 0,
          createdAt: new Date(),
        });

        alert("สมัครสมาชิกสำเร็จ");
      } else {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h1 className="text-3xl font-bold text-center text-green-700 mb-2">
          Carbon Track
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Track Your Carbon Reduction
        </p>

        {isRegister && (
          <input
            className="w-full border p-3 rounded mb-3"
            placeholder="ชื่อ"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700"
        >
          {loading
            ? "กำลังดำเนินการ..."
            : isRegister
            ? "สมัครสมาชิก"
            : "เข้าสู่ระบบ"}
        </button>

        <button
          onClick={() =>
            setIsRegister(!isRegister)
          }
          className="w-full mt-3 text-green-700"
        >
          {isRegister
            ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"
            : "ยังไม่มีบัญชี? สมัครสมาชิก"}
        </button>
      </div>
    </div>
  );
}