"use client";

import Sidebar from "@/components/Sidebar";
import { useState } from "react";

import { auth, db } from "@/lib/firebase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

type ActivityType =
  | "waste"
  | "travel"
  | "electricity";

export default function ScanPage() {
  // =====================================================
  // ACTIVITY
  // =====================================================

  const [activityType, setActivityType] =
    useState<ActivityType>("waste");

  // =====================================================
  // WASTE
  // =====================================================

  const [trashName, setTrashName] =
    useState("");

  const [weight, setWeight] =
    useState("");

  const [category, setCategory] =
    useState("Plastic");

  // =====================================================
  // TRAVEL
  // =====================================================

  const [vehicleType, setVehicleType] =
    useState("Car");

  const [distance, setDistance] =
    useState("");

  const [fuelType, setFuelType] =
    useState("Gasoline");

  const [fuelAmount, setFuelAmount] =
    useState("");

  // =====================================================
  // ELECTRICITY
  // =====================================================

  const [location, setLocation] =
    useState("");

  const [appliance, setAppliance] =
    useState("Computer");

  const [hours, setHours] =
    useState("");

  const [voltage, setVoltage] =
    useState("");

  const [wattage, setWattage] =
    useState("");

  // =====================================================
  // IMAGE
  // =====================================================

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  // =====================================================
  // STATUS
  // =====================================================

  const [loading, setLoading] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [result, setResult] = useState({
    carbonSaved: 0,
    carbonEmission: 0,
    points: 0,
  });

  // =====================================================
  // IMAGE
  // =====================================================

  const handleImage = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setImageFile(file);

    const url =
      URL.createObjectURL(file);

    setPreview(url);
  };

  // =====================================================
  // WASTE CALCULATION
  // =====================================================

  const calculateWaste = () => {
    const wasteWeight =
      Number(weight);

    const factors: Record<
      string,
      number
    > = {
      Plastic: 6,
      Paper: 3,
      Glass: 2,
      Metal: 5,
      Organic: 1,
    };

    const factor =
      factors[category] || 1;

    const carbonSaved =
      wasteWeight * factor;

    const carbonEmission = 0;

    const points = Math.round(
      carbonSaved * 2
    );

    return {
      carbonSaved,
      carbonEmission,
      points,
    };
  };

  // =====================================================
  // TRAVEL CALCULATION
  // =====================================================

  const calculateTravel = () => {
    const travelDistance =
      Number(distance);

    /*
      ----------------------------------------------------
      Carbon Saved สำหรับ Walking / Bicycle
      ----------------------------------------------------

      ถือว่า Walking / Bicycle
      เป็นการเดินทางที่หลีกเลี่ยงการใช้รถยนต์

      รถยนต์อ้างอิง:
      0.21 kg CO2 / km

      เช่น เดิน 5 km

      5 × 0.21
      = 1.05 kg CO2 Saved
    */

    const referenceCarFactor = 0.21;

    /*
      ----------------------------------------------------
      WALKING
      ----------------------------------------------------
    */

    if (vehicleType === "Walking") {
      const carbonSaved =
        travelDistance *
        referenceCarFactor;

      const carbonEmission = 0;

      const points = Math.round(
        carbonSaved * 2
      );

      return {
        carbonSaved,
        carbonEmission,
        points,
      };
    }

    /*
      ----------------------------------------------------
      BICYCLE
      ----------------------------------------------------
    */

    if (vehicleType === "Bicycle") {
      const carbonSaved =
        travelDistance *
        referenceCarFactor;

      const carbonEmission = 0;

      const points = Math.round(
        carbonSaved * 2
      );

      return {
        carbonSaved,
        carbonEmission,
        points,
      };
    }

    /*
      ----------------------------------------------------
      ELECTRIC VEHICLE
      ----------------------------------------------------

      ตอนนี้ยังไม่คำนวณการปล่อยจากไฟฟ้า
      เพราะหน้า Travel ยังไม่มีข้อมูล kWh

      ดังนั้น:
      Carbon Saved = 0
      Carbon Emission = 0
    */

    if (vehicleType === "EV") {
      const carbonSaved = 0;
      const carbonEmission = 0;
      const points = 0;

      return {
        carbonSaved,
        carbonEmission,
        points,
      };
    }

    /*
      ----------------------------------------------------
      GASOLINE / DIESEL
      ----------------------------------------------------
    */

    const fuel =
      Number(fuelAmount);

    let emissionFactor = 0;

    if (fuelType === "Gasoline") {
      emissionFactor = 2.31;
    }

    if (fuelType === "Diesel") {
      emissionFactor = 2.68;
    }

    const carbonEmission =
      fuel * emissionFactor;

    /*
      รถยนต์ที่ใช้น้ำมัน
      ไม่ถือว่าเป็น Carbon Saved

      เพราะเป็นกิจกรรมที่มีการปล่อย CO2
    */

    const carbonSaved = 0;

    /*
      คะแนนจาก Carbon Saved เท่านั้น
    */

    const points = 0;

    return {
      carbonSaved,
      carbonEmission,
      points,
    };
  };

  // =====================================================
  // ELECTRICITY CALCULATION
  // =====================================================

  const calculateElectricity = () => {
    const electricityHours =
      Number(hours);

    const power =
      Number(wattage);

    /*
      kWh =
      Watt × Hours / 1000
    */

    const energyKwh =
      (power * electricityHours) /
      1000;

    /*
      Approximate electricity
      emission factor

      0.5 kg CO2 / kWh
    */

    const carbonEmission =
      energyKwh * 0.5;

    /*
      ตอนนี้ยังไม่มีค่าอ้างอิงว่า
      ประหยัดไฟได้เท่าไร

      ดังนั้น Carbon Saved = 0
    */

    const carbonSaved = 0;

    const points = 0;

    return {
      carbonSaved,
      carbonEmission,
      points,
      energyKwh,
    };
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {
    // ---------------------------------------------------
    // WASTE
    // ---------------------------------------------------

    if (
      activityType === "waste"
    ) {
      if (!trashName.trim()) {
        alert(
          "⚠️ กรุณากรอกชื่อขยะ"
        );

        return false;
      }

      if (!weight.trim()) {
        alert(
          "⚠️ กรุณากรอกน้ำหนักขยะ"
        );

        return false;
      }

      if (
        Number(weight) <= 0
      ) {
        alert(
          "⚠️ น้ำหนักต้องมากกว่า 0 kg"
        );

        return false;
      }
    }

    // ---------------------------------------------------
    // TRAVEL
    // ---------------------------------------------------

    if (
      activityType === "travel"
    ) {
      if (!vehicleType) {
        alert(
          "⚠️ กรุณาเลือกยานพาหนะ"
        );

        return false;
      }

      if (!distance.trim()) {
        alert(
          "⚠️ กรุณากรอกระยะทาง"
        );

        return false;
      }

      if (
        Number(distance) <= 0
      ) {
        alert(
          "⚠️ ระยะทางต้องมากกว่า 0 km"
        );

        return false;
      }

      /*
        Walking / Bicycle / EV
        ไม่ต้องกรอกน้ำมัน
      */

      if (
        vehicleType !== "Bicycle" &&
        vehicleType !== "Walking" &&
        vehicleType !== "EV"
      ) {
        if (!fuelType) {
          alert(
            "⚠️ กรุณาเลือกประเภทเชื้อเพลิง"
          );

          return false;
        }

        if (!fuelAmount.trim()) {
          alert(
            "⚠️ กรุณากรอกปริมาณน้ำมัน"
          );

          return false;
        }

        if (
          Number(fuelAmount) <= 0
        ) {
          alert(
            "⚠️ ปริมาณน้ำมันต้องมากกว่า 0 ลิตร"
          );

          return false;
        }
      }
    }

    // ---------------------------------------------------
    // ELECTRICITY
    // ---------------------------------------------------

    if (
      activityType ===
      "electricity"
    ) {
      if (!location.trim()) {
        alert(
          "⚠️ กรุณากรอกสถานที่"
        );

        return false;
      }

      if (!appliance) {
        alert(
          "⚠️ กรุณาเลือกอุปกรณ์"
        );

        return false;
      }

      if (!hours.trim()) {
        alert(
          "⚠️ กรุณากรอกจำนวนชั่วโมง"
        );

        return false;
      }

      if (
        Number(hours) <= 0
      ) {
        alert(
          "⚠️ ชั่วโมงต้องมากกว่า 0"
        );

        return false;
      }

      if (!wattage.trim()) {
        alert(
          "⚠️ กรุณากรอกกำลังไฟ (W)"
        );

        return false;
      }

      if (
        Number(wattage) <= 0
      ) {
        alert(
          "⚠️ กำลังไฟต้องมากกว่า 0 W"
        );

        return false;
      }

      if (!voltage.trim()) {
        alert(
          "⚠️ กรุณากรอกแรงดันไฟ (V)"
        );

        return false;
      }

      if (
        Number(voltage) <= 0
      ) {
        alert(
          "⚠️ แรงดันไฟต้องมากกว่า 0 V"
        );

        return false;
      }
    }

    return true;
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = async () => {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "⚠️ กรุณาเข้าสู่ระบบก่อน"
        );

        return;
      }

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      setSaved(false);

      let carbonSaved = 0;
      let carbonEmission = 0;
      let points = 0;

      // =================================================
      // CALCULATE
      // =================================================

      if (
        activityType === "waste"
      ) {
        const data =
          calculateWaste();

        carbonSaved =
          data.carbonSaved;

        carbonEmission =
          data.carbonEmission;

        points =
          data.points;
      }

      if (
        activityType === "travel"
      ) {
        const data =
          calculateTravel();

        carbonSaved =
          data.carbonSaved;

        carbonEmission =
          data.carbonEmission;

        points =
          data.points;
      }

      if (
        activityType ===
        "electricity"
      ) {
        const data =
          calculateElectricity();

        carbonSaved =
          data.carbonSaved;

        carbonEmission =
          data.carbonEmission;

        points =
          data.points;
      }

      // =================================================
      // IMAGE
      // =================================================

      let imageUrl = "";

      if (
        activityType === "waste" &&
        imageFile
      ) {
        imageUrl =
          await uploadImageToCloudinary(
            imageFile
          );
      }

      // =================================================
      // SAVE WASTE
      // =================================================

      if (
        activityType === "waste"
      ) {
        await addDoc(
          collection(
            db,
            "waste_records"
          ),
          {
            uid: user.uid,

            activityType:
              "waste",

            trashName:
              trashName.trim(),

            weight:
              Number(weight),

            category,

            carbonSaved,

            carbonEmission,

            points,

            imageUrl,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      // =================================================
      // SAVE TRAVEL
      // =================================================

      if (
        activityType === "travel"
      ) {
        /*
          สำคัญ:
          ถ้า Walking / Bicycle / EV
          จะไม่บันทึก Gasoline

          fuelType = "None"
          fuelAmount = 0
        */

        const isNonFuelVehicle =
          vehicleType === "Walking" ||
          vehicleType === "Bicycle" ||
          vehicleType === "EV";

        const savedFuelType =
          isNonFuelVehicle
            ? "None"
            : fuelType;

        const savedFuelAmount =
          isNonFuelVehicle
            ? 0
            : Number(fuelAmount);

        await addDoc(
          collection(
            db,
            "travel_records"
          ),
          {
            uid: user.uid,

            activityType:
              "travel",

            vehicleType,

            distance:
              Number(distance),

            fuelType:
              savedFuelType,

            fuelAmount:
              savedFuelAmount,

            carbonSaved,

            carbonEmission,

            points,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      // =================================================
      // SAVE ELECTRICITY
      // =================================================

      if (
        activityType ===
        "electricity"
      ) {
        const energyKwh =
          (Number(wattage) *
            Number(hours)) /
          1000;

        await addDoc(
          collection(
            db,
            "electricity_records"
          ),
          {
            uid: user.uid,

            activityType:
              "electricity",

            appliance,

            location:
              location.trim(),

            hours:
              Number(hours),

            voltage:
              Number(voltage),

            wattage:
              Number(wattage),

            energyKwh,

            carbonSaved,

            carbonEmission,

            points,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      // =================================================
      // USER
      // =================================================

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const userSnapshot =
        await getDoc(userRef);

      if (
        !userSnapshot.exists()
      ) {
        await setDoc(
          userRef,
          {
            uid: user.uid,

            name:
              user.displayName ||
              "Carbon User",

            email:
              user.email || "",

            totalPoints:
              points,

            carbonSaved:
              carbonSaved,

            carbonEmission:
              carbonEmission,
          }
        );
      } else {
        await updateDoc(
          userRef,
          {
            totalPoints:
              increment(points),

            carbonSaved:
              increment(
                carbonSaved
              ),

            carbonEmission:
              increment(
                carbonEmission
              ),
          }
        );
      }

      // =================================================
      // RANKING
      // =================================================

      const latestUser =
        await getDoc(userRef);

      const latestData =
        latestUser.data();

      await setDoc(
        doc(
          db,
          "ranking",
          user.uid
        ),
        {
          uid: user.uid,

          username:
            user.displayName ||
            "Carbon User",

          totalPoints:
            Number(
              latestData?.totalPoints ||
                0
            ),

          carbonSaved:
            Number(
              latestData?.carbonSaved ||
                0
            ),

          carbonEmission:
            Number(
              latestData?.carbonEmission ||
                0
            ),
        },
        {
          merge: true,
        }
      );

      // =================================================
      // RESULT
      // =================================================

      setResult({
        carbonSaved,
        carbonEmission,
        points,
      });

      setSaved(true);

      alert(
        `✅ บันทึกกิจกรรมสำเร็จ\n\n🌱 Carbon Saved: ${carbonSaved.toFixed(
          2
        )} kg\n🔥 Carbon Emission: ${carbonEmission.toFixed(
          2
        )} kg\n⭐ Points: +${points}`
      );

      // =================================================
      // RESET
      // =================================================

      if (
        activityType === "waste"
      ) {
        setTrashName("");
        setWeight("");
        setCategory("Plastic");
        setImageFile(null);
        setPreview("");
      }

      if (
        activityType === "travel"
      ) {
        setVehicleType("Car");
        setDistance("");
        setFuelType("Gasoline");
        setFuelAmount("");
      }

      if (
        activityType ===
        "electricity"
      ) {
        setLocation("");
        setAppliance("Computer");
        setHours("");
        setVoltage("");
        setWattage("");
      }
    } catch (error) {
      console.error(
        "SAVE ACTIVITY ERROR:",
        error
      );

      alert(
        "❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล\n\nกรุณาตรวจสอบ Firebase Rules"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#eef7f1]">

      <Sidebar />

      <main className="p-4 pt-24 pb-24">

        {/* HEADER */}

        <div className="mb-6">

          <h1 className="text-3xl font-bold text-green-700">
            ♻️ Carbon Track
          </h1>

          <p className="text-gray-600 mt-2 text-sm">
            บันทึกกิจกรรมเพื่อคำนวณ Carbon
          </p>

        </div>

        {/* ACTIVITY BUTTONS */}

        <div className="grid grid-cols-3 gap-2 mb-5">

          <button
            type="button"
            onClick={() =>
              setActivityType("waste")
            }
            className={`p-3 rounded-2xl font-bold text-sm ${
              activityType ===
              "waste"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            🗑️
            <br />
            เก็บขยะ
          </button>

          <button
            type="button"
            onClick={() =>
              setActivityType("travel")
            }
            className={`p-3 rounded-2xl font-bold text-sm ${
              activityType ===
              "travel"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            🚗
            <br />
            การเดินทาง
          </button>

          <button
            type="button"
            onClick={() =>
              setActivityType(
                "electricity"
              )
            }
            className={`p-3 rounded-2xl font-bold text-sm ${
              activityType ===
              "electricity"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            ⚡
            <br />
            ไฟฟ้า
          </button>

        </div>

        {/* FORM */}

        <div className="bg-white p-5 rounded-3xl shadow-lg">

          {/* =================================================
              WASTE
          ================================================= */}

          {activityType ===
            "waste" && (
            <div className="space-y-4">

              <h2 className="text-xl font-bold text-green-700">
                🗑️ เก็บขยะ
              </h2>

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  ชื่อขยะ *
                </label>

                <input
                  type="text"
                  placeholder="เช่น ขวดพลาสติก"
                  value={trashName}
                  onChange={(e) =>
                    setTrashName(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  น้ำหนัก *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="kg"
                  value={weight}
                  onChange={(e) =>
                    setWeight(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

              </div>

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  ประเภทขยะ *
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                >
                  <option value="Plastic">
                    Plastic
                  </option>

                  <option value="Paper">
                    Paper
                  </option>

                  <option value="Glass">
                    Glass
                  </option>

                  <option value="Metal">
                    Metal
                  </option>

                  <option value="Organic">
                    Organic
                  </option>
                </select>

              </div>

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  รูปภาพ
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImage
                  }
                  className="w-full border p-4 rounded-xl"
                />

              </div>

              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-2xl"
                />
              )}

            </div>
          )}

          {/* =================================================
              TRAVEL
          ================================================= */}

          {activityType ===
            "travel" && (
            <div className="space-y-4">

              <h2 className="text-xl font-bold text-green-700">
                🚗 การเดินทาง
              </h2>

              {/* VEHICLE */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  ยานพาหนะ *
                </label>

                <select
                  value={vehicleType}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setVehicleType(
                      value
                    );

                    /*
                      ถ้าเป็น Walking,
                      Bicycle หรือ EV

                      ให้ล้างข้อมูลน้ำมัน
                    */

                    if (
                      value === "Walking" ||
                      value === "Bicycle" ||
                      value === "EV"
                    ) {
                      setFuelType(
                        "None"
                      );

                      setFuelAmount(
                        ""
                      );
                    } else {
                      setFuelType(
                        "Gasoline"
                      );
                    }
                  }}
                  className="w-full border p-4 rounded-xl"
                >

                  <option value="Car">
                    🚗 Car
                  </option>

                  <option value="Motorcycle">
                    🏍️ Motorcycle
                  </option>

                  <option value="Bus">
                    🚌 Bus
                  </option>

                  <option value="Train">
                    🚆 Train
                  </option>

                  <option value="Bicycle">
                    🚲 Bicycle
                  </option>

                  <option value="Walking">
                    🚶 Walking
                  </option>

                  <option value="EV">
                    ⚡ Electric Vehicle
                  </option>

                </select>

              </div>

              {/* DISTANCE */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  ระยะทาง *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="เช่น 10 km"
                  value={distance}
                  onChange={(e) =>
                    setDistance(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

              </div>

              {/* WALKING / BICYCLE INFO */}

              {(vehicleType ===
                "Walking" ||
                vehicleType ===
                  "Bicycle") && (
                <div className="bg-green-50 p-4 rounded-2xl">

                  <p className="text-sm text-gray-600">
                    🌱 ระบบจะถือว่า
                    การเดินทางนี้ช่วยหลีกเลี่ยง
                    การใช้รถยนต์
                  </p>

                  {distance &&
                    Number(distance) >
                      0 && (
                      <p className="text-lg font-bold text-green-700 mt-2">
                        Carbon Saved ≈{" "}
                        {(
                          Number(
                            distance
                          ) * 0.21
                        ).toFixed(2)}{" "}
                        kg CO₂
                      </p>
                    )}

                </div>
              )}

              {/* FUEL */}

              {vehicleType !==
                "Bicycle" &&
                vehicleType !==
                  "Walking" &&
                vehicleType !==
                  "EV" && (
                  <>
                    <div>

                      <label className="block text-sm font-semibold text-gray-600 mb-2">
                        ประเภทเชื้อเพลิง *
                      </label>

                      <select
                        value={fuelType}
                        onChange={(e) =>
                          setFuelType(
                            e.target.value
                          )
                        }
                        className="w-full border p-4 rounded-xl"
                      >

                        <option value="Gasoline">
                          ⛽ Gasoline
                        </option>

                        <option value="Diesel">
                          🛢️ Diesel
                        </option>

                      </select>

                    </div>

                    <div>

                      <label className="block text-sm font-semibold text-gray-600 mb-2">
                        ปริมาณน้ำมัน *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="เช่น 2.5 ลิตร"
                        value={fuelAmount}
                        onChange={(e) =>
                          setFuelAmount(
                            e.target.value
                          )
                        }
                        className="w-full border p-4 rounded-xl"
                      />

                    </div>
                  </>
                )}

            </div>
          )}

          {/* =================================================
              ELECTRICITY
          ================================================= */}

          {activityType ===
            "electricity" && (
            <div className="space-y-4">

              <h2 className="text-xl font-bold text-green-700">
                ⚡ การใช้ไฟฟ้า
              </h2>

              {/* LOCATION */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  สถานที่ *
                </label>

                <input
                  type="text"
                  placeholder="เช่น Bedroom"
                  value={location}
                  onChange={(e) =>
                    setLocation(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

              </div>

              {/* APPLIANCE */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  อุปกรณ์ *
                </label>

                <select
                  value={appliance}
                  onChange={(e) =>
                    setAppliance(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                >

                  <option value="Computer">
                    💻 Computer
                  </option>

                  <option value="AirConditioner">
                    ❄️ Air Conditioner
                  </option>

                  <option value="Television">
                    📺 Television
                  </option>

                  <option value="Refrigerator">
                    🧊 Refrigerator
                  </option>

                  <option value="Fan">
                    🌀 Fan
                  </option>

                  <option value="Light">
                    💡 Light
                  </option>

                </select>

              </div>

              {/* HOURS */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  จำนวนชั่วโมง *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="เช่น 3 ชั่วโมง"
                  value={hours}
                  onChange={(e) =>
                    setHours(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

              </div>

              {/* VOLTAGE */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  แรงดันไฟฟ้า (Volt) *
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="เช่น 220 V"
                  value={voltage}
                  onChange={(e) =>
                    setVoltage(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

                <p className="text-xs text-gray-400 mt-1">
                  ตัวอย่างไฟบ้านทั่วไป 220 V
                </p>

              </div>

              {/* WATT */}

              <div>

                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  กำลังไฟฟ้า (Watt) *
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="เช่น 75 W"
                  value={wattage}
                  onChange={(e) =>
                    setWattage(
                      e.target.value
                    )
                  }
                  className="w-full border p-4 rounded-xl"
                />

                <p className="text-xs text-gray-400 mt-1">
                  ดูค่ากำลังไฟจากฉลากของอุปกรณ์
                </p>

              </div>

              {/* PREVIEW */}

              {hours &&
                wattage &&
                Number(hours) > 0 &&
                Number(wattage) > 0 && (
                  <div className="bg-blue-50 p-4 rounded-2xl">

                    <p className="text-sm text-gray-600">
                      พลังงานที่ใช้
                    </p>

                    <p className="text-2xl font-bold text-blue-700">

                      {(
                        (Number(
                          wattage
                        ) *
                          Number(
                            hours
                          )) /
                        1000
                      ).toFixed(2)}{" "}
                      kWh

                    </p>

                    <p className="text-sm text-gray-500 mt-2">

                      {voltage || "-"} V
                      {" · "}
                      {wattage} W
                      {" · "}
                      {hours} ชั่วโมง

                    </p>

                  </div>
                )}

            </div>
          )}

          {/* SAVE */}

          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold transition disabled:opacity-50"
          >
            {loading
              ? "กำลังบันทึก..."
              : "บันทึกกิจกรรม"}
          </button>

        </div>

        {/* RESULT */}

        {saved && (
          <div className="mt-6 bg-white p-5 rounded-3xl shadow-lg">

            <h2 className="text-2xl font-bold mb-5">
              📊 ผลการคำนวณ
            </h2>

            <div className="space-y-4">

              {/* CARBON SAVED */}

              <div className="bg-green-100 p-5 rounded-2xl">

                <h3 className="font-bold text-lg">
                  🌱 Carbon Saved
                </h3>

                <p className="text-3xl font-bold mt-3 text-green-700">

                  {result.carbonSaved.toFixed(
                    2
                  )}{" "}
                  kg

                </p>

              </div>

              {/* CARBON EMISSION */}

              <div className="bg-red-100 p-5 rounded-2xl">

                <h3 className="font-bold text-lg">
                  🔥 Carbon Emission
                </h3>

                <p className="text-3xl font-bold mt-3 text-red-600">

                  {result.carbonEmission.toFixed(
                    2
                  )}{" "}
                  kg

                </p>

              </div>

              {/* POINTS */}

              <div className="bg-yellow-100 p-5 rounded-2xl">

                <h3 className="font-bold text-lg">
                  ⭐ Reward Points
                </h3>

                <p className="text-3xl font-bold mt-3 text-yellow-600">

                  +{result.points}

                </p>

              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}