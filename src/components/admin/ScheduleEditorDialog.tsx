import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { scheduleApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Copy, Trash2 } from "lucide-react";

interface ScheduleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: {
    id: string;
    name: string;
    staffId: string;
  };
  existingSchedule?: any[];
  onSuccess: () => void;
}

const DAYS = [
  { name: "Monday", value: 1 },
  { name: "Tuesday", value: 2 },
  { name: "Wednesday", value: 3 },
  { name: "Thursday", value: 4 },
  { name: "Friday", value: 5 },
  { name: "Saturday", value: 6 },
  { name: "Sunday", value: 0 },
];

export function ScheduleEditorDialog({ 
  open, 
  onOpenChange, 
  personnel, 
  existingSchedule = [],
  onSuccess 
}: ScheduleEditorDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<{ [key: number]: { enabled: boolean; time_in: string; time_out: string } }>({});

  useEffect(() => {
    if (open) {
      // Initialize schedule state
      const initialSchedule: any = {};
      DAYS.forEach(day => {
        const existing = existingSchedule.find(s => s.day_of_week === day.value);
        initialSchedule[day.value] = existing
          ? { enabled: true, time_in: existing.time_in, time_out: existing.time_out }
          : { enabled: false, time_in: "08:00", time_out: "17:00" };
      });
      setSchedule(initialSchedule);
    }
  }, [open, existingSchedule]);

  const handleDayToggle = (dayValue: number, checked: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], enabled: checked }
    }));
  };

  const handleTimeChange = (dayValue: number, field: 'time_in' | 'time_out', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], [field]: value }
    }));
  };

  const handleCopyToAll = () => {
    const mondaySchedule = schedule[1];
    if (!mondaySchedule) return;

    const newSchedule = { ...schedule };
    DAYS.forEach(day => {
      if (newSchedule[day.value].enabled) {
        newSchedule[day.value] = {
          ...newSchedule[day.value],
          time_in: mondaySchedule.time_in,
          time_out: mondaySchedule.time_out,
        };
      }
    });
    setSchedule(newSchedule);
    toast({ title: "Times copied to all checked days" });
  };

  const handleRemoveDay = (dayValue: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], enabled: false }
    }));
  };

  const validateSchedule = () => {
    const enabledDays = Object.entries(schedule).filter(([_, s]) => s.enabled);
    
    if (enabledDays.length === 0) {
      toast({ 
        title: "No days selected", 
        description: "Please select at least one day",
        variant: "destructive" 
      });
      return false;
    }

    for (const [day, s] of enabledDays) {
      if (!s.time_in || !s.time_out) {
        toast({ 
          title: "Invalid time", 
          description: "All enabled days must have time in and time out",
          variant: "destructive" 
        });
        return false;
      }

      // Validate time_out is after time_in
      const [inH, inM] = s.time_in.split(':').map(Number);
      const [outH, outM] = s.time_out.split(':').map(Number);
      if (outH < inH || (outH === inH && outM <= inM)) {
        const dayName = DAYS.find(d => d.value === Number(day))?.name;
        toast({ 
          title: "Invalid time range", 
          description: `${dayName}: Time out must be after time in`,
          variant: "destructive" 
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateSchedule()) return;

    setLoading(true);
    try {
      const schedules = Object.entries(schedule)
        .filter(([_, s]) => s.enabled)
        .map(([day, s]) => ({
          day_of_week: Number(day),
          time_in: s.time_in,
          time_out: s.time_out,
        }));

      await scheduleApi.saveSchedule({
        staff_user_id: Number(personnel.id),
        schedules,
        created_by_staff_id: user?.staff_id || '',
      });

      toast({ 
        title: "Schedule saved successfully",
        description: `Work schedule set for ${personnel.name}` 
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast({ 
        title: "Failed to save schedule",
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Work Schedule for {personnel.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {DAYS.map((day) => (
            <div key={day.value} className="flex items-center gap-4">
              <div className="flex items-center space-x-2 w-32">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={schedule[day.value]?.enabled || false}
                  onCheckedChange={(checked) => handleDayToggle(day.value, checked as boolean)}
                />
                <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                  {day.name}
                </Label>
              </div>

              <Input
                type="time"
                value={schedule[day.value]?.time_in || "08:00"}
                onChange={(e) => handleTimeChange(day.value, 'time_in', e.target.value)}
                disabled={!schedule[day.value]?.enabled}
                className="w-32"
              />

              <span className="text-muted-foreground">-</span>

              <Input
                type="time"
                value={schedule[day.value]?.time_out || "17:00"}
                onChange={(e) => handleTimeChange(day.value, 'time_out', e.target.value)}
                disabled={!schedule[day.value]?.enabled}
                className="w-32"
              />

              {day.value === 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToAll}
                  disabled={!schedule[day.value]?.enabled}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy to All
                </Button>
              )}

              {day.value !== 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDay(day.value)}
                  disabled={!schedule[day.value]?.enabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p>💡 <strong>Tip:</strong> Check days to set schedule. Use "Copy to All" to apply Monday's time to all checked days.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
