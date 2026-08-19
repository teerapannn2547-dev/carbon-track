"use client";

import Sidebar from "../../components/Sidebar";

import ProtectedRoute from "../../components/ProtectedRoute";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [notifications, setNotifications] =
    useState(true);

  const [emailUpdates, setEmailUpdates] =
    useState(true);

  const [soundEffects, setSoundEffects] =
    useState(false);

  useEffect(() => {
    const savedNotifications =
      localStorage.getItem(
        "notifications"
      );

    const savedEmailUpdates =
      localStorage.getItem(
        "email_updates"
      );

    const savedSoundEffects =
      localStorage.getItem(
        "sound_effects"
      );

    if (savedNotifications) {
      setNotifications(
        savedNotifications === "true"
      );
    }

    if (savedEmailUpdates) {
      setEmailUpdates(
        savedEmailUpdates === "true"
      );
    }

    if (savedSoundEffects) {
      setSoundEffects(
        savedSoundEffects === "true"
      );
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(
      "notifications",
      String(notifications)
    );

    localStorage.setItem(
      "email_updates",
      String(emailUpdates)
    );

    localStorage.setItem(
      "sound_effects",
      String(soundEffects)
    );

    alert("Settings saved!");
  };

  const resetAllData = () => {
    const confirmReset = confirm(
      "Are you sure you want to reset all data?"
    );

    if (!confirmReset) return;

    localStorage.clear();

    window.location.href = "/login";
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#eef7f1] dark:bg-gray-900">
        <Sidebar />

        <div className="flex-1 p-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-5xl font-bold text-green-700 dark:text-green-400">
              ⚙️ Settings
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mt-3 text-lg">
              Customize your EcoLife experience
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 mb-10">
            <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-8">
              🔔 Notifications
            </h2>

            <div className="space-y-8">
              {/* Notifications */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold dark:text-white">
                    Push Notifications
                  </h3>

                  <p className="text-gray-500 dark:text-gray-300 mt-2">
                    Receive recycling alerts
                  </p>
                </div>

                <button
                  onClick={() =>
                    setNotifications(
                      !notifications
                    )
                  }
                  className={`w-20 h-10 rounded-full transition relative ${
                    notifications
                      ? "bg-green-600"
                      : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 bg-white rounded-full absolute top-1 transition ${
                      notifications
                        ? "right-1"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Email Updates */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold dark:text-white">
                    Email Updates
                  </h3>

                  <p className="text-gray-500 dark:text-gray-300 mt-2">
                    Receive eco reports via email
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEmailUpdates(
                      !emailUpdates
                    )
                  }
                  className={`w-20 h-10 rounded-full transition relative ${
                    emailUpdates
                      ? "bg-green-600"
                      : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 bg-white rounded-full absolute top-1 transition ${
                      emailUpdates
                        ? "right-1"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Sound */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold dark:text-white">
                    Sound Effects
                  </h3>

                  <p className="text-gray-500 dark:text-gray-300 mt-2">
                    Play sounds during scans
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSoundEffects(
                      !soundEffects
                    )
                  }
                  className={`w-20 h-10 rounded-full transition relative ${
                    soundEffects
                      ? "bg-green-600"
                      : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 bg-white rounded-full absolute top-1 transition ${
                      soundEffects
                        ? "right-1"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={saveSettings}
              className="mt-10 bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-2xl font-bold text-lg"
            >
              Save Settings
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 border-2 border-red-400">
            <h2 className="text-4xl font-bold text-red-500 mb-6">
              ⚠️ Danger Zone
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
              Reset all EcoLife data including profile,
              history, rewards and settings.
            </p>

            <button
              onClick={resetAllData}
              className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-bold text-lg"
            >
              Reset All Data
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}