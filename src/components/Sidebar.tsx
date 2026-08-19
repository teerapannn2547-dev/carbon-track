"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  ScanLine,
  History,
  Gift,
  Trophy,
  User,
  LogOut,
  Leaf,
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error(error);
    }
  };

  const menus = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Scan",
      href: "/scan",
      icon: ScanLine,
    },
    {
      label: "History",
      href: "/history",
      icon: History,
    },
    {
      label: "Rewards",
      href: "/rewards",
      icon: Gift,
    },
    {
      label: "Ranking",
      href: "/ranking",
      icon: Trophy,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
    },
  ];

  return (
    <>
      {/* Top Header */}
      <header
        className="
          fixed
          top-0
          left-1/2
          -translate-x-1/2
          w-full
          max-w-md
          z-50
          bg-green-700
          text-white
          px-4
          py-4
          flex
          items-center
          justify-between
        "
      >
        <div className="flex items-center gap-2">
          <Leaf size={24} />

          <span className="font-bold text-lg">
            Carbon Track
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="hover:opacity-80"
        >
          <LogOut size={22} />
        </button>
      </header>

      {/* Bottom Navigation */}
      <nav
        className="
          fixed
          bottom-0
          left-1/2
          -translate-x-1/2
          w-full
          max-w-md
          bg-white
          border-t
          z-50
        "
      >
        <div className="grid grid-cols-6 py-2">
          {menus.map((menu) => {
            const Icon = menu.icon;

            const active =
              pathname === menu.href;

            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={`
                  flex
                  flex-col
                  items-center
                  gap-1
                  py-2
                  text-[11px]
                  transition
                  ${
                    active
                      ? "text-green-700 font-bold"
                      : "text-gray-500"
                  }
                `}
              >
                <Icon size={20} />

                <span>
                  {menu.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}