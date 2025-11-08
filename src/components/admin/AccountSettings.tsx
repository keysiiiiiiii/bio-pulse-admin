import { useState, useEffect, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { staffApi } from "@/services/api";

export function AccountSettings() {
  const [profile, setProfile] = useState({
    staffId: "",
    fullName: "",
    contactNumber: "",
    email: "",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        // TODO: Get current user's staff_id from session/auth
        const currentStaffId = localStorage.getItem('staff_id') || '';
        
        if (currentStaffId) {
          const userData = await staffApi.getByStaffId(currentStaffId);
          setProfile({
            staffId: userData.staff_id,
            fullName: userData.name,
            contactNumber: userData.contact_no || "",
            email: userData.email || "",
            avatarUrl: userData.avatar_url || "",
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [toast]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveProfile = async () => {
    try {
      await staffApi.update(profile.staffId, {
        contact_no: profile.contactNumber,
        email: profile.email,
      });
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwords.new.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Verify current password first
      await staffApi.updatePassword(profile.staffId, passwords.new);
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully. It is now encrypted.",
      });

      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    }
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await staffApi.uploadAvatar(profile.staffId, file);
      setProfile({ ...profile, avatarUrl: result.url });
      
      toast({
        title: "Photo Updated",
        description: "Your profile picture has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and security settings</p>
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
                {loading ? "..." : getInitials(profile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <Button
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="gap-2"
                disabled={loading}
              >
                <Camera className="h-4 w-4" />
                Change Photo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={profile.fullName}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Full name cannot be edited</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={profile.contactNumber}
              onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Primary Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>

          <Button onClick={handleSaveProfile} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
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
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            />
          </div>

          <Button onClick={handleChangePassword} variant="secondary" className="gap-2">
            <Save className="h-4 w-4" />
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
