// src/pages/AccountSettings.tsx
import { useState, useEffect, type ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export function AccountSettings() {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    staffId: "",
    fullName: "",
    contactNumber: "",
    email: "",
    avatarUrl: "",
    department: "",
    role: "",
    employeeType: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  // Helper to compute initials
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  // Get auth token
  const getToken = () => {
    return localStorage.getItem("token") || "";
  };

  // Load profile data from backend
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        if (!user?.staff_id) {
          toast({
            title: "Authentication Error",
            description: "Unable to identify current user.",
            variant: "destructive",
          });
          return;
        }

        const token = getToken();
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "No authentication token found.",
            variant: "destructive",
          });
          return;
        }

        // Fetch user data from /auth/me endpoint
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }

        const data = await response.json();

        setProfile({
          staffId: data.staff_id || data.sid || "",
          fullName: data.name || "",
          contactNumber: data.contact_number || data.phone || "",
          email: data.email || "",
          avatarUrl: data.photo_url || "",
          department: data.department || "",
          role: data.role || "",
          employeeType: data.employee_type || "",
        });
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Save updated profile info
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = getToken();

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "No authentication token found.",
          variant: "destructive",
        });
        return;
      }

      // Update profile using PATCH /users/:staff_id
      const response = await fetch(`${API_URL}/users/${profile.staffId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          contact_number: profile.contactNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Change password logic
  const handleChangePassword = async () => {
    const { current, new: newPass, confirm } = passwords;

    if (!current || !newPass || !confirm) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPass !== confirm) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPass.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setChangingPassword(true);
      const token = getToken();

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "No authentication token found.",
          variant: "destructive",
        });
        return;
      }

      // Update password using PATCH /users/:staff_id
      const response = await fetch(`${API_URL}/users/${profile.staffId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPass,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update password: ${response.statusText}`);
      }

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });

      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: "Failed to update password. Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle profile photo upload
  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      const token = getToken();

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "No authentication token found.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(`${API_URL}/users/${profile.staffId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload photo: ${response.statusText}`);
      }

      const result = await response.json();

      // Refresh profile to get new photo URL
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (meResponse.ok) {
        const data = await meResponse.json();
        setProfile(prev => ({ ...prev, avatarUrl: data.photo_url || "" }));
      }

      toast({
        title: "Profile Photo Updated",
        description: "Your profile photo has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile and security settings
        </p>
      </div>

      {/* Profile Photo */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials(profile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <label htmlFor="avatar-upload" className="sr-only">
                Upload profile photo
              </label>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                title="Upload profile photo"
                aria-label="Upload profile photo"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={uploadingPhoto}
              />
              <Button
                onClick={() =>
                  document.getElementById("avatar-upload")?.click()
                }
                className="gap-2"
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {uploadingPhoto ? "Uploading..." : "Change Photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or GIF (max 5MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID</Label>
              <Input
                id="staffId"
                value={profile.staffId}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={profile.role}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeType">Employee Type</Label>
              <Input
                id="employeeType"
                value={profile.employeeType}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={profile.department}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              placeholder="e.g., +63 912 345 6789"
              value={profile.contactNumber}
              onChange={(e) =>
                setProfile({ ...profile, contactNumber: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., juan.delacruz@example.com"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            className="gap-2"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter your current password"
              value={passwords.current}
              onChange={(e) =>
                setPasswords({ ...passwords, current: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password (min 8 characters)"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter new password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
            />
          </div>

          <Button
            onClick={handleChangePassword}
            variant="secondary"
            className="gap-2"
            disabled={changingPassword}
          >
            {changingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccountSettings;