import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const FacultyAccountSettings = () => {
  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your account settings have been updated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Account Settings</h2>
        <p className="text-muted-foreground">Manage your profile and account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" />
                <AvatarFallback className="text-2xl">FM</AvatarFallback>
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <h3 className="font-semibold">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">Upload a new photo to update your profile</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input defaultValue="Faculty Member" />
            </div>

            <div className="space-y-2">
              <Label>Staff ID</Label>
              <Input defaultValue="28-2025-0002" disabled />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" defaultValue="faculty@udm.edu.ph" />
            </div>

            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input type="tel" defaultValue="+63 912 345 6789" />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input defaultValue="College of Engineering" disabled />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input defaultValue="Faculty" disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" />
          </div>

          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" />
          </div>

          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};
