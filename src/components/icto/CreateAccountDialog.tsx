import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAccountDialog({ open, onOpenChange }: CreateAccountDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    agencyNumber: "",
    fullName: "",
    department: "",
    phone: "",
    email: "",
    role: "",
    password: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Implement OCR/image processing to auto-fill fields
      toast({
        title: "Image Processing",
        description: "Auto-filling fields from image...",
      });
    }
  };

  const handleCreate = () => {
    // TODO: Validate and API call to create account
    if (!formData.agencyNumber || !formData.fullName || !formData.email || !formData.role) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields marked with *",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Account Created",
      description: `Account for ${formData.fullName} has been created successfully`,
    });
    
    // Reset form
    setFormData({
      agencyNumber: "",
      fullName: "",
      department: "",
      phone: "",
      email: "",
      role: "",
      password: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Register a new university account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import From Image */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="font-semibold mb-1">Import From Image</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Optional. Select an image containing staff information to auto-fill fields below.
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="max-w-xs mx-auto"
            />
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agencyNumber">
                Agency Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agencyNumber"
                placeholder="e.g., 11"
                value={formData.agencyNumber}
                onChange={(e) => setFormData({ ...formData, agencyNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">
                Department
              </Label>
              <Input
                id="department"
                placeholder="Auto/Optional depending on Role"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="e.g., Juan Dela Cruz"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="9xxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@school.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="role">
                Employee Type / Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— Select Role —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="icto">ICTO</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="hr_staff">HR Staff</SelectItem>
                  <SelectItem value="vp">VP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="password">Set Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="e.g., testing111"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Optional. If provided, user may be asked to change it later.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
