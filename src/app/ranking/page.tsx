"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

interface RankingUser {
  id: string;
  uid?: string;
  name?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  totalPoints?: number;
  carbonSaved?: number;
}

export default function RankingPage() {
  const [users, setUsers] =
    useState<RankingUser[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [authChecking, setAuthChecking] =
    useState(true);

  const [currentUid, setCurrentUid] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  // =====================================================
  // SAFE NUMBER
  // =====================================================

  const safeNumber = (
    value: any,
    fallback = 0
  ) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
  };

  // =====================================================
  // LOAD RANKING
  //
  // IMPORTANT:
  // ใช้ users เป็น SOURCE OF TRUTH
  //
  // ไม่ใช้ ranking เป็นคะแนนหลัก
  // เพราะ ranking อาจมีข้อมูลเก่าหลังจาก
  // ลบกิจกรรม / แลกรางวัล
  // =====================================================

  const loadRanking = async (
    user: User
  ) => {
    try {
      setLoading(true);
      setErrorMessage("");

      // =================================================
      // READ USERS
      // =================================================

      const usersSnapshot =
        await getDocs(
          collection(
            db,
            "users"
          )
        );

      const rankingData: RankingUser[] =
        usersSnapshot.docs.map(
          (item) => {
            const data =
              item.data();

            // ---------------------------------------------
            // POINTS
            // ---------------------------------------------

            const rawPoints =
              Number(
                data.totalPoints ?? 0
              );

            const rawCarbon =
              Number(
                data.carbonSaved ?? 0
              );

            // ---------------------------------------------
            // ป้องกันคะแนนติดลบ
            // ---------------------------------------------

            const safePoints =
              Number.isFinite(
                rawPoints
              )
                ? Math.max(
                    0,
                    rawPoints
                  )
                : 0;

            // ---------------------------------------------
            // ป้องกัน Carbon ติดลบ
            // ---------------------------------------------

            const safeCarbon =
              Number.isFinite(
                rawCarbon
              )
                ? Math.max(
                    0,
                    rawCarbon
                  )
                : 0;

            return {
              id: item.id,

              uid:
                data.uid ||
                item.id,

              name:
                data.name ||
                data.username ||
                "Carbon User",

              username:
                data.username ||
                data.name ||
                "Carbon User",

              email:
                data.email ||
                "",

              photoURL:
                data.photoURL ||
                "",

              totalPoints:
                safePoints,

              carbonSaved:
                safeCarbon,
            };
          }
        );

      // =================================================
      // SORT
      // =================================================

      rankingData.sort(
        (a, b) =>
          safeNumber(
            b.totalPoints
          ) -
          safeNumber(
            a.totalPoints
          )
      );

      // =================================================
      // SET USERS
      // =================================================

      setUsers(
        rankingData
      );

      setCurrentUid(
        user.uid
      );

    } catch (error) {
      console.error(
        "Ranking Firebase Error:",
        error
      );

      setErrorMessage(
        "ไม่สามารถโหลดข้อมูล Ranking ได้"
      );

      setUsers([]);

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (!mounted) {
            return;
          }

          setAuthChecking(
            false
          );

          // -----------------------------------------------
          // NOT LOGIN
          // -----------------------------------------------

          if (!user) {

            setCurrentUid(
              null
            );

            setUsers([]);

            setLoading(
              false
            );

            return;
          }

          // -----------------------------------------------
          // LOGIN
          // -----------------------------------------------

          setCurrentUid(
            user.uid
          );

          await loadRanking(
            user
          );
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // =====================================================
  // CURRENT USER
  // =====================================================

  const currentUserIndex =
    currentUid
      ? users.findIndex(
          (item) =>
            item.uid ===
            currentUid
        )
      : -1;

  const currentUser =
    currentUserIndex >= 0
      ? users[
          currentUserIndex
        ]
      : null;

  const currentRank =
    currentUserIndex >= 0
      ? currentUserIndex + 1
      : 0;

  // =====================================================
  // LEVEL
  // =====================================================

  const getLevel = (
    points: number
  ) => {

    const safePoints =
      Math.max(
        0,
        safeNumber(points)
      );

    if (safePoints > 1000) {
      return "Carbon Master";
    }

    if (safePoints > 500) {
      return "Eco Warrior";
    }

    return "Green Hero";
  };

  // =====================================================
  // RANK ICON
  // =====================================================

  const getRankIcon = (
    rank: number
  ) => {

    if (rank === 1) {
      return "🥇";
    }

    if (rank === 2) {
      return "🥈";
    }

    if (rank === 3) {
      return "🥉";
    }

    return `#${rank}`;
  };

  // =====================================================
  // AUTH CHECKING
  // =====================================================

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#eef7f1] flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🔐
          </div>

          <p className="text-green-600 font-bold">
            Checking Login...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef7f1] flex items-center justify-center">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🏆
          </div>

          <p className="text-green-600 font-bold">
            Loading Ranking...
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // NOT LOGIN
  // =====================================================

  if (!currentUid) {
    return (
      <div className="min-h-screen bg-[#eef7f1]">

        <Sidebar />

        <main className="p-4 pt-24 pb-24">

          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">

            <div className="text-5xl mb-4">
              🔐
            </div>

            <h1 className="text-xl font-bold">
              กรุณาเข้าสู่ระบบ
            </h1>

            <p className="text-gray-500 mt-2">
              กรุณา Login เพื่อดู Ranking
            </p>

          </div>

        </main>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (
    errorMessage &&
    users.length === 0
  ) {
    return (
      <div className="min-h-screen bg-[#eef7f1]">

        <Sidebar />

        <main className="p-4 pt-24 pb-24">

          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">

            <div className="text-5xl mb-4">
              ⚠️
            </div>

            <h1 className="text-xl font-bold text-red-500">
              โหลด Ranking ไม่สำเร็จ
            </h1>

            <p className="text-gray-500 mt-3">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => {

                const user =
                  auth.currentUser;

                if (user) {
                  loadRanking(
                    user
                  );
                }

              }}
              className="
                mt-5
                bg-green-600
                text-white
                px-6
                py-3
                rounded-2xl
                font-bold
              "
            >
              🔄 ลองใหม่
            </button>

          </div>

        </main>

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

        {/* HEADER */}

        <div className="mb-6">

          <h1 className="text-3xl font-bold text-green-700">
            🏆 Carbon Ranking
          </h1>

          <p className="text-gray-600 mt-2 text-sm">
            อันดับผู้ใช้จากคะแนน Carbon Track
          </p>

        </div>

        {/* CURRENT USER */}

        {currentUser && (
          <div className="bg-green-600 text-white rounded-3xl shadow-lg p-5 mb-5">

            <div className="flex items-center gap-4">

              <img
                src={
                  currentUser.photoURL ||
                  "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                }
                alt="profile"
                className="
                  w-16
                  h-16
                  rounded-full
                  object-cover
                  border-4
                  border-white
                "
              />

              <div className="flex-1">

                <p className="text-sm opacity-80">
                  Your Ranking
                </p>

                <h2 className="text-xl font-bold">
                  {currentUser.name ||
                    currentUser.username ||
                    "Carbon User"}
                </h2>

                <p className="text-sm mt-1">
                  {getLevel(
                    safeNumber(
                      currentUser.totalPoints
                    )
                  )}
                </p>

              </div>

              <div className="text-right">

                <p className="text-sm opacity-80">
                  Rank
                </p>

                <p className="text-3xl font-bold">
                  {currentRank > 0
                    ? `#${currentRank}`
                    : "-"}
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">

              <div className="bg-white/20 rounded-2xl p-3">

                <p className="text-xs opacity-80">
                  Points
                </p>

                <p className="text-xl font-bold">
                  {Math.max(
                    0,
                    Math.round(
                      safeNumber(
                        currentUser.totalPoints
                      )
                    )
                  )}
                </p>

              </div>

              <div className="bg-white/20 rounded-2xl p-3">

                <p className="text-xs opacity-80">
                  Carbon Saved
                </p>

                <p className="text-xl font-bold">
                  {Math.max(
                    0,
                    safeNumber(
                      currentUser.carbonSaved
                    )
                  ).toFixed(2)}{" "}
                  kg
                </p>

              </div>

            </div>

          </div>
        )}

        {/* TOP 3 */}

        {users.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">

            {/* SECOND */}

            <div className="bg-white rounded-3xl shadow p-4 text-center mt-6">

              <div className="text-4xl">
                🥈
              </div>

              <p className="font-bold text-sm mt-2 truncate">
                {users[1]?.name ||
                  users[1]?.username ||
                  "-"}
              </p>

              <p className="text-yellow-600 font-bold mt-1">
                {Math.max(
                  0,
                  Math.round(
                    safeNumber(
                      users[1]?.totalPoints
                    )
                  )
                )}{" "}
                pts
              </p>

            </div>

            {/* FIRST */}

            <div className="bg-white rounded-3xl shadow-lg p-4 text-center">

              <div className="text-5xl">
                🥇
              </div>

              <p className="font-bold text-sm mt-2 truncate">
                {users[0]?.name ||
                  users[0]?.username ||
                  "-"}
              </p>

              <p className="text-yellow-600 font-bold mt-1">
                {Math.max(
                  0,
                  Math.round(
                    safeNumber(
                      users[0]?.totalPoints
                    )
                  )
                )}{" "}
                pts
              </p>

            </div>

            {/* THIRD */}

            <div className="bg-white rounded-3xl shadow p-4 text-center mt-8">

              <div className="text-3xl">
                🥉
              </div>

              <p className="font-bold text-sm mt-2 truncate">
                {users[2]?.name ||
                  users[2]?.username ||
                  "-"}
              </p>

              <p className="text-yellow-600 font-bold mt-1">
                {Math.max(
                  0,
                  Math.round(
                    safeNumber(
                      users[2]?.totalPoints
                    )
                  )
                )}{" "}
                pts
              </p>

            </div>

          </div>
        )}

        {/* ALL RANKING */}

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          <div className="p-5 border-b">

            <h2 className="text-xl font-bold">
              🌎 Global Ranking
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              ผู้ใช้ทั้งหมด {users.length} คน
            </p>

          </div>

          {users.length === 0 ? (

            <div className="p-8 text-center">

              <div className="text-5xl mb-4">
                🌱
              </div>

              <p className="text-gray-500">
                ยังไม่มีข้อมูล Ranking
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {users.map(
                (
                  rankingUser,
                  index
                ) => {

                  const rank =
                    index + 1;

                  const points =
                    Math.max(
                      0,
                      Math.round(
                        safeNumber(
                          rankingUser.totalPoints
                        )
                      )
                    );

                  const carbon =
                    Math.max(
                      0,
                      safeNumber(
                        rankingUser.carbonSaved
                      )
                    );

                  const isCurrentUser =
                    rankingUser.uid ===
                    currentUid;

                  return (
                    <div
                      key={
                        rankingUser.id
                      }
                      className={`
                        p-4
                        transition
                        ${
                          isCurrentUser
                            ? "bg-green-50 border-l-4 border-green-500"
                            : "bg-white"
                        }
                      `}
                    >

                      <div className="flex items-center gap-3">

                        {/* RANK */}

                        <div className="w-10 text-center">

                          {rank <= 3 ? (

                            <span className="text-2xl">
                              {getRankIcon(
                                rank
                              )}
                            </span>

                          ) : (

                            <span className="text-sm font-bold text-gray-500">
                              #{rank}
                            </span>

                          )}

                        </div>

                        {/* PHOTO */}

                        <img
                          src={
                            rankingUser.photoURL ||
                            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                          }
                          alt="profile"
                          className="
                            w-12
                            h-12
                            rounded-full
                            object-cover
                            border-2
                            border-green-200
                          "
                        />

                        {/* NAME */}

                        <div className="flex-1 min-w-0">

                          <div className="flex items-center gap-2">

                            <p className="font-bold truncate">
                              {rankingUser.name ||
                                rankingUser.username ||
                                "Carbon User"}
                            </p>

                            {isCurrentUser && (
                              <span className="
                                text-xs
                                bg-green-100
                                text-green-700
                                px-2
                                py-1
                                rounded-full
                                font-bold
                              ">
                                You
                              </span>
                            )}

                          </div>

                          <p className="text-xs text-gray-500 mt-1">
                            {getLevel(
                              points
                            )}
                          </p>

                        </div>

                        {/* POINTS */}

                        <div className="text-right">

                          <p className="text-yellow-600 font-bold">
                            ⭐ {points}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {carbon.toFixed(
                              2
                            )}{" "}
                            kg CO₂
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

      </main>

    </div>
  );
}