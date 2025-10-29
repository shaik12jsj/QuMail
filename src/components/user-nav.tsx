"use client";

import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function UserNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Button asChild>
        <a href="/login">Login</a>
      </Button>
    );
  }

  // Get user's first letter for avatar circle
  const firstLetter = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user.email
    ? user.email.charAt(0).toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-accent transition">
          {/* Avatar Circle */}
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
            {firstLetter}
          </div>

          {/* Name or Email */}
          <span className="font-medium text-sm">
            {user.displayName || user.email}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-center font-semibold">
          {user.displayName || user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile">Profile</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings">Settings</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
