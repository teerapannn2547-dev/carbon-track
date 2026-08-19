"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";

interface UserData {
  name?: string;
  email?: string;
  photoURL?: string;
  totalPoints?: number;
  carbonSaved?: number;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userData, setUserData] =
    useState<UserData | null>(null);

  const [name, setName] = useState("");

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        router.push("/");
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
        const data =
          userSnap.data() as UserData;

        setUserData(data);

        setName(
          data.name || "Carbon User"
        );
      }
    } catch (error) {
      console.error(
        "LOAD PROFILE ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UPLOAD PROFILE IMAGE
  // =====================================================

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file =
        e.target.files?.[0];

      if (!file) return;

      setUploading(true);

      const cloudName =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      const uploadPreset =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (
        !cloudName ||
        !uploadPreset
      ) {
        alert(
          "Cloudinary ENV not found"
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "upload_preset",
        uploadPreset
      );

      const response =
        await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      console.log(
        "Cloudinary Response:",
        data
      );

      if (!response.ok) {
        alert(
          data?.error?.message ||
            "Upload Failed"
        );

        return;
      }

      const photoURL =
        data?.secure_url;

      if (!photoURL) {
        alert(
          "No image URL returned"
        );

        return;
      }

      const user =
        auth.currentUser;

      if (!user) return;

      await updateDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          photoURL,
        }
      );

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              photoURL,
            }
          : null
      );

      alert(
        "Upload Success 🎉"
      );
    } catch (error) {
      console.error(
        "UPLOAD ERROR:",
        error
      );

      alert(
        "Upload Failed"
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile =
    async () => {
      try {
        const user =
          auth.currentUser;

        if (!user) return;

        await updateDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {
            name,
          }
        );

        setUserData((prev) =>
          prev
            ? {
                ...prev,
                name,
              }
            : null
        );

        setEditing(false);

        alert(
          "Profile Updated"
        );
      } catch (error) {
        console.error(
          "SAVE PROFILE ERROR:",
          error
        );

        alert(
          "ไม่สามารถบันทึก Profile ได้"
        );
      }
    };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    async () => {
      try {
        await signOut(auth);

        router.push("/");
      } catch (error) {
        console.error(
          "LOGOUT ERROR:",
          error
        );
      }
    };

  // =====================================================
  // DATA
  // =====================================================

  const totalPoints =
    Number(
      userData?.totalPoints || 0
    );

  const carbonSaved =
    Number(
      userData?.carbonSaved || 0
    );

  // =====================================================
  // MEMBERSHIP LEVEL
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
      <div className="flex items-center justify-center min-h-screen bg-[#eef7f1]">
        <p className="text-gray-600">
          Loading Profile...
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

        {/* =================================================
            PROFILE CARD
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-lg p-6">

          <div className="flex flex-col items-center">

            {/* PROFILE IMAGE */}

            <img
              src={
                userData?.photoURL ||
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              }
              alt="avatar"
              className="
                w-28
                h-28
                rounded-full
                object-cover
                border-4
                border-green-500
              "
            />

            {/* CHANGE PHOTO */}

            <label
              className="
                mt-3
                bg-green-600
                text-white
                px-4
                py-2
                rounded-xl
                cursor-pointer
                hover:bg-green-700
                transition
              "
            >
              {uploading
                ? "Uploading..."
                : "Change Photo"}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={
                  handleUpload
                }
                disabled={uploading}
              />
            </label>

            {/* NAME */}

            {editing ? (
              <input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                className="
                  mt-4
                  border
                  rounded-xl
                  p-3
                  w-full
                  text-center
                  outline-none
                  focus:ring-2
                  focus:ring-green-400
                "
                placeholder="ชื่อของคุณ"
              />
            ) : (
              <h1 className="text-2xl font-bold mt-4">
                {userData?.name ||
                  "Carbon User"}
              </h1>
            )}

            {/* EMAIL */}

            <p className="text-gray-500 mt-1 break-all text-center">
              {userData?.email ||
                "-"}
            </p>

          </div>
        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid grid-cols-2 gap-3 mt-4">

          {/* TOTAL POINTS */}

          <div className="bg-white rounded-3xl shadow p-4">

            <p className="text-gray-500 text-sm">
              Total Points
            </p>

            <h2 className="text-2xl font-bold text-green-600 mt-2">
              {totalPoints}
            </h2>

          </div>

          {/* CARBON SAVED */}

          <div className="bg-white rounded-3xl shadow p-4">

            <p className="text-gray-500 text-sm">
              Carbon Saved
            </p>

            <h2 className="text-2xl font-bold text-blue-600 mt-2">
              {carbonSaved.toFixed(2)} kg
            </h2>

          </div>

        </div>

        {/* =================================================
            MEMBERSHIP
        ================================================= */}

        <div className="bg-white rounded-3xl shadow p-5 mt-4">

          <h2 className="font-bold text-lg">
            Membership Level
          </h2>

          <p className="text-green-600 text-xl font-bold mt-2">
            {level}
          </p>

        </div>

        {/* =================================================
            BUTTONS
        ================================================= */}

        <div className="flex flex-col gap-3 mt-4">

          {/* EDIT / SAVE */}

          {editing ? (
            <button
              type="button"
              onClick={
                saveProfile
              }
              className="
                bg-green-600
                hover:bg-green-700
                text-white
                py-3
                rounded-2xl
                font-bold
                transition
              "
            >
              Save Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setEditing(true)
              }
              className="
                bg-blue-600
                hover:bg-blue-700
                text-white
                py-3
                rounded-2xl
                font-bold
                transition
              "
            >
              Edit Profile
            </button>
          )}

          {/* LOGOUT */}

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="
              bg-red-500
              hover:bg-red-600
              text-white
              py-3
              rounded-2xl
              font-bold
              transition
            "
          >
            Logout
          </button>

        </div>

      </main>
    </div>
  );
}