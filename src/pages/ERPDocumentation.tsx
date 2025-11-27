import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download, FileText, Database, Workflow, Network } from "lucide-react";

const ERPDocumentation = () => {
  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              System Architecture & ERP Flows
            </h1>
            <p className="text-muted-foreground">
              Biometric Attendance System - Enterprise Resource Planning Documentation
            </p>
          </div>
          <div className="flex gap-3 print:hidden">
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tech Stack Info */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
            <CardDescription>Core technologies powering the attendance system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold text-foreground mb-1">Frontend</h4>
                <p className="text-sm text-muted-foreground">Vite + React + Tailwind CSS</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold text-foreground mb-1">Backend</h4>
                <p className="text-sm text-muted-foreground">Node.js + Express</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold text-foreground mb-1">Database</h4>
                <p className="text-sm text-muted-foreground">Supabase (PostgreSQL)</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-semibold text-foreground mb-1">Hardware</h4>
                <p className="text-sm text-muted-foreground">ZKTeco Biometric Device</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">ERP Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Modular decomposition showing HR, Attendance, Leave, and Analytics modules
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <Database className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Data Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Biometric device to database synchronization and dashboard visualization
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <Workflow className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Leave Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete approval process from request submission to credit deduction
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <Network className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete system infrastructure from client to external devices
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Diagram 1: ERP Modular Decomposition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              1. ERP Modular Decomposition Diagram
            </CardTitle>
            <CardDescription>Core modules of the attendance system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-8 rounded-lg space-y-6">
              {/* Central System */}
              <div className="text-center">
                <div className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-lg font-bold text-lg shadow-lg">
                  Biometric Attendance System
                </div>
              </div>

              {/* Main Modules */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* HR Module */}
                <div className="bg-card p-4 rounded-lg border-2 border-blue-500 shadow">
                  <h3 className="font-bold text-blue-600 mb-3">Human Resource Module</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Personnel List Management</li>
                    <li>• Role Management</li>
                    <li className="ml-4">- Admin</li>
                    <li className="ml-4">- ICTO</li>
                    <li className="ml-4">- Faculty</li>
                    <li className="ml-4">- Staff</li>
                    <li>• Department Assignment</li>
                  </ul>
                </div>

                {/* Attendance Module */}
                <div className="bg-card p-4 rounded-lg border-2 border-green-500 shadow">
                  <h3 className="font-bold text-green-600 mb-3">Attendance & Timekeeping</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="font-semibold text-foreground">Inputs:</li>
                    <li>• Biometric Device Logs</li>
                    <li>• Manual DTR Entry</li>
                    <li className="font-semibold text-foreground mt-2">Outputs:</li>
                    <li>• Daily Time Records</li>
                    <li>• Tardiness Reports</li>
                  </ul>
                </div>

                {/* Leave Module */}
                <div className="bg-card p-4 rounded-lg border-2 border-purple-500 shadow">
                  <h3 className="font-bold text-purple-600 mb-3">Leave Management</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="font-semibold text-foreground">Process:</li>
                    <li>1. File Leave Request</li>
                    <li>2. Admin Review</li>
                    <li>3. Approval/Disapproval</li>
                    <li>4. Update Leave Credits</li>
                  </ul>
                </div>

                {/* Analytics Module */}
                <div className="bg-card p-4 rounded-lg border-2 border-orange-500 shadow">
                  <h3 className="font-bold text-orange-600 mb-3">Analytics & Reporting</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="font-semibold text-foreground">Features:</li>
                    <li>• Predictive Forecasting</li>
                    <li>• Monthly Trends Analysis</li>
                    <li>• Absences Heatmap</li>
                    <li>• Performance Metrics</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagram 2: Biometric Data Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              2. Biometric Data Flow Diagram
            </CardTitle>
            <CardDescription>End-to-end data flow from device to dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-8 rounded-lg">
              <div className="flex flex-col space-y-4">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold min-w-[200px] text-center shadow">
                    ZKTeco Device
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <p className="text-sm text-muted-foreground">Captures fingerprint logs</p>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold min-w-[200px] text-center shadow">
                    Node.js Poller
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <p className="text-sm text-muted-foreground">Fetches logs via device IP</p>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold min-w-[200px] text-center shadow">
                    Data Processing
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <p className="text-sm text-muted-foreground">Matches staff_id with user profile</p>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold min-w-[200px] text-center shadow">
                    Supabase Database
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <p className="text-sm text-muted-foreground">Stores in attendance_logs table</p>
                </div>

                {/* Step 5 */}
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold min-w-[200px] text-center shadow">
                    Admin Dashboard
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <p className="text-sm text-muted-foreground">API requests for visualization</p>
                </div>

                {/* Step 6 */}
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold min-w-[200px] text-center shadow">
                    DTR & Reports
                  </div>
                  <div className="text-2xl text-muted-foreground">✓</div>
                  <p className="text-sm text-muted-foreground">Generated for users and analytics</p>
                </div>
              </div>

              {/* Parallel Flow */}
              <div className="mt-6 p-4 bg-card rounded-lg border-2 border-dashed border-primary">
                <p className="text-sm font-semibold mb-2">Parallel User Access:</p>
                <p className="text-sm text-muted-foreground">Staff and Faculty portals can view their own records in real-time through the same database connection</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagram 3: Leave Request Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              3. Leave Request Workflow
            </CardTitle>
            <CardDescription>Complete leave management process flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-8 rounded-lg space-y-6">
              {/* User Actions */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-bold text-foreground mb-3">👤 User (Faculty/Staff)</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Fill leave form with details</li>
                  <li>2. Select date range</li>
                  <li>3. Attach supporting documents</li>
                  <li>4. Submit request</li>
                </ol>
              </div>

              {/* System Processing */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-bold text-foreground mb-3">⚙️ System Processing</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Save request to Supabase database</li>
                  <li>2. Set status to <span className="font-semibold text-yellow-600">PENDING</span></li>
                  <li>3. Send notification to Admin panel</li>
                  <li>4. Log entry in leave history</li>
                </ol>
              </div>

              {/* Admin Actions */}
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-bold text-foreground mb-3">👨‍💼 Administrator</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. View request in Leave Requests panel</li>
                  <li>2. Review details and attachments</li>
                  <li>3. Make decision:</li>
                  <li className="ml-6">→ <span className="font-semibold text-green-600">APPROVE</span> with remarks</li>
                  <li className="ml-6">→ <span className="font-semibold text-red-600">DISAPPROVE</span> with reason</li>
                </ol>
              </div>

              {/* Final Processing */}
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-bold text-foreground mb-3">📊 Final Processing</h4>
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded">
                    <p className="font-semibold text-green-700 dark:text-green-300 mb-1">If Approved:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Deduct leave credits from user_accounts</li>
                      <li>• Mark calendar days as on leave (blue indicator)</li>
                      <li>• Send approval notification to user</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded">
                    <p className="font-semibold text-red-700 dark:text-red-300 mb-1">If Disapproved:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Keep leave credits intact</li>
                      <li>• Send disapproval notification with reason</li>
                      <li>• No calendar changes made</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagram 4: System Architecture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              4. System Architecture Diagram
            </CardTitle>
            <CardDescription>Complete system infrastructure and connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-8 rounded-lg space-y-6">
              {/* Client Layer */}
              <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg border-2 border-blue-500">
                <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-4">💻 Client Layer</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-card p-3 rounded shadow text-center text-sm">Admin Dashboard</div>
                  <div className="bg-card p-3 rounded shadow text-center text-sm">Faculty Portal</div>
                  <div className="bg-card p-3 rounded shadow text-center text-sm">Staff Portal</div>
                  <div className="bg-card p-3 rounded shadow text-center text-sm">ICTO Panel</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">React + Vite + Tailwind CSS (Desktop & Mobile)</p>
              </div>

              <div className="text-center text-2xl text-muted-foreground">↕️</div>

              {/* Application Server */}
              <div className="bg-green-50 dark:bg-green-950 p-6 rounded-lg border-2 border-green-500">
                <h4 className="font-bold text-green-700 dark:text-green-300 mb-4">🔧 Application Server</h4>
                <div className="space-y-2">
                  <div className="bg-green-500 text-white p-3 rounded shadow font-semibold text-center">
                    Node.js + Express API
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-card p-2 rounded text-sm text-center">Auth Middleware</div>
                    <div className="bg-card p-2 rounded text-sm text-center">Route Handlers</div>
                    <div className="bg-card p-2 rounded text-sm text-center">Biometric Poller</div>
                  </div>
                </div>
              </div>

              <div className="text-center text-2xl text-muted-foreground">↕️</div>

              {/* Data Layer */}
              <div className="bg-yellow-50 dark:bg-yellow-950 p-6 rounded-lg border-2 border-yellow-500">
                <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-4">🗄️ Data Layer</h4>
                <div className="space-y-3">
                  <div className="bg-blue-500 text-white p-3 rounded shadow font-semibold text-center">
                    Supabase (PostgreSQL)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card p-2 rounded text-sm">
                      <p className="font-semibold mb-1">Tables:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• staff_users</li>
                        <li>• attendance_logs</li>
                        <li>• user_accounts</li>
                        <li>• leave_requests</li>
                      </ul>
                    </div>
                    <div className="bg-card p-2 rounded text-sm">
                      <p className="font-semibold mb-1">Storage:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• DTR Files</li>
                        <li>• User Avatars</li>
                        <li>• Leave Attachments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-2xl text-muted-foreground">↔️</div>

              {/* External Systems */}
              <div className="bg-red-50 dark:bg-red-950 p-6 rounded-lg border-2 border-red-500">
                <h4 className="font-bold text-red-700 dark:text-red-300 mb-4">🔌 External Systems</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-500 text-white p-3 rounded shadow">
                    <p className="font-semibold">ZKTeco Biometric Device</p>
                    <p className="text-xs mt-1">Connected via Local Network IP</p>
                    <p className="text-xs">Real-time & Polling Mode</p>
                  </div>
                  <div className="bg-card p-3 rounded shadow">
                    <p className="font-semibold text-foreground">Google Drive Sync</p>
                    <p className="text-xs text-muted-foreground mt-1">Optional backup service</p>
                    <p className="text-xs text-muted-foreground">For DTR files and reports</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                This documentation was generated for the Biometric Attendance System.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                For updates or modifications, contact the system administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ERPDocumentation;
