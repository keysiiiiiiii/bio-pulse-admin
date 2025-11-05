import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, LogOut } from "lucide-react";

interface PlaceholderDashboardProps {
  role: "ICTO" | "Faculty" | "Staff";
}

const PlaceholderDashboard = ({ role }: PlaceholderDashboardProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Universidad de Manila</h1>
              <p className="text-sm text-muted-foreground">Biometrics Attendance System</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Welcome, {role}!</CardTitle>
            <CardDescription className="text-lg">
              Your dashboard is being prepared
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="h-32 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-muted-foreground">
              The {role} dashboard interface is currently under development.
              <br />
              You have successfully logged in to the system.
            </p>
            <div className="pt-4">
              <Badge className="bg-success text-success-foreground">Login Successful</Badge>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${className}`}>
    {children}
  </span>
);

export default PlaceholderDashboard;
