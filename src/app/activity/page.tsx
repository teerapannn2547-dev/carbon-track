"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase";

import {
  calculateTransportCarbon,
  calculateFuelCarbon,
  calculateElectricityCarbon,
  calculateElectricityKwh,
  calculateWasteCarbon,
  calculatePoints,
  VehicleType,
  FuelType,
  WasteType,
} from "@/lib/carbon";

type ActivityType =
  | "waste"
  | "transport"
  | "fuel"
  | "electricity";

export default function ActivityPage() {
  const [activityType, setActivityType] =
    useState<ActivityType>("transport");

  const [title, setTitle] = useState("");

  const [distance, setDistance] = useState("");

  const [fuelLiters, setFuelLiters] =
    useState("");

  const [electricityKwh, setElectricityKwh] =
    useState("");

  const [voltage, setVoltage] =
    useState("");

  const [wattage, setWattage] =
    useState("");

  const [hours, setHours] =
    useState("");

  const [wasteWeight, setWasteWeight] =
    useState("");

  const [vehicle, setVehicle] =
    useState<VehicleType>("car");

  const [fuelType, setFuelType] =
    useState<FuelType>("gasoline");

  const [wasteType, setWasteType] =
    useState<WasteType>("plastic");

  const [carbon, setCarbon] = useState(0);

  const [points, setPoints] = useState(0);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [userReady, setUserReady] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUserReady(!!user);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let result = 0;

    if (activityType === "transport") {
      result = calculateTransportCarbon(
        Number(distance),
        vehicle
      );
    }

    if (activityType === "fuel") {
      result = calculateFuelCarbon(
        Number(fuelLiters),
        fuelType
      );
    }

    if (activityType === "electricity") {
      const watt = Number(wattage);
      const hour = Number(hours);

      const calculatedKwh =
        calculateElectricityKwh(
          watt,
          hour
        );

      setElectricityKwh(
        calculatedKwh > 0
          ? calculatedKwh.toFixed(2)
          : ""
      );

      result =
        calculateElectricityCarbon(
          calculatedKwh
        );
    }

    if (activityType === "waste") {
      result = calculateWasteCarbon(
        Number(wasteWeight),
        wasteType
      );
    }

    setCarbon(result);

    setPoints(
      calculatePoints(result)
    );
  }, [
    activityType,
    distance,
    fuelLiters,
    wattage,
    hours,
    wasteWeight,
    vehicle,
    fuelType,
    wasteType,
  ]);

  const handleSubmit = async () => {
    const user = auth.currentUser;

    if (!user) {
      setMessage(
        "กรุณาเข้าสู่ระบบก่อน"
      );
      return;
    }

    if (!title.trim()) {
      setMessage(
        "กรุณาใส่ชื่อกิจกรรม"
      );
      return;
    }

    if (carbon <= 0) {
      setMessage(
        "กรุณากรอกข้อมูลกิจกรรมให้ถูกต้อง"
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const activityRef =
        await addDoc(
          collection(db, "activities"),
          {
            uid: user.uid,

            title: title.trim(),

            type: activityType,

            vehicle:
              activityType === "transport"
                ? vehicle
                : null,

            distance:
              activityType === "transport"
                ? Number(distance)
                : 0,

            fuelType:
              activityType === "fuel"
                ? fuelType
                : null,

            fuelLiters:
              activityType === "fuel"
                ? Number(fuelLiters)
                : 0,

            voltage:
              activityType === "electricity"
                ? Number(voltage)
                : 0,

            wattage:
              activityType === "electricity"
                ? Number(wattage)
                : 0,

            hours:
              activityType === "electricity"
                ? Number(hours)
                : 0,

            electricityKwh:
              activityType === "electricity"
                ? Number(electricityKwh)
                : 0,

            wasteType:
              activityType === "waste"
                ? wasteType
                : null,

            wasteWeight:
              activityType === "waste"
                ? Number(wasteWeight)
                : 0,

            carbon: Number(
              carbon.toFixed(2)
            ),

            points,

            createdAt:
              serverTimestamp(),
          }
        );

      /*
       * Update User
       */

      await setDoc(
        doc(db, "users", user.uid),
        {
          totalPoints:
            increment(points),

          carbonSaved:
            increment(carbon),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      /*
       * Update Ranking
       */

      await setDoc(
        doc(
          db,
          "ranking",
          user.uid
        ),
        {
          uid: user.uid,

          totalPoints:
            increment(points),

          carbonSaved:
            increment(carbon),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        "Activity saved:",
        activityRef.id
      );

      setMessage(
        "บันทึกกิจกรรมเรียบร้อยแล้ว 🎉"
      );

      setTitle("");
      setDistance("");
      setFuelLiters("");
      setElectricityKwh("");
      setVoltage("");
      setWattage("");
      setHours("");
      setWasteWeight("");

      setCarbon(0);
      setPoints(0);
    } catch (error) {
      console.error(
        "Save activity error:",
        error
      );

      setMessage(
        "เกิดข้อผิดพลาด ไม่สามารถบันทึกกิจกรรมได้"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!userReady) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-md text-center">
          <p className="text-gray-500">
            กำลังตรวจสอบบัญชี...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 pb-24">
      <div className="mx-auto w-full max-w-md">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            🌱 เพิ่มกิจกรรม
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            บันทึกกิจกรรมเพื่อคำนวณ Carbon และ Points
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            ประเภทกิจกรรม
          </label>

          <div className="grid grid-cols-2 gap-3">

            {[
              {
                type: "transport",
                icon: "🚗",
                name: "การเดินทาง",
              },
              {
                type: "fuel",
                icon: "⛽",
                name: "น้ำมัน",
              },
              {
                type: "electricity",
                icon: "⚡",
                name: "ไฟฟ้า",
              },
              {
                type: "waste",
                icon: "🗑️",
                name: "ขยะ",
              },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() =>
                  setActivityType(
                    item.type as ActivityType
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  activityType === item.type
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="text-2xl">
                  {item.icon}
                </div>

                <div className="mt-1 font-semibold">
                  {item.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            ชื่อกิจกรรม
          </label>

          <input
            type="text"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="เช่น เดินทางไปมหาวิทยาลัย"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-green-500"
          />
        </div>

        {activityType === "transport" && (
          <div className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ยานพาหนะ
              </label>

              <select
                value={vehicle}
                onChange={(e) =>
                  setVehicle(
                    e.target.value as VehicleType
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <option value="car">
                  🚗 รถยนต์
                </option>

                <option value="motorcycle">
                  🏍️ รถจักรยานยนต์
                </option>

                <option value="bus">
                  🚌 รถโดยสาร
                </option>

                <option value="train">
                  🚆 รถไฟ
                </option>

                <option value="ev">
                  ⚡ รถยนต์ไฟฟ้า
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ระยะทาง
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={distance}
                  onChange={(e) =>
                    setDistance(
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16"
                />

                <span className="absolute right-4 top-3 text-gray-400">
                  km
                </span>
              </div>
            </div>

          </div>
        )}

        {activityType === "fuel" && (
          <div className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ชนิดน้ำมัน
              </label>

              <select
                value={fuelType}
                onChange={(e) =>
                  setFuelType(
                    e.target.value as FuelType
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <option value="gasoline">
                  ⛽ เบนซิน
                </option>

                <option value="diesel">
                  🛢️ ดีเซล
                </option>

                <option value="lpg">
                  🔥 LPG
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ปริมาณน้ำมัน
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fuelLiters}
                  onChange={(e) =>
                    setFuelLiters(
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16"
                />

                <span className="absolute right-4 top-3 text-gray-400">
                  ลิตร
                </span>
              </div>
            </div>

          </div>
        )}

        {activityType === "electricity" && (
          <div className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                แรงดันไฟฟ้า
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={voltage}
                  onChange={(e) =>
                    setVoltage(
                      e.target.value
                    )
                  }
                  placeholder="เช่น 220"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16"
                />

                <span className="absolute right-4 top-3 text-gray-400">
                  V
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                กำลังไฟฟ้า
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={wattage}
                  onChange={(e) =>
                    setWattage(
                      e.target.value
                    )
                  }
                  placeholder="เช่น 1200"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16"
                />

                <span className="absolute right-4 top-3 text-gray-400">
                  W
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                จำนวนชั่วโมงที่ใช้งาน
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={hours}
                  onChange={(e) =>
                    setHours(
                      e.target.value
                    )
                  }
                  placeholder="เช่น 5"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16"
                />

                <span className="absolute right-4 top-3 text-gray-400">
                  ชั่วโมง
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-gray-600">
                การใช้ไฟฟ้า
              </p>

              <p className="mt-1 text-xl font-bold text-blue-700">
                {electricityKwh || "0"} kWh
              </p>

              <p className="mt-1 text-xs text-gray-500">
                W × ชั่วโมง ÷ 1000
              </p>
            </div>

          </div>
        )}

        {activityType === "waste" && (
          <div className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                ประเภทขยะ
              </label>

              <select
                value={wasteType}
                onChange={(e) =>
                  setWasteType(
                    e.target.value as WasteType
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <option value="plastic">
                  🧴 พลาสติก
                </option>

                <option value="paper">
                  📄 กระดาษ
                </option>

                <option value="glass">
                  🍾 แก้ว
                </option>

                <option value="metal">
                  🥫 โลหะ
                </option>

                <option value="organic">
                  🍃 ขยะอินทรีย์
                </option>

                <option value="general">
                  🗑️ ขยะทั่วไป
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                น้ำหนักขยะ
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={wasteWeight}
                  onChange={(e) =>
                    setWasteWeight(
                      e.target.value
                    )
                  }
                  placeholder="เช่น 2"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-16"
                />

                <span className="absolute right-4 top-3 text-gray-400">
                  kg
                </span>
              </div>
            </div>

          </div>
        )}

        <div className="mt-6 rounded-2xl bg-green-600 p-5 text-white">

          <p className="text-sm opacity-90">
            Carbon
          </p>

          <p className="mt-1 text-3xl font-bold">
            {carbon.toFixed(2)}
            <span className="ml-1 text-base font-normal">
              kgCO₂e
            </span>
          </p>

          <div className="mt-4 border-t border-white/20 pt-4">
            <p className="text-sm opacity-90">
              Points ที่ได้รับ
            </p>

            <p className="mt-1 text-2xl font-bold">
              +{points} Points
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-white p-4 text-center text-sm text-gray-700 shadow-sm">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full rounded-2xl bg-gray-900 py-4 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "กำลังบันทึก..."
            : "บันทึกกิจกรรม"}
        </button>

      </div>
    </main>
  );
}