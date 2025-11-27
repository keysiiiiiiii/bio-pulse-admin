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
import { CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { validateLeaveApplication } from '@/utils/leaveValidation';
import { staffApi } from '@/services/api/staffApi';

export const StaffLeaveForm = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveCredits, setLeaveCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  // Conditional leave details
  const [vacationLocation, setVacationLocation] = useState<"philippines" | "abroad" | "">("");
  const [vacationSpecify, setVacationSpecify] = useState("");
  const [sickLeaveType, setSickLeaveType] = useState<"hospital" | "outpatient" | "">("");
  const [sickLeaveSpecify, setSickLeaveSpecify] = useState("");
  const [studyLeaveType, setStudyLeaveType] = useState<"masters" | "bar_board" | "other" | "">("");
  const [studyLeaveSpecify, setStudyLeaveSpecify] = useState("");
  const [womenLeaveIllness, setWomenLeaveIllness] = useState("");
  const [monetizationPeriod, setMonetizationPeriod] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaveCredits = async () => {
      try {
        setLoadingCredits(true);
        const credits = await staffApi.getMyLeaveCredits();
        setLeaveCredits(credits.computed_credits || 0);
      } catch (error) {
        console.error("Failed to fetch leave credits:", error);
        setLeaveCredits(null);
      } finally {
        setLoadingCredits(false);
      }
    };

    if (user?.staff_id) {
      fetchLeaveCredits();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !leaveType || !reason) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    // Validate sick leave cannot be in the future
    if (leaveType === "sick") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedStartDate = new Date(startDate);
      selectedStartDate.setHours(0, 0, 0, 0);
      
      if (selectedStartDate > today) {
        toast({
          variant: "destructive",
          title: "Invalid Date",
          description: "Sick leave cannot be filed for future dates. You can only file sick leave for today or past dates.",
        });
        return;
      }
    }

    // ✅ ADD THIS VALIDATION
    const duration = differenceInDays(endDate, startDate) + 1;

    const validation = await validateLeaveApplication(
      user.staff_id,
      leaveType as 'sick' | 'vacation' | 'emergency',
      duration
    );

    if (!validation.canApply) {
      toast({
        variant: "destructive",
        title: "Cannot Apply for Leave",
        description: validation.message,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const duration = differenceInDays(endDate, startDate) + 1;

      // ✅ Prepare details object
      const details: any = {};

      if (leaveType === "study" && studyLeaveType) {
        details.study_leave_type = studyLeaveType;
        if (studyLeaveType === "other" && studyLeaveSpecify) {
          details.study_leave_specify = studyLeaveSpecify;
        }
      }

      if ((leaveType === "vacation" || leaveType === "privilege") && vacationLocation) {
        details.vacation_location = vacationLocation;
        if (vacationSpecify) details.vacation_specify = vacationSpecify;
      }

      if (leaveType === "sick" && sickLeaveType) {
        details.sick_leave_type = sickLeaveType;
        if (sickLeaveSpecify) details.sick_leave_specify = sickLeaveSpecify;
      }

      if (leaveType === "special" && womenLeaveIllness) {
        details.women_leave_illness = womenLeaveIllness;
      }

      if (leaveType === "monetization" && monetizationPeriod) {
        details.monetization_period = monetizationPeriod;
      }

      // ✅ Use FormData for file upload
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("staff_user_id", String(user.id));
        formData.append("staff_id", user.staff_id || "");
        formData.append("staff_name", user.name || "");
        formData.append("first_name", user.first_name || "");
        formData.append("middle_name", user.middle_name || "");
        formData.append("last_name", user.last_name || "");
        formData.append("date", format(startDate, "yyyy-MM-dd"));
        formData.append("start_date", format(startDate, "yyyy-MM-dd"));
        formData.append("end_date", format(endDate, "yyyy-MM-dd"));
        formData.append("num_days", String(duration));
        formData.append("leave_type", leaveType);
        formData.append("reason", reason);
        formData.append("details", JSON.stringify(details));

        console.log("📤 Submitting with file to /api/leaves/with-file");

        const response = await fetch("http://localhost:3001/api/leaves/with-file", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to submit leave request");
        }
      } else {
        // ✅ JSON submission without file
        const payload = {
          staff_user_id: user.id,
          staff_id: user.staff_id,
          staff_name: user.name,
          first_name: user.first_name || "",
          middle_name: user.middle_name || "",
          last_name: user.last_name || "",
          date: format(startDate, "yyyy-MM-dd"),
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          num_days: duration,
          leave_type: leaveType,
          reason: reason,
          details: details,
        };

        // ✅ Log activity
        await supabase.from("account_activity").insert({
          action: "leave_request_created",
          actor_staff_id: user.staff_id,
          actor_role: user.role || "staff",
          staff_id: user.staff_id,
          staff_user_id: user.id,
          details: {
            leave_type: leaveType,
            start_date: format(startDate, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd"),
            duration: differenceInDays(endDate, startDate) + 1,
            reason: reason
          }
        });

        console.log("📤 Submitting to /api/leaves:", payload);

        // ✅ Use backend API instead of Supabase client
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch("http://localhost:3001/api/leaves", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to submit leave request");
        }
      }

      toast({
        title: "✅ Leave Request Submitted",
        description: `Your ${leaveType} leave request has been submitted successfully.`,
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveType("");
      setReason("");
      setFile(null);
      setVacationLocation("");
      setVacationSpecify("");
      setSickLeaveType("");
      setSickLeaveSpecify("");
      setStudyLeaveType("");
      setStudyLeaveSpecify("");
      setWomenLeaveIllness("");
      setMonetizationPeriod("");

    } catch (error: any) {
      console.error("❌ Leave submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit leave request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
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
        <CardTitle className="flex items-center justify-between">
          <span>Request Leave</span>
          {loadingCredits ? (
            <span className="text-sm text-muted-foreground">Loading credits...</span>
          ) : (
            <span className="text-sm font-semibold text-primary">
              Available Leave Credits: {leaveCredits?.toFixed(2) || "0.00"} days
            </span>
          )}
        </CardTitle>
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
                    <SelectItem value="vacation">Vacation Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="emergency">Special Emergency (Calamity) Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                    <SelectItem value="paternity">Paternity Leave</SelectItem>
                    <SelectItem value="forced">Mandatory/Forced Leave</SelectItem>
                    <SelectItem value="privilege">Special Privilege Leave</SelectItem>
                    <SelectItem value="soloparent">Solo Parent Leave</SelectItem>
                    <SelectItem value="study">Study Leave</SelectItem>
                    <SelectItem value="vawc">10-Day VAWC Leave</SelectItem>
                    <SelectItem value="rehab">Rehabilitation Privilege</SelectItem>
                    <SelectItem value="special">Special Leave Benefits for Women</SelectItem>
                    <SelectItem value="adoption">Adoption Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Days</Label>
                <Input
                  type="text"
                  value={startDate && endDate ? differenceInDays(endDate, startDate) + 1 : ''}
                  placeholder="Select dates to calculate"
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Automatically calculated based on date range
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
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

            {/* Vacation/Privilege Leave Details */}
            {(leaveType === "vacation" || leaveType === "privilege") && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-semibold">6.B Details of Leave</Label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="philippines"
                        name="vacation-location"
                        checked={vacationLocation === "philippines"}
                        onChange={() => setVacationLocation("philippines")}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="philippines" className="font-normal cursor-pointer">
                        Within the Philippines (Specify location)
                      </Label>
                    </div>
                    {vacationLocation === "philippines" && (
                      <Input
                        placeholder="Specify province/city"
                        value={vacationSpecify}
                        onChange={(e) => setVacationSpecify(e.target.value)}
                        className="ml-6"
                      />
                    )}
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
                      <Label htmlFor="abroad" className="font-normal cursor-pointer">
                        Abroad (Specify country)
                      </Label>
                    </div>
                    {vacationLocation === "abroad" && (
                      <Input
                        placeholder="Specify country"
                        value={vacationSpecify}
                        onChange={(e) => setVacationSpecify(e.target.value)}
                        className="ml-6"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sick Leave Details */}
            {leaveType === "sick" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-semibold">6.B In case of Sick Leave</Label>
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
                      <Label htmlFor="hospital" className="font-normal cursor-pointer">
                        In Hospital (Specify Illness)
                      </Label>
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
                      <Label htmlFor="outpatient" className="font-normal cursor-pointer">
                        Out Patient (Specify Illness)
                      </Label>
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

            {/* Study Leave Details */}
            {leaveType === "study" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-semibold">6.B In case of Study Leave</Label>
                <Select value={studyLeaveType} onValueChange={(value: any) => setStudyLeaveType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select study leave purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masters">Completion of Master's Degree</SelectItem>
                    <SelectItem value="bar_board">BAR/Board Examination Review</SelectItem>
                    <SelectItem value="other">Other (Specify)</SelectItem>
                  </SelectContent>
                </Select>
                {studyLeaveType === "other" && (
                  <Input
                    placeholder="Specify other purpose"
                    value={studyLeaveSpecify}
                    onChange={(e) => setStudyLeaveSpecify(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Special Leave for Women */}
            {leaveType === "special" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-semibold">6.B Special Leave Benefits for Women</Label>
                <Input
                  placeholder="Specify illness"
                  value={womenLeaveIllness}
                  onChange={(e) => setWomenLeaveIllness(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Attachment </Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Upload medical certificate or supporting documents
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline">Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};