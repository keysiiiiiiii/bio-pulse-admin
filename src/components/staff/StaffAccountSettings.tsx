import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { staffApi } from "@/services/api/staffApi";

export const StaffAccountSettings = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setContactNumber(user.contact_number || "");
      setAvatarPreview(user.photo_url || user.avatarUrl || "");
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Update profile
      const updateData: any = {};
      if (email !== user.email) updateData.email = email;
      if (contactNumber !== user.contact_number) updateData.contact_number = contactNumber;

      if (Object.keys(updateData).length > 0) {
        await staffApi.update(user.staff_id, updateData);
      }

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const avatarRes = await staffApi.uploadAvatar(user.staff_id, formData);
        if (avatarRes.url) {
          updateData.photo_url = avatarRes.url;
        }
      }

      // Update local auth state
      const updatedUser = { ...user, ...updateData };
      login(localStorage.getItem("token") || "", updatedUser);

      toast({
        title: "Settings Saved",
        description: "Your account settings have been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await staffApi.updatePassword(user.staff_id, { currentPassword, newPassword });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "SM";

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Account Settings</h2>
        <p className="text-sm md:text-base text-muted-foreground">Manage your profile and account preferences</p>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 pt-0 md:p-6 md:pt-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-2 border-primary">
                <AvatarImage src={avatarPreview} alt={user?.name} />
                <AvatarFallback className="text-2xl md:text-3xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload">
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full cursor-pointer"
                  asChild
                >
                  <span>
                    <Camera className="h-5 w-5" />
                  </span>
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">Upload a new photo to update your profile</p>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Full Name</Label>
              <Input value={user?.name || ""} disabled className="min-h-[44px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Staff ID</Label>
              <Input value={user?.staff_id || ""} disabled className="min-h-[44px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Contact Number</Label>
              <Input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Department</Label>
              <Input value={user?.department || ""} disabled className="min-h-[44px]" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Role</Label>
              <Input value={user?.role || ""} disabled className="min-h-[44px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
          <div className="space-y-2">
            <Label className="text-sm">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <Button onClick={handlePasswordChange} disabled={loading} className="w-full sm:w-auto min-h-[44px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto min-h-[44px]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
