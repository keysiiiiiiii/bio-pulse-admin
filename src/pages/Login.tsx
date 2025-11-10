import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GraduationCap, Lock, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { staffApi } from "@/services/api/staffApi";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-format Staff ID as XX-XXXX-XXXX
  const formatStaffId = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  };

  const handleStaffIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatStaffId(e.target.value);
    setStaffId(formatted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!role || !staffId || !password) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all fields", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setLoading(true);
      
      // Call the login API
      const res = await staffApi.login(staffId, password);

      if (!res.user || !res.token) {
        throw new Error(res.error || "Login failed");
      }

      // Validate that the selected role matches the user's actual role
      if (res.user.role !== role) {
        throw new Error("Invalid role selected. Please select the correct role for your account.");
      }

      // Map the response to your User type
      const user = {
        id: res.user.staff_id,
        staff_id: res.user.staff_id,
        name: res.user.name,
        email: res.user.email || "",
        role: res.user.role,
        employee_type: res.user.employee_type,
        department: res.user.department || "",
        contact_number: res.user.contact_number || res.user.phone || "",
        photo_url: res.user.photo_url || "",
        avatarUrl: res.user.photo_url || null,
      };

      // Save to context
      login(res.token, user);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.name}!`,
      });

      // Navigate based on role
      if (user.role === "Admin") {
        navigate("/admin");
      } else if (user.role === "ICTO") {
        navigate("/icto");
      } else if (user.role === "Faculty") {
        navigate("/faculty");
      } else {
        navigate("/staff");
      }

    } catch (err: any) {
      console.error("Login error:", err);
      toast({ 
        title: "Login Failed", 
        description: err.message || "Invalid credentials. Please check your Staff ID and password.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-card rounded-full shadow-lg mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">
            Universidad de Manila
          </h1>
          <p className="text-primary-foreground/80 text-sm">
            Biometrics Attendance System
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Sign in
            </CardTitle>
            <CardDescription className="text-center">
              Use your Staff ID, role, and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Select Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="- Select Role -" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="ICTO">ICTO</SelectItem>
                    <SelectItem value="Faculty">Faculty</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffId">Staff ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="staffId"
                    type="text"
                    placeholder="XX-XXXX-XXXX"
                    value={staffId}
                    onChange={handleStaffIdChange}
                    maxLength={12}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Log in"}
              </Button>

              <div className="text-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="link"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Forgot Password?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your Staff ID to receive an OTP for password reset
                      </DialogDescription>
                    </DialogHeader>
                    <ForgotPasswordForm />
                  </DialogContent>
                </Dialog>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to the acceptable use policy.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ForgotPasswordForm = () => {
  const [staffId, setStaffId] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const formatStaffId = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  };

  const handleStaffIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatStaffId(e.target.value);
    setStaffId(formatted);
  };

  const handleSendOtp = () => {
    toast({
      title: "OTP Sent",
      description: "Please check your registered email for the OTP",
    });
    setOtpSent(true);
  };

  const handleResetPassword = () => {
    toast({
      title: "Password Reset Successful",
      description: "You can now log in with your new password",
    });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="reset-staffId">Staff ID</Label>
        <Input
          id="reset-staffId"
          type="text"
          placeholder="XX-XXXX-XXXX"
          value={staffId}
          onChange={handleStaffIdChange}
          maxLength={12}
          disabled={otpSent}
        />
      </div>

      {!otpSent ? (
        <Button onClick={handleSendOtp} className="w-full" disabled={!staffId}>
          Send OTP
        </Button>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleResetPassword}
            className="w-full"
            disabled={!otp || !newPassword}
          >
            Reset Password
          </Button>
        </>
      )}
    </div>
  );
};

export default Login;