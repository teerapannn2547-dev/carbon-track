"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

import { auth, db } from "@/lib/firebase";

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

interface Reward {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  points?: number;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] =
    useState<string | null>(null);

  // =====================================================
  // LOAD USER + REWARDS
  // =====================================================

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeRewards: (() => void) | null = null;

    const unsubscribeAuth =
      onAuthStateChanged(auth, (user) => {
        // =================================================
        // NOT LOGIN
        // =================================================

        if (!user) {
          setTotalPoints(0);
          setRewards([]);
          setLoading(false);

          if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = null;
          }

          if (unsubscribeRewards) {
            unsubscribeRewards();
            unsubscribeRewards = null;
          }

          return;
        }

        // =================================================
        // USER POINTS
        // =================================================

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        unsubscribeUser = onSnapshot(
          userRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setTotalPoints(0);
              setLoading(false);
              return;
            }

            const data = snapshot.data();

            const rawPoints =
              data.totalPoints;

            const points =
              Number(rawPoints);

            /*
             * =================================================
             * IMPORTANT
             *
             * คะแนนต้องไม่ติดลบ
             *
             * ถ้า Firebase มี -38
             * หน้า Rewards จะแสดง 0
             *
             * แต่จะไม่เขียนกลับ Firebase จาก onSnapshot
             * เพื่อป้องกัน loop การเขียนข้อมูล
             *
             * การแก้ค่าจริงจะทำใน Transaction
             * ตอนที่มีการทำรายการ
             * =================================================
             */

            if (
              Number.isFinite(points)
            ) {
              setTotalPoints(
                Math.max(
                  0,
                  points
                )
              );
            } else {
              console.error(
                "INVALID TOTAL POINTS:",
                rawPoints
              );

              setTotalPoints(0);
            }

            setLoading(false);
          },
          (error) => {
            console.error(
              "USER POINTS ERROR:",
              error
            );

            setTotalPoints(0);
            setLoading(false);
          }
        );

        // =================================================
        // REWARDS
        // =================================================

        const rewardsRef =
          collection(db, "rewards");

        unsubscribeRewards = onSnapshot(
          rewardsRef,
          (snapshot) => {
            const rewardList: Reward[] =
              snapshot.docs.map((item) => ({
                id: item.id,
                ...(item.data() as Omit<
                  Reward,
                  "id"
                >),
              }));

            rewardList.sort(
              (a, b) =>
                Number(a.points || 0) -
                Number(b.points || 0)
            );

            setRewards(rewardList);
          },
          (error) => {
            console.error(
              "REWARDS ERROR:",
              error
            );

            setRewards([]);
          }
        );
      });

    return () => {
      unsubscribeAuth();

      if (unsubscribeUser) {
        unsubscribeUser();
      }

      if (unsubscribeRewards) {
        unsubscribeRewards();
      }
    };
  }, []);

  // =====================================================
  // REDEEM REWARD
  // =====================================================

  const handleRedeem = async (
    reward: Reward
  ) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert(
          "⚠️ กรุณาเข้าสู่ระบบก่อน"
        );
        return;
      }

      // =================================================
      // REWARD POINTS
      // =================================================

      const rewardPoints =
        Number(reward.points);

      if (
        !Number.isFinite(
          rewardPoints
        ) ||
        rewardPoints <= 0
      ) {
        alert(
          "⚠️ คะแนนรางวัลไม่ถูกต้อง"
        );
        return;
      }

      // =================================================
      // CHECK POINTS FROM CURRENT UI
      // =================================================

      const safeCurrentPoints =
        Math.max(
          0,
          Number.isFinite(
            totalPoints
          )
            ? totalPoints
            : 0
        );

      if (
        safeCurrentPoints <
        rewardPoints
      ) {
        alert(
          `❌ คะแนนไม่เพียงพอ\n\n` +
            `คะแนนของคุณ: ${safeCurrentPoints}\n` +
            `ใช้คะแนน: ${rewardPoints}`
        );

        return;
      }

      // =================================================
      // CONFIRM
      // =================================================

      const remainingPreview =
        Math.max(
          0,
          safeCurrentPoints -
            rewardPoints
        );

      const confirmRedeem =
        window.confirm(
          `🎁 ยืนยันการแลกของรางวัล\n\n` +
            `${reward.title || "Reward"}\n` +
            `ใช้ ${rewardPoints} points\n\n` +
            `คะแนนคงเหลือหลังแลก: ${remainingPreview} points`
        );

      if (!confirmRedeem) {
        return;
      }

      setRedeemingId(reward.id);

      // =================================================
      // REFERENCES
      // =================================================

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const rankingRef = doc(
        db,
        "ranking",
        user.uid
      );

      const historyRef = doc(
        collection(
          db,
          "reward_history"
        )
      );

      // =================================================
      // TRANSACTION
      // =================================================

      let newPoints = 0;

      await runTransaction(
        db,
        async (transaction) => {
          // ---------------------------------------------
          // GET USER
          // ---------------------------------------------

          const userSnapshot =
            await transaction.get(
              userRef
            );

          if (
            !userSnapshot.exists()
          ) {
            throw new Error(
              "ไม่พบข้อมูลผู้ใช้"
            );
          }

          const userData =
            userSnapshot.data();

          // ---------------------------------------------
          // READ CURRENT POINTS
          // ---------------------------------------------

          const rawCurrentPoints =
            userData.totalPoints;

          const parsedCurrentPoints =
            Number(
              rawCurrentPoints
            );

          /*
           * =================================================
           * POINTS VALIDATION
           * =================================================
           *
           * NaN / Infinity = ข้อมูลเสีย
           *
           * ค่าติดลบ = normalize เป็น 0
           *
           * แต่ถ้าติดลบอยู่ จะไม่อนุญาตให้แลกรางวัล
           * เพราะคะแนนจริงที่เหลือคือ 0
           * =================================================
           */

          if (
            !Number.isFinite(
              parsedCurrentPoints
            )
          ) {
            throw new Error(
              "POINTS_INVALID"
            );
          }

          const currentPoints =
            Math.max(
              0,
              parsedCurrentPoints
            );

          // ---------------------------------------------
          // NEGATIVE POINTS
          // ---------------------------------------------

          if (
            parsedCurrentPoints < 0
          ) {
            /*
             * ซ่อมค่าติดลบใน users
             *
             * แต่ยังไม่ให้แลกรางวัลใน Transaction นี้
             */

            transaction.update(
              userRef,
              {
                totalPoints: 0,
              }
            );

            transaction.set(
              rankingRef,
              {
                uid: user.uid,

                username:
                  userData.name ||
                  userData.username ||
                  user.displayName ||
                  "Carbon User",

                totalPoints: 0,

                carbonSaved:
                  Math.max(
                    0,
                    Number(
                      userData.carbonSaved ||
                        0
                    )
                  ),
              },
              {
                merge: true,
              }
            );

            throw new Error(
              "POINTS_WAS_NEGATIVE"
            );
          }

          // ---------------------------------------------
          // CHECK
          // ---------------------------------------------

          if (
            currentPoints <
            rewardPoints
          ) {
            throw new Error(
              "คะแนนไม่เพียงพอ"
            );
          }

          // ---------------------------------------------
          // CALCULATE
          // ---------------------------------------------

          newPoints =
            Math.max(
              0,
              currentPoints -
                rewardPoints
            );

          // ---------------------------------------------
          // SAFETY
          // ---------------------------------------------

          if (
            !Number.isFinite(
              newPoints
            ) ||
            newPoints < 0
          ) {
            throw new Error(
              "POINTS_CALCULATION_ERROR"
            );
          }

          // ---------------------------------------------
          // CARBON
          // ---------------------------------------------

          const rawCarbon =
            Number(
              userData.carbonSaved ||
                0
            );

          const carbonSaved =
            Number.isFinite(
              rawCarbon
            )
              ? Math.max(
                  0,
                  rawCarbon
                )
              : 0;

          // ---------------------------------------------
          // UPDATE USER
          // ---------------------------------------------

          transaction.update(
            userRef,
            {
              totalPoints:
                newPoints,

              carbonSaved:
                carbonSaved,
            }
          );

          // ---------------------------------------------
          // UPDATE RANKING
          // ---------------------------------------------

          transaction.set(
            rankingRef,
            {
              uid: user.uid,

              username:
                userData.name ||
                userData.username ||
                user.displayName ||
                "Carbon User",

              totalPoints:
                newPoints,

              carbonSaved:
                carbonSaved,
            },
            {
              merge: true,
            }
          );

          // ---------------------------------------------
          // SAVE REWARD HISTORY
          // ---------------------------------------------

          transaction.set(
            historyRef,
            {
              uid: user.uid,

              rewardId:
                reward.id,

              rewardTitle:
                reward.title ||
                "Reward",

              description:
                reward.description ||
                "",

              image:
                reward.image ||
                "",

              points:
                rewardPoints,

              createdAt:
                serverTimestamp(),
            }
          );
        }
      );

      // =================================================
      // SUCCESS
      // =================================================

      setTotalPoints(
        Math.max(
          0,
          newPoints
        )
      );

      alert(
        `🎉 แลกรางวัลสำเร็จ!\n\n` +
          `🎁 ${
            reward.title ||
            "Reward"
          }\n` +
          `⭐ ใช้ ${rewardPoints} points\n` +
          `💰 คะแนนคงเหลือ: ${Math.max(
            0,
            newPoints
          )} points`
      );
    } catch (error) {
      console.error(
        "REDEEM ERROR:",
        error
      );

      // =================================================
      // NEGATIVE POINTS
      // =================================================

      if (
        error instanceof Error &&
        error.message ===
          "POINTS_WAS_NEGATIVE"
      ) {
        /*
         * Firebase ถูกแก้เป็น 0
         *
         * แต่ Transaction ถูกยกเลิกทั้งหมด
         * ดังนั้นต้องแจ้งให้ผู้ใช้กดใหม่
         */

        setTotalPoints(0);

        alert(
          "⚠️ ระบบพบคะแนนติดลบในบัญชี\n\n" +
            "ระบบได้ปรับคะแนนเป็น 0 แล้ว\n\n" +
            "กรุณาโหลดหน้าใหม่ก่อนแลกรางวัล"
        );

        return;
      }

      // =================================================
      // INVALID POINTS
      // =================================================

      if (
        error instanceof Error &&
        error.message ===
          "POINTS_INVALID"
      ) {
        alert(
          "❌ คะแนนในระบบไม่ถูกต้อง\n\n" +
            "พบค่า totalPoints เป็น NaN หรือค่าที่ไม่ใช่ตัวเลขใน Firebase\n\n" +
            "กรุณาแก้ totalPoints ใน users ให้เป็นตัวเลขก่อน"
        );

        return;
      }

      // =================================================
      // NOT ENOUGH
      // =================================================

      if (
        error instanceof Error &&
        error.message ===
          "คะแนนไม่เพียงพอ"
      ) {
        alert(
          "❌ คะแนนไม่เพียงพอ\n\n" +
            "กรุณารีเฟรชหน้าแล้วลองใหม่"
        );

        return;
      }

      // =================================================
      // CALCULATION ERROR
      // =================================================

      if (
        error instanceof Error &&
        error.message ===
          "POINTS_CALCULATION_ERROR"
      ) {
        alert(
          "❌ ไม่สามารถคำนวณคะแนนคงเหลือได้"
        );

        return;
      }

      // =================================================
      // OTHER ERROR
      // =================================================

      alert(
        "❌ ไม่สามารถแลกรางวัลได้\n\n" +
          "กรุณาตรวจสอบ Firebase Rules และ Console"
      );
    } finally {
      setRedeemingId(null);
    }
  };

  // =====================================================
  // MEMBERSHIP
  // =====================================================

  const level =
    totalPoints > 1000
      ? "Carbon Master"
      : totalPoints > 500
      ? "Eco Warrior"
      : "Green Hero";

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef7f1] flex items-center justify-center">
        <p className="text-gray-500">
          Loading Rewards...
        </p>
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
            🎁 Rewards Center
          </h1>

          <p className="text-gray-600 mt-1">
            Redeem your points for rewards
          </p>
        </div>

        {/* AVAILABLE POINTS */}

        <div className="bg-green-600 text-white rounded-3xl shadow-lg p-6 mb-4">
          <p className="text-lg font-semibold">
            Available Points
          </p>

          <p className="text-5xl font-bold mt-2">
            {Math.max(
              0,
              totalPoints
            )}
          </p>
        </div>

        {/* MEMBERSHIP */}

        <div className="bg-white rounded-3xl shadow p-5 mb-6">
          <p className="text-lg font-bold">
            Membership Level
          </p>

          <p className="text-xl font-bold text-green-600 mt-2">
            {level}
          </p>
        </div>

        {/* REWARDS */}

        {rewards.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-8 text-center">
            <p className="text-gray-500">
              No rewards available
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {rewards.map(
              (reward) => {
                const rewardPoints =
                  Number(
                    reward.points || 0
                  );

                const canRedeem =
                  Number.isFinite(
                    totalPoints
                  ) &&
                  Math.max(
                    0,
                    totalPoints
                  ) >=
                    rewardPoints;

                return (
                  <div
                    key={reward.id}
                    className="bg-white rounded-3xl shadow-lg overflow-hidden"
                  >

                    {/* IMAGE */}

                    {reward.image ? (
                      <img
                        src={
                          reward.image
                        }
                        alt={
                          reward.title ||
                          "Reward"
                        }
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-green-100 flex items-center justify-center text-6xl">
                        🎁
                      </div>
                    )}

                    {/* CONTENT */}

                    <div className="p-5">

                      <h2 className="text-xl font-bold">
                        {reward.title ||
                          "Reward"}
                      </h2>

                      <p className="text-gray-500 text-sm mt-2">
                        {reward.description ||
                          ""}
                      </p>

                      {/* POINTS */}

                      <div className="mt-4 inline-flex items-center bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
                        ⭐{" "}
                        {rewardPoints}{" "}
                        points
                      </div>

                      {/* BUTTON */}

                      <button
                        type="button"
                        disabled={
                          !canRedeem ||
                          redeemingId ===
                            reward.id
                        }
                        onClick={() =>
                          handleRedeem(
                            reward
                          )
                        }
                        className={`mt-4 w-full py-3 rounded-xl font-bold transition ${
                          canRedeem
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {redeemingId ===
                        reward.id
                          ? "กำลังแลก..."
                          : canRedeem
                          ? "🎁 Redeem Reward"
                          : "Not Enough Points"}
                      </button>

                    </div>
                  </div>
                );
              }
            )}

          </div>
        )}

      </main>
    </div>
  );
}