"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

type Activity = {
  id: string;
  source: "waste" | "travel" | "electricity";

  activityType?: string;

  // Waste
  trashName?: string;
  weight?: number;
  category?: string;

  // Travel
  vehicleType?: string;
  distance?: number;
  fuelType?: string;
  fuelAmount?: number;

  // Electricity
  appliance?: string;
  location?: string;
  hours?: number;
  voltage?: number;
  wattage?: number;
  energyKwh?: number;

  // Common
  carbonSaved?: number;
  carbonEmission?: number;
  points?: number;
  uid?: string;
  createdAt?: any;
};

// =======================================================
// SAFE NUMBER
// =======================================================

function safeNumber(
  value: any,
  fallback = 0
): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

// =======================================================
// SAFE NON NEGATIVE NUMBER
// =======================================================

function safeNonNegative(
  value: any,
  fallback = 0
): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, number);
}

// =======================================================
// COUNT ACTIVITY
// =======================================================

function allActivityCount(
  activities: Activity[],
  type:
    | "waste"
    | "travel"
    | "electricity"
) {
  return activities.filter(
    (activity) =>
      activity.source === type
  ).length;
}

// =======================================================
// DASHBOARD
// =======================================================

export default function DashboardPage() {
  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] =
    useState(true);

  const [totalPoints, setTotalPoints] =
    useState(0);

  const [carbonSaved, setCarbonSaved] =
    useState(0);

  const [totalActivities, setTotalActivities] =
    useState(0);

  const [rank, setRank] =
    useState(0);

  const [recentActivities, setRecentActivities] =
    useState<Activity[]>([]);

  // =====================================================
  // FETCH DATA
  // =====================================================

  const fetchData = async () => {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      // =================================================
      // NOT LOGIN
      // =================================================

      if (!user) {
        setTotalPoints(0);
        setCarbonSaved(0);
        setTotalActivities(0);
        setRank(0);
        setRecentActivities([]);
        setLoading(false);
        return;
      }

      // =================================================
      // USER DATA
      // =================================================

      let userPoints = 0;
      let userCarbon = 0;

      let hasValidUserPoints = false;
      let hasValidUserCarbon = false;

      try {
        const userRef = doc(
          db,
          "users",
          user.uid
        );

        const userSnap =
          await getDoc(userRef);

        if (userSnap.exists()) {
          const data =
            userSnap.data();

          // ---------------------------------------------
          // POINTS
          // ---------------------------------------------

          const rawPoints =
            Number(data.totalPoints);

          /*
            คะแนนห้ามติดลบ

            ถ้า Firebase เป็น:
            -38

            Dashboard จะแสดง:
            0
          */

          if (
            Number.isFinite(
              rawPoints
            )
          ) {
            userPoints =
              Math.max(
                0,
                rawPoints
              );

            hasValidUserPoints = true;
          } else {
            userPoints = 0;
            hasValidUserPoints = false;
          }

          // ---------------------------------------------
          // CARBON
          // ---------------------------------------------

          const rawCarbon =
            Number(data.carbonSaved);

          /*
            Carbon ห้ามติดลบ
          */

          if (
            Number.isFinite(
              rawCarbon
            )
          ) {
            userCarbon =
              Math.max(
                0,
                rawCarbon
              );

            hasValidUserCarbon = true;
          } else {
            userCarbon = 0;
            hasValidUserCarbon = false;
          }
        }
      } catch (error) {
        console.error(
          "USER DATA ERROR:",
          error
        );
      }

      // =================================================
      // ALL ACTIVITIES
      // =================================================

      const allActivities: Activity[] =
        [];

      // =================================================
      // WASTE
      // =================================================

      try {
        const wasteSnap =
          await getDocs(
            query(
              collection(
                db,
                "waste_records"
              ),
              where(
                "uid",
                "==",
                user.uid
              )
            )
          );

        wasteSnap.docs.forEach(
          (item) => {
            const data =
              item.data();

            allActivities.push({
              id: item.id,
              source: "waste",
              ...(data as any),
            });
          }
        );
      } catch (error) {
        console.error(
          "WASTE ERROR:",
          error
        );
      }

      // =================================================
      // TRAVEL
      // =================================================

      try {
        const travelSnap =
          await getDocs(
            query(
              collection(
                db,
                "travel_records"
              ),
              where(
                "uid",
                "==",
                user.uid
              )
            )
          );

        travelSnap.docs.forEach(
          (item) => {
            const data =
              item.data();

            allActivities.push({
              id: item.id,
              source: "travel",
              ...(data as any),
            });
          }
        );
      } catch (error) {
        console.error(
          "TRAVEL ERROR:",
          error
        );
      }

      // =================================================
      // ELECTRICITY
      // =================================================

      try {
        const electricitySnap =
          await getDocs(
            query(
              collection(
                db,
                "electricity_records"
              ),
              where(
                "uid",
                "==",
                user.uid
              )
            )
          );

        electricitySnap.docs.forEach(
          (item) => {
            const data =
              item.data();

            allActivities.push({
              id: item.id,
              source: "electricity",
              ...(data as any),
            });
          }
        );
      } catch (error) {
        console.error(
          "ELECTRICITY ERROR:",
          error
        );
      }

      // =================================================
      // CALCULATE ACTIVITY TOTAL
      // =================================================

      const activityPoints =
        allActivities.reduce(
          (
            total,
            activity
          ) => {
            return (
              total +
              safeNonNegative(
                activity.points
              )
            );
          },
          0
        );

      const activityCarbon =
        allActivities.reduce(
          (
            total,
            activity
          ) => {
            return (
              total +
              safeNonNegative(
                activity.carbonSaved
              )
            );
          },
          0
        );

      // =================================================
      // FINAL POINTS
      // =================================================

      /*
        users.totalPoints เป็นค่าหลัก

        ถ้ามีข้อมูล users:
          ใช้ users.totalPoints

        ถ้าไม่มีข้อมูล:
          fallback ไป activityPoints

        และไม่อนุญาตให้ติดลบ
      */

      const finalPoints =
        hasValidUserPoints
          ? Math.max(
              0,
              userPoints
            )
          : Math.max(
              0,
              activityPoints
            );

      // =================================================
      // FINAL CARBON
      // =================================================

      const finalCarbon =
        hasValidUserCarbon
          ? Math.max(
              0,
              userCarbon
            )
          : Math.max(
              0,
              activityCarbon
            );

      // =================================================
      // SET DASHBOARD TOTAL
      // =================================================

      setTotalPoints(
        Number.isFinite(
          finalPoints
        )
          ? Math.max(
              0,
              finalPoints
            )
          : 0
      );

      setCarbonSaved(
        Number.isFinite(
          finalCarbon
        )
          ? Math.max(
              0,
              finalCarbon
            )
          : 0
      );

      setTotalActivities(
        allActivities.length
      );

      // =================================================
      // SORT RECENT ACTIVITIES
      // =================================================

      allActivities.sort(
        (a, b) => {
          const aTime =
            a.createdAt?.seconds ||
            a.createdAt
              ?.toMillis?.() ||
            0;

          const bTime =
            b.createdAt?.seconds ||
            b.createdAt
              ?.toMillis?.() ||
            0;

          return (
            bTime - aTime
          );
        }
      );

      setRecentActivities(
        allActivities.slice(
          0,
          5
        )
      );

      // =================================================
      // RANKING
      //
      // สำคัญ:
      // ไม่อ่าน users ทั้ง collection
      //
      // ใช้ ranking collection
      // เพื่อป้องกัน:
      // Missing or insufficient permissions
      // =================================================

      try {
        const rankingSnap =
          await getDocs(
            collection(
              db,
              "ranking"
            )
          );

        const rankingData =
          rankingSnap.docs.map(
            (item) => {
              const data =
                item.data();

              const points =
                safeNonNegative(
                  data.totalPoints
                );

              return {
                id: item.id,

                uid:
                  data.uid ||
                  item.id,

                totalPoints:
                  points,

                carbonSaved:
                  safeNonNegative(
                    data.carbonSaved
                  ),

                ...data,
              };
            }
          );

        // -----------------------------------------------
        // SORT
        // -----------------------------------------------

        rankingData.sort(
          (
            a: any,
            b: any
          ) =>
            safeNonNegative(
              b.totalPoints
            ) -
            safeNonNegative(
              a.totalPoints
            )
        );

        // -----------------------------------------------
        // FIND CURRENT USER
        // -----------------------------------------------

        const currentIndex =
          rankingData.findIndex(
            (item: any) =>
              item.uid ===
                user.uid ||
              item.id ===
                user.uid
          );

        if (
          currentIndex !==
          -1
        ) {
          setRank(
            currentIndex + 1
          );
        } else {
          setRank(0);
        }
      } catch (error) {
        console.error(
          "RANKING ERROR:",
          error
        );

        setRank(0);
      }
    } catch (error) {
      console.error(
        "DASHBOARD ERROR:",
        error
      );

      setTotalPoints(0);
      setCarbonSaved(0);
      setTotalActivities(0);
      setRank(0);
      setRecentActivities([]);

      alert(
        "ไม่สามารถโหลดข้อมูล Dashboard ได้"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      auth.onAuthStateChanged(
        (user) => {
          if (user) {
            fetchData();
          } else {
            setTotalPoints(0);
            setCarbonSaved(0);
            setTotalActivities(0);
            setRank(0);
            setRecentActivities(
              []
            );

            setLoading(false);
          }
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // =====================================================
  // MEMBER LEVEL
  // =====================================================

  const memberLevel =
    totalPoints > 1000
      ? "Carbon Master"
      : totalPoints > 500
      ? "Eco Warrior"
      : "Green Hero";

  // =====================================================
  // REWARD PROGRESS
  // =====================================================

  const rewardProgress =
    Math.min(
      (safeNonNegative(
        totalPoints
      ) /
        500) *
        100,
      100
    );

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    timestamp: any
  ) => {
    if (
      !timestamp
    ) {
      return "";
    }

    try {
      if (
        timestamp.seconds
      ) {
        return new Date(
          timestamp.seconds *
            1000
        ).toLocaleString(
          "th-TH"
        );
      }

      if (
        timestamp.toDate
      ) {
        return timestamp
          .toDate()
          .toLocaleString(
            "th-TH"
          );
      }

      return "";
    } catch {
      return "";
    }
  };

  // =====================================================
  // ACTIVITY TITLE
  // =====================================================

  const getActivityTitle = (
    activity: Activity
  ) => {
    if (
      activity.source ===
      "waste"
    ) {
      return (
        activity.trashName ||
        "เก็บขยะ"
      );
    }

    if (
      activity.source ===
      "travel"
    ) {
      return "การเดินทาง";
    }

    if (
      activity.source ===
      "electricity"
    ) {
      return "การใช้ไฟฟ้า";
    }

    return "กิจกรรม";
  };

  // =====================================================
  // ACTIVITY ICON
  // =====================================================

  const getActivityIcon = (
    activity: Activity
  ) => {
    if (
      activity.source ===
      "waste"
    ) {
      return "🗑️";
    }

    if (
      activity.source ===
      "travel"
    ) {
      return "🚗";
    }

    if (
      activity.source ===
      "electricity"
    ) {
      return "⚡";
    }

    return "🌱";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef7f1]">
        <div className="text-center">
          <div className="text-5xl mb-4">
            🌱
          </div>

          <h1 className="text-lg font-bold text-green-600">
            Loading Dashboard...
          </h1>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#eef7f1]">
      <Sidebar />

      <main className="p-4 pt-24 pb-24">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-700">
            🌱 Carbon Track
          </h1>

          <p className="text-gray-600 mt-2 text-sm">
            Monitor your environmental impact
          </p>
        </div>

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <div className="grid grid-cols-2 gap-3">

          {/* POINTS */}

          <div className="bg-white rounded-3xl shadow p-4">
            <p className="text-gray-500 text-sm">
              Total Points
            </p>

            <h2 className="text-2xl font-bold text-green-600 mt-2">
              {Math.round(
                safeNonNegative(
                  totalPoints
                )
              )}
            </h2>
          </div>

          {/* CARBON */}

          <div className="bg-white rounded-3xl shadow p-4">
            <p className="text-gray-500 text-sm">
              Carbon Saved
            </p>

            <h2 className="text-2xl font-bold text-blue-600 mt-2">
              {safeNonNegative(
                carbonSaved
              ).toFixed(2)}
            </h2>

            <p className="text-xs text-gray-400">
              kg CO₂
            </p>
          </div>

          {/* ACTIVITIES */}

          <div className="bg-white rounded-3xl shadow p-4">
            <p className="text-gray-500 text-sm">
              Activities
            </p>

            <h2 className="text-2xl font-bold text-orange-500 mt-2">
              {totalActivities}
            </h2>
          </div>

          {/* RANK */}

          <div className="bg-white rounded-3xl shadow p-4">
            <p className="text-gray-500 text-sm">
              Global Rank
            </p>

            <h2 className="text-2xl font-bold text-purple-600 mt-2">
              {rank > 0
                ? `#${rank}`
                : "-"}
            </h2>
          </div>
        </div>

        {/* =================================================
            MEMBER LEVEL
        ================================================= */}

        <div className="bg-white rounded-3xl shadow p-5 mt-4">
          <h2 className="font-bold text-lg">
            Membership Level
          </h2>

          <p className="text-green-600 text-xl font-bold mt-2">
            {memberLevel}
          </p>
        </div>

        {/* =================================================
            REWARD PROGRESS
        ================================================= */}

        <div className="bg-white rounded-3xl shadow p-5 mt-4">
          <h2 className="font-bold text-lg mb-4">
            Reward Progress
          </h2>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all"
              style={{
                width:
                  `${rewardProgress}%`,
              }}
            />
          </div>

          <p className="text-sm text-gray-500 mt-3">
            {Math.round(
              safeNonNegative(
                totalPoints
              )
            )}{" "}
            / 500 points
          </p>
        </div>

        {/* =================================================
            ENVIRONMENTAL IMPACT
        ================================================= */}

        <div className="bg-white rounded-3xl shadow p-5 mt-4">
          <h2 className="font-bold text-lg mb-4">
            Environmental Impact
          </h2>

          <div className="space-y-3">

            {/* TREES */}

            <div className="bg-green-100 p-4 rounded-2xl">
              <p className="text-sm text-gray-600">
                🌳 Trees Equivalent
              </p>

              <h3 className="text-2xl font-bold mt-1">
                {(
                  safeNonNegative(
                    carbonSaved
                  ) / 20
                ).toFixed(1)}
              </h3>
            </div>

            {/* CO2 */}

            <div className="bg-blue-100 p-4 rounded-2xl">
              <p className="text-sm text-gray-600">
                🌱 CO₂ Reduced
              </p>

              <h3 className="text-2xl font-bold mt-1">
                {safeNonNegative(
                  carbonSaved
                ).toFixed(2)}{" "}
                kg
              </h3>
            </div>

            {/* ACTIVITIES */}

            <div className="bg-yellow-100 p-4 rounded-2xl">
              <p className="text-sm text-gray-600">
                📊 Activities
              </p>

              <h3 className="text-2xl font-bold mt-1">
                {totalActivities}
              </h3>
            </div>

          </div>
        </div>

        {/* =================================================
            ACTIVITY SUMMARY
        ================================================= */}

        <div className="bg-white rounded-3xl shadow p-5 mt-4">
          <h2 className="font-bold text-lg mb-4">
            Activity Summary
          </h2>

          <div className="grid grid-cols-3 gap-2">

            {/* WASTE */}

            <div className="bg-green-50 rounded-2xl p-3 text-center">
              <div className="text-2xl">
                🗑️
              </div>

              <p className="text-xs text-gray-500 mt-1">
                เก็บขยะ
              </p>

              <p className="font-bold text-green-600 mt-1">
                {allActivityCount(
                  recentActivities,
                  "waste"
                )}
              </p>
            </div>

            {/* TRAVEL */}

            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <div className="text-2xl">
                🚗
              </div>

              <p className="text-xs text-gray-500 mt-1">
                เดินทาง
              </p>

              <p className="font-bold text-blue-600 mt-1">
                {allActivityCount(
                  recentActivities,
                  "travel"
                )}
              </p>
            </div>

            {/* ELECTRICITY */}

            <div className="bg-yellow-50 rounded-2xl p-3 text-center">
              <div className="text-2xl">
                ⚡
              </div>

              <p className="text-xs text-gray-500 mt-1">
                ไฟฟ้า
              </p>

              <p className="font-bold text-yellow-600 mt-1">
                {allActivityCount(
                  recentActivities,
                  "electricity"
                )}
              </p>
            </div>

          </div>
        </div>

        {/* =================================================
            RECENT ACTIVITIES
        ================================================= */}

        <div className="bg-white rounded-3xl shadow p-5 mt-4">
          <h2 className="font-bold text-lg mb-4">
            Recent Activities
          </h2>

          {recentActivities.length ===
          0 ? (
            <p className="text-gray-500 text-sm">
              No activity found
            </p>
          ) : (
            <div className="space-y-3">

              {recentActivities.map(
                (
                  activity
                ) => (
                  <div
                    key={`${activity.source}-${activity.id}`}
                    className="bg-gray-50 border p-4 rounded-2xl"
                  >

                    {/* TITLE */}

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">
                        {getActivityIcon(
                          activity
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-sm">
                          {getActivityTitle(
                            activity
                          )}
                        </p>

                        <p className="text-xs text-gray-400">
                          {formatDate(
                            activity.createdAt
                          )}
                        </p>
                      </div>

                    </div>

                    {/* TRAVEL */}

                    {activity.source ===
                      "travel" && (
                      <p className="text-xs text-gray-500 mt-2">

                        {activity.vehicleType ||
                          "-"}
                        {" · "}
                        {safeNumber(
                          activity.distance
                        )}{" "}
                        km
                        {" · "}
                        {activity.fuelType ||
                          "-"}
                        {" · "}
                        {safeNumber(
                          activity.fuelAmount
                        )}{" "}
                        L

                      </p>
                    )}

                    {/* ELECTRICITY */}

                    {activity.source ===
                      "electricity" && (
                      <p className="text-xs text-gray-500 mt-2">

                        {activity.appliance ||
                          "-"}
                        {" · "}
                        {safeNumber(
                          activity.hours
                        )}{" "}
                        ชั่วโมง
                        {" · "}
                        {safeNumber(
                          activity.voltage
                        )}{" "}
                        V
                        {" · "}
                        {safeNumber(
                          activity.wattage
                        )}{" "}
                        W

                      </p>
                    )}

                    {/* WASTE */}

                    {activity.source ===
                      "waste" && (
                      <p className="text-xs text-gray-500 mt-2">

                        {activity.category ||
                          "-"}
                        {" · "}
                        {safeNumber(
                          activity.weight
                        )}{" "}
                        kg

                      </p>
                    )}

                    {/* RESULT */}

                    <div className="flex justify-between mt-3">

                      <span className="text-green-600 font-bold text-sm">
                        🌱{" "}
                        {safeNonNegative(
                          activity.carbonSaved
                        ).toFixed(
                          2
                        )}{" "}
                        kg
                      </span>

                      <span className="text-yellow-600 font-bold text-sm">
                        ⭐ +
                        {Math.round(
                          safeNonNegative(
                            activity.points
                          )
                        )}
                      </span>

                    </div>

                  </div>
                )
              )}

            </div>
          )}
        </div>

      </main>
    </div>
  );
}