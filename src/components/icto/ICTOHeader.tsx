import logo from "@/assets/web_logo.png";

export function ICTOHeader() {
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="px-6 py-4 flex items-center gap-3">
        <img src={logo} alt="UDM Logo" className="h-8 w-8" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">ICTO Account Management</h1>
          <p className="text-sm text-muted-foreground">Universidad de Manila - Account Management</p>
        </div>
      </div>
    </header>
  );
}
