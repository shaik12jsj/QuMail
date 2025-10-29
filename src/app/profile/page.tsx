"use client";
import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { updateProfile, updatePassword } from "firebase/auth";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [email] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  if (loading) return null;
  if (!user) return <p className="text-center mt-10">Please log in first.</p>;

  const handleSaveProfile = async () => {
    try {
      await updateProfile(auth.currentUser!, { displayName: name });
      setMessage("✅ Profile updated successfully!");
    } catch (err: any) {
      setMessage("❌ Error updating profile: " + err.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("❌ Passwords do not match!");
      return;
    }
    try {
      await updatePassword(auth.currentUser!, newPassword);
      setMessage("✅ Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage("❌ Error changing password: " + err.message);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-display text-foreground">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
              <div className="mx-auto max-w-4xl space-y-8">
                <div>
                  <h2 className="font-headline mb-2 text-3xl font-bold text-foreground">
                    Profile
                  </h2>
                  <p className="text-muted-foreground">
                    Manage your account settings and public profile.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Public Profile</CardTitle>
                    <CardDescription>
                      This information will be displayed publicly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email} disabled />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-6">
                    <Button onClick={handleSaveProfile}>Save Changes</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                      Change your password here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-6">
                    <Button onClick={handleUpdatePassword}>
                      Update Password
                    </Button>
                  </CardFooter>
                </Card>

                {message && (
                  <p className="text-sm text-center text-muted-foreground">
                    {message}
                  </p>
                )}
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
