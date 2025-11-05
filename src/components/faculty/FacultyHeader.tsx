import { GraduationCap } from "lucide-react";

export const FacultyHeader = () => {
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="px-6 py-4 flex items-center gap-3">
        <GraduationCap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Universidad de Manila</h1>
          <p className="text-sm text-muted-foreground">Faculty Dashboard</p>
        </div>
      </div>
    </header>
  );
};
