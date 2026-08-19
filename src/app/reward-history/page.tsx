"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

interface Reward {
  id: string;
  title: string;
  description: string;
  image: string;
  pointRequired: number;
}

export default function RewardsPage() {
  const [rewards, setRewards] =
    useState<Reward[]>([]);

  const [userPoints, setUserPoints] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadRewards();
    loadUser();
  }, []);

  const loadRewards = async () => {
    try {
      const snapshot =
        await getDocs(
          collection(
            db,
            "rewards"
          )
        );

      const data =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        ) as Reward[];

      setRewards(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadUser = async () => {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnap =
        await getDoc(userRef);

      if (userSnap.exists()) {
        setUserPoints(
          userSnap.data()
            .totalPoints || 0
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const redeemReward =
    async (
      reward: Reward
    ) => {
      try {
        const user =
          auth.currentUser;

        if (!user) {
          alert(
            "กรุณาเข้าสู่ระบบ"
          );
          return;
        }

        if (
          userPoints <
          reward.pointRequired
        ) {
          alert(
            "คะแนนไม่เพียงพอ"
          );
          return;
        }

        const confirmRedeem =
          confirm(
            `ยืนยันแลก ${reward.title} ใช้ ${reward.pointRequired} คะแนน ?`
          );

        if (!confirmRedeem)
          return;

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        const newPoints =
          userPoints -
          reward.pointRequired;

        await updateDoc(
          userRef,
          {
            totalPoints:
              newPoints,
          }
        );

        await addDoc(
          collection(
            db,
            "reward_history"
          ),
          {
            uid: user.uid,
            rewardId:
              reward.id,
            rewardName:
              reward.title,
            pointsUsed:
              reward.pointRequired,
            createdAt:
              serverTimestamp(),
          }
        );

        setUserPoints(
          newPoints
        );

        alert(
          "แลกรางวัลสำเร็จ 🎉"
        );
      } catch (error) {
        console.error(error);

        alert(
          "เกิดข้อผิดพลาด"
        );
      }
    };

  const memberLevel =
    userPoints > 1000
      ? "Carbon Master"
      : userPoints > 500
      ? "Eco Warrior"
      : "Green Hero";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading Rewards...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef7f1]">
      <Sidebar />

      <main className="p-4 pt-24 pb-24">

        <div className="mb-6">

          <h1 className="text-3xl font-bold text-green-700">
            🎁 Rewards Center
          </h1>

          <p className="text-gray-600 mt-2 text-sm">
            Redeem your points for rewards
          </p>

        </div>

        {/* USER POINTS */}

        <div className="bg-green-600 text-white p-5 rounded-3xl shadow-lg mb-4">

          <h2 className="text-base font-semibold">
            Available Points
          </h2>

          <p className="text-3xl font-bold mt-2">
            {userPoints}
          </p>

        </div>

        {/* MEMBER LEVEL */}

        <div className="bg-white p-5 rounded-3xl shadow mb-6">

          <h3 className="font-bold text-lg">
            Membership Level
          </h3>

          <p className="text-green-600 font-bold text-xl mt-2">
            {memberLevel}
          </p>

        </div>

        {/* REWARDS */}

        {rewards.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-6 text-center text-gray-500">
            No rewards available
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">

            {rewards.map(
              (reward) => (
                <div
                  key={reward.id}
                  className="
                    bg-white
                    rounded-3xl
                    shadow-lg
                    overflow-hidden
                  "
                >

                  <img
                    src={reward.image}
                    alt={reward.title}
                    className="
                      w-full
                      h-44
                      object-cover
                    "
                  />

                  <div className="p-5">

                    <h2 className="text-xl font-bold">
                      {reward.title}
                    </h2>

                    <p className="text-gray-600 mt-2 text-sm">
                      {reward.description}
                    </p>

                    <div className="mt-4">

                      <span
                        className="
                          bg-green-100
                          text-green-700
                          px-4
                          py-2
                          rounded-full
                          font-semibold
                          text-sm
                        "
                      >
                        {reward.pointRequired}
                        {" "}
                        points
                      </span>

                    </div>

                    <button
                      onClick={() =>
                        redeemReward(
                          reward
                        )
                      }
                      disabled={
                        userPoints <
                        reward.pointRequired
                      }
                      className={`
                        w-full
                        mt-5
                        py-3
                        rounded-xl
                        font-bold
                        transition
                        ${
                          userPoints >=
                          reward.pointRequired
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }
                      `}
                    >
                      {userPoints >=
                      reward.pointRequired
                        ? "Redeem Reward"
                        : "Not Enough Points"}
                    </button>

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