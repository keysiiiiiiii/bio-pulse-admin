import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { leaveApi } from "@/services/api/leaveApi";

export const FacultyLeaveForm = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [numDays, setNumDays] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Conditional leave details
  const [vacationLocation, setVacationLocation] = useState<"philippines" | "abroad" | "">("");
  const [vacationSpecify, setVacationSpecify] = useState("");
  const [sickLeaveType, setSickLeaveType] = useState<"hospital" | "outpatient" | "">("");
  const [sickLeaveSpecify, setSickLeaveSpecify] = useState("");
  
  const { user } = useAuth();

  // inside the component, replace handleSubmit with:

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !leaveType || !reason) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Build leave details based on type
      const leaveDetails: any = {};
      if (leaveType === "vacation" || leaveType === "privilege") {
        leaveDetails.vacation_location = vacationLocation;
        leaveDetails.vacation_specify = vacationSpecify;
      }
      if (leaveType === "sick") {
        leaveDetails.sick_leave_type = sickLeaveType;
        leaveDetails.sick_leave_specify = sickLeaveSpecify;
      }

      const payload = {
        staff_user_id: user.id,
        staff_id: user.staff_id || user.id,
        staff_name: user.name,
        date: format(startDate, "yyyy-MM-dd"),
        reason,
        leave_type: leaveType,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        num_days: numDays || null,
        ...leaveDetails,
      };

      console.log("🧍 user:", user);

      if (file) {
        // multipart form
        const formData = new FormData();
        formData.append("file", file);
        formData.append('staff_id', String(user.staff_id || user.id));
        // append other fields
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) formData.append(k, String(v));
        });

        const res = await fetch("/api/leaves/with-file", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      } else {
        const res = await fetch("/api/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Create failed");
      }

      toast({
        title: "Leave Request Submitted",
        description: "Your leave request has been sent for approval",
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveType("");
      setReason("");
      setNumDays("");
      setFile(null);
      setVacationLocation("");
      setVacationSpecify("");
      setSickLeaveType("");
      setSickLeaveSpecify("");
    } catch (error) {
      console.error("submit leave error", error);
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Leave Form</h2>
        <p className="text-muted-foreground">Submit your leave request</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Leave</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">
                      Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules
                      Implementing E.O. No. 292)
                    </SelectItem>
                    <SelectItem value="sick">
                      Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing
                      E.O. No. 292)
                    </SelectItem>
                    <SelectItem value="emergency">
                      Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012,
                      as amended)
                    </SelectItem>
                    <SelectItem value="maternity">
                      Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE
                      and SSS)
                    </SelectItem>
                    <SelectItem value="paternity">
                      Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998,
                      as amended)
                    </SelectItem>
                    <SelectItem value="forced">
                      Mandatory/Forced Leave(Sec. 25, Rule XVI, Omnibus Rules
                      Implementing E.O. No. 292)
                    </SelectItem>
                    <SelectItem value="privilege">
                      Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules
                      Implementing E.O. No. 292)
                    </SelectItem>
                    <SelectItem value="soloparent">
                      Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)
                    </SelectItem>
                    <SelectItem value="study">
                      Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing
                      E.O. No. 292)
                    </SelectItem>
                    <SelectItem value="vawc">
                      10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)
                    </SelectItem>
                    <SelectItem value="rehab">
                      Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules
                      Implementing E.O. No. 292)
                    </SelectItem>
                    <SelectItem value="special">
                      Special Leave Benefits for Women (RA No. 9710 / CSC MC No.
                      25, s. 2010)
                    </SelectItem>
                    <SelectItem value="adoption">
                      Adoption Leave (R.A. No. 8552)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Days</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter number of days"
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Provide the reason for your leave request"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Conditional Fields for Vacation/Privilege Leave */}
            {(leaveType === "vacation" || leaveType === "privilege") && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-semibold">6.B Details of Leave - Vacation/Special Privilege</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="philippines"
                      name="vacation-location"
                      checked={vacationLocation === "philippines"}
                      onChange={() => setVacationLocation("philippines")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="philippines" className="font-normal cursor-pointer">Within the Philippines</Label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="abroad"
                        name="vacation-location"
                        checked={vacationLocation === "abroad"}
                        onChange={() => setVacationLocation("abroad")}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="abroad" className="font-normal cursor-pointer">Abroad (Specify)</Label>
                    </div>
                    {vacationLocation === "abroad" && (
                      <Input
                        placeholder="Specify country/location"
                        value={vacationSpecify}
                        onChange={(e) => setVacationSpecify(e.target.value)}
                        className="ml-6"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Fields for Sick Leave */}
            {leaveType === "sick" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-semibold">6.B Details of Leave - In case of Sick Leave</Label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="hospital"
                        name="sick-type"
                        checked={sickLeaveType === "hospital"}
                        onChange={() => setSickLeaveType("hospital")}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="hospital" className="font-normal cursor-pointer">In Hospital (Specify Illness)</Label>
                    </div>
                    {sickLeaveType === "hospital" && (
                      <Input
                        placeholder="Specify illness"
                        value={sickLeaveSpecify}
                        onChange={(e) => setSickLeaveSpecify(e.target.value)}
                        className="ml-6"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="outpatient"
                        name="sick-type"
                        checked={sickLeaveType === "outpatient"}
                        onChange={() => setSickLeaveType("outpatient")}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="outpatient" className="font-normal cursor-pointer">Out Patient (Specify Illness)</Label>
                    </div>
                    {sickLeaveType === "outpatient" && (
                      <Input
                        placeholder="Specify illness"
                        value={sickLeaveSpecify}
                        onChange={(e) => setSickLeaveSpecify(e.target.value)}
                        className="ml-6"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Attachment (Send files)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload medical certificate or supporting documents
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
