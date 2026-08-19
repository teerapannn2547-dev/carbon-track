"use client";

import Sidebar from "@/components/Sidebar";

import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

type Activity = {
  id: string;

  uid: string;

  activityType:
    | "waste"
    | "travel"
    | "electricity";

  title: string;

  subtitle: string;

  carbonSaved: number;

  points: number;

  createdAt?: any;

  collectionName: string;
};

export default function HistoryPage() {
  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // =====================================================
  // SAFE NUMBER
  // =====================================================

  const safeNumber = (
    value: any,
    fallback = 0
  ): number => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
  };

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  const loadHistory = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        setActivities([]);
        return;
      }

      const collections = [
        {
          name: "waste_records",
          type: "waste" as const,
        },
        {
          name: "travel_records",
          type: "travel" as const,
        },
        {
          name: "electricity_records",
          type: "electricity" as const,
        },
      ];

      const allActivities: Activity[] = [];

      for (const item of collections) {
        try {
          const q = query(
            collection(db, item.name),
            where("uid", "==", user.uid)
          );

          const snapshot =
            await getDocs(q);

          snapshot.forEach(
            (activityDoc) => {
              const data =
                activityDoc.data();

              let title = "";
              let subtitle = "";

              // =================================================
              // WASTE
              // =================================================

              if (
                item.type ===
                "waste"
              ) {
                title = `🗑️ ${
                  data.trashName ||
                  "ขยะ"
                }`;

                subtitle = `${
                  data.weight || 0
                } kg • ${
                  data.category || "-"
                }`;
              }

              // =================================================
              // TRAVEL
              // =================================================

              if (
                item.type ===
                "travel"
              ) {
                title = `🚗 ${
                  data.vehicleType ||
                  "การเดินทาง"
                }`;

                subtitle = `${
                  data.distance || 0
                } km`;

                if (
                  data.fuelAmount !==
                    undefined &&
                  Number(
                    data.fuelAmount
                  ) > 0
                ) {
                  subtitle += ` • น้ำมัน ${
                    data.fuelAmount
                  } L`;
                }
              }

              // =================================================
              // ELECTRICITY
              // =================================================

              if (
                item.type ===
                "electricity"
              ) {
                title = `⚡ ${
                  data.appliance ||
                  "ไฟฟ้า"
                }`;

                subtitle = `${
                  data.energyKwh
                    ? Number(
                        data.energyKwh
                      ).toFixed(2)
                    : "0.00"
                } kWh`;

                if (
                  data.location
                ) {
                  subtitle += ` • ${data.location}`;
                }
              }

              allActivities.push({
                id: activityDoc.id,

                uid: user.uid,

                activityType:
                  item.type,

                title,

                subtitle,

                carbonSaved:
                  safeNumber(
                    data.carbonSaved
                  ),

                points:
                  safeNumber(
                    data.points
                  ),

                createdAt:
                  data.createdAt,

                collectionName:
                  item.name,
              });
            }
          );
        } catch (error) {
          console.error(
            `${item.name.toUpperCase()} HISTORY ERROR:`,
            error
          );
        }
      }

      // =====================================================
      // SORT NEWEST FIRST
      // =====================================================

      allActivities.sort(
        (a, b) => {
          const timeA =
            a.createdAt?.toMillis?.() ||
            a.createdAt?.seconds ||
            0;

          const timeB =
            b.createdAt?.toMillis?.() ||
            b.createdAt?.seconds ||
            0;

          return timeB - timeA;
        }
      );

      setActivities(
        allActivities
      );
    } catch (error) {
      console.error(
        "LOAD HISTORY ERROR:",
        error
      );

      alert(
        "❌ ไม่สามารถโหลดประวัติกิจกรรมได้"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged(
        (user) => {
          if (user) {
            loadHistory();
          } else {
            setActivities([]);
            setLoading(false);
          }
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =====================================================
  // DELETE ACTIVITY
  //
  // IMPORTANT:
  //
  // ไม่คำนวณคะแนนจาก reward_history
  // เพราะ reward ถูกหักออกจาก users.totalPoints
  // ไปแล้วตอนแลก
  //
  // ดังนั้น:
  //
  // currentPoints - activity.points
  //
  // currentCarbon - activity.carbonSaved
  //
  // และห้ามต่ำกว่า 0
  // =====================================================

  const handleDelete = async (
    activity: Activity
  ) => {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "⚠️ กรุณาเข้าสู่ระบบก่อน"
        );

        return;
      }

      // ===================================================
      // CONFIRM
      // ===================================================

      const confirmDelete =
        window.confirm(
          `ต้องการลบกิจกรรมนี้หรือไม่?\n\n` +
            `${activity.title}\n\n` +
            `คะแนน: -${activity.points}\n` +
            `Carbon: -${activity.carbonSaved.toFixed(
              2
            )} kg\n\n` +
            `ระบบจะหักเฉพาะคะแนนและ Carbon ของกิจกรรมนี้`
        );

      if (!confirmDelete) {
        return;
      }

      setDeletingId(
        activity.id
      );

      // ===================================================
      // REFERENCES
      // ===================================================

      const activityRef =
        doc(
          db,
          activity.collectionName,
          activity.id
        );

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      const rankingRef =
        doc(
          db,
          "ranking",
          user.uid
        );

      // ===================================================
      // READ CURRENT USER
      //
      // users/{uid} เป็น SOURCE OF TRUTH
      // ===================================================

      const userSnapshot =
        await getDoc(
          userRef
        );

      if (
        !userSnapshot.exists()
      ) {
        throw new Error(
          "ไม่พบข้อมูลผู้ใช้ใน users"
        );
      }

      const userData =
        userSnapshot.data();

      // ===================================================
      // CURRENT POINTS
      // ===================================================

      const rawCurrentPoints =
        Number(
          userData.totalPoints ??
            0
        );

      const currentPoints =
        Number.isFinite(
          rawCurrentPoints
        )
          ? Math.max(
              0,
              rawCurrentPoints
            )
          : 0;

      // ===================================================
      // CURRENT CARBON
      // ===================================================

      const rawCurrentCarbon =
        Number(
          userData.carbonSaved ??
            0
        );

      const currentCarbon =
        Number.isFinite(
          rawCurrentCarbon
        )
          ? Math.max(
              0,
              rawCurrentCarbon
            )
          : 0;

      // ===================================================
      // ACTIVITY POINTS
      // =====================================================

      const rawActivityPoints =
        Number(
          activity.points ?? 0
        );

      const activityPoints =
        Number.isFinite(
          rawActivityPoints
        )
          ? Math.max(
              0,
              rawActivityPoints
            )
          : 0;

      // ===================================================
      // ACTIVITY CARBON
      // ===================================================

      const rawActivityCarbon =
        Number(
          activity.carbonSaved ??
            0
        );

      const activityCarbon =
        Number.isFinite(
          rawActivityCarbon
        )
          ? Math.max(
              0,
              rawActivityCarbon
            )
          : 0;

      // ===================================================
      // CALCULATE NEW POINTS
      //
      // ตัวอย่าง:
      //
      // 22 - 20 = 2
      //
      // ถ้า:
      //
      // 12 - 20 = -8
      //
      // จะกลายเป็น 0
      // ===================================================

      const newPoints =
        Math.max(
          0,
          currentPoints -
            activityPoints
        );

      // ===================================================
      // CALCULATE NEW CARBON
      //
      // ตัวอย่าง:
      //
      // 11.05 - 10 = 1.05
      // ===================================================

      const newCarbon =
        Math.max(
          0,
          Number(
            (
              currentCarbon -
              activityCarbon
            ).toFixed(4)
          )
        );

      // ===================================================
      // USER NAME
      // ===================================================

      const userName =
        userData.name ||
        userData.username ||
        user.displayName ||
        "Carbon User";

      // ===================================================
      // BATCH
      // ===================================================

      const batch =
        writeBatch(db);

      // ===================================================
      // 1. DELETE ACTIVITY
      // ===================================================

      batch.delete(
        activityRef
      );

      // ===================================================
      // 2. UPDATE USERS
      // ===================================================

      batch.set(
        userRef,
        {
          uid: user.uid,

          totalPoints:
            newPoints,

          carbonSaved:
            newCarbon,
        },
        {
          merge: true,
        }
      );

      // ===================================================
      // 3. UPDATE RANKING
      //
      // Ranking ใช้ค่าเดียวกับ users
      // ===================================================

      batch.set(
        rankingRef,
        {
          uid: user.uid,

          username:
            userData.username ||
            userName,

          name:
            userName,

          totalPoints:
            newPoints,

          carbonSaved:
            newCarbon,

          email:
            userData.email ||
            user.email ||
            "",

          photoURL:
            userData.photoURL ||
            user.photoURL ||
            "",
        },
        {
          merge: true,
        }
      );

      // ===================================================
      // COMMIT
      // ===================================================

      await batch.commit();

      // ===================================================
      // UPDATE LOCAL SCREEN
      // ===================================================

      setActivities(
        (prev) =>
          prev.filter(
            (item) =>
              !(
                item.id ===
                  activity.id &&
                item.collectionName ===
                  activity.collectionName
              )
          )
      );

      // ===================================================
      // SUCCESS
      // ===================================================

      alert(
        `✅ ลบกิจกรรมเรียบร้อย\n\n` +
          `กิจกรรม: ${activity.title}\n\n` +
          `⭐ คะแนนก่อนลบ: ${currentPoints}\n` +
          `⭐ หักคะแนน: -${activityPoints}\n` +
          `⭐ คะแนนคงเหลือ: ${newPoints}\n\n` +
          `🌱 Carbon ก่อนลบ: ${currentCarbon.toFixed(
            2
          )} kg\n` +
          `🌱 หัก Carbon: -${activityCarbon.toFixed(
            2
          )} kg\n` +
          `🌱 Carbon คงเหลือ: ${newCarbon.toFixed(
            2
          )} kg`
      );

    } catch (error) {
      console.error(
        "DELETE ACTIVITY ERROR:",
        error
      );

      alert(
        "❌ ลบกิจกรรมไม่สำเร็จ\n\n" +
          "กรุณาตรวจสอบ Firebase Rules และ Console"
      );

      // ===================================================
      // RELOAD
      // ===================================================

      await loadHistory();

    } finally {
      setDeletingId(
        null
      );
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    timestamp: any
  ) => {
    if (
      !timestamp
    ) {
      return "กำลังบันทึก...";
    }

    try {
      if (
        timestamp.toDate
      ) {
        return timestamp
          .toDate()
          .toLocaleString(
            "th-TH",
            {
              dateStyle:
                "medium",
              timeStyle:
                "short",
            }
          );
      }

      if (
        timestamp.seconds
      ) {
        return new Date(
          timestamp.seconds *
            1000
        ).toLocaleString(
          "th-TH",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
          }
        );
      }

      return "กำลังบันทึก...";
    } catch {
      return "กำลังบันทึก...";
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
            📜 ประวัติกิจกรรม
          </h1>

          <p className="text-gray-600 mt-2 text-sm">
            กิจกรรมทั้งหมดที่คุณบันทึกไว้
          </p>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">

            <p className="text-gray-500">
              กำลังโหลดประวัติ...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          activities.length ===
            0 && (
            <div className="bg-white rounded-3xl shadow-lg p-8 text-center">

              <div className="text-5xl mb-4">
                📭
              </div>

              <h2 className="text-xl font-bold text-gray-700">
                ยังไม่มีกิจกรรม
              </h2>

              <p className="text-gray-500 mt-2">
                เมื่อคุณบันทึกกิจกรรม
                ประวัติจะแสดงที่นี่
              </p>

            </div>
          )}

        {/* ACTIVITIES */}

        {!loading &&
          activities.length >
            0 && (
            <div className="space-y-4">

              {activities.map(
                (activity) => (

                  <div
                    key={`${activity.collectionName}-${activity.id}`}
                    className="bg-white rounded-3xl shadow-lg p-5"
                  >

                    {/* TOP */}

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h2 className="font-bold text-lg text-gray-800">
                          {activity.title}
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                          {
                            activity.subtitle
                          }
                        </p>

                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(
                            activity.createdAt
                          )}
                        </p>

                      </div>

                      {/* DELETE */}

                      <button
                        type="button"
                        disabled={
                          deletingId ===
                          activity.id
                        }
                        onClick={() =>
                          handleDelete(
                            activity
                          )
                        }
                        className="
                          shrink-0
                          bg-red-100
                          text-red-600
                          px-4
                          py-2
                          rounded-xl
                          font-bold
                          text-sm
                          hover:bg-red-200
                          transition
                          disabled:opacity-50
                          disabled:cursor-not-allowed
                        "
                      >

                        {deletingId ===
                        activity.id
                          ? "กำลังลบ..."
                          : "🗑️ ลบ"}

                      </button>

                    </div>

                    {/* RESULT */}

                    <div className="grid grid-cols-2 gap-3 mt-4">

                      {/* CARBON */}

                      <div className="bg-green-50 rounded-2xl p-4">

                        <p className="text-xs text-gray-500">
                          🌱 Carbon
                        </p>

                        <p className="text-xl font-bold text-green-700 mt-1">

                          {Math.max(
                            0,
                            safeNumber(
                              activity.carbonSaved
                            )
                          ).toFixed(
                            2
                          )}{" "}
                          kg

                        </p>

                      </div>

                      {/* POINTS */}

                      <div className="bg-yellow-50 rounded-2xl p-4">

                        <p className="text-xs text-gray-500">
                          ⭐ Points
                        </p>

                        <p className="text-xl font-bold text-yellow-600 mt-1">

                          +
                          {Math.max(
                            0,
                            Math.round(
                              safeNumber(
                                activity.points
                              )
                            )
                          )}

                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>
          )}

      </main>

    </div>
  );
}