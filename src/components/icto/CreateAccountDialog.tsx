// src/components/admin/CreateAccountDialog.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { staffApi } from '@/services/api/staffApi';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';

// Department lists
const collegeDepartments = [
  { value: 'CCS', label: 'CCS - College of Computing Studies' },
  { value: 'CHS', label: 'CHS - College of Health Sciences' },
  { value: 'CCJ', label: 'CCJ - College of Criminal Justice' },
  { value: 'CED', label: 'CED - College of Education' },
  { value: 'NSTP', label: 'NSTP - National Service Training Program' },
  { value: 'GenEd', label: 'Gen Ed - General Education' },
  { value: 'CBPM', label: 'CBPM - College of Business and Public Management' },
  { value: 'CL', label: 'CL - College of Law' },
  { value: 'CAS', label: 'CAS - College of Arts and Sciences' },
];

const staffDepartments = [
  'Clinic',
  'Security',
  'Canteen',
  'Library',
  'Cleaning Service',
  'Human Resource (HR)',
  'Registrar',
];

const roles = [
  'Faculty',
  'Staff',
  'ICTO',
  'Admin',
  'Vice President',
];

// FIXED: Allow 2-6 characters for prefix (not full ID format)
const schema = z.object({
  staff_id_prefix: z.string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(6, 'Prefix must be at most 6 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Prefix must contain only letters and numbers'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().min(1, 'Role is required'),
  department: z.string().min(1, 'Department is required'),
  contact_number: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      staff_id_prefix: '11',
      password: 'default123',
    },
  });

  const roleValue = watch('role');

  // Determine which department list to show
  const departmentList =
    roleValue === 'Faculty' ? collegeDepartments : staffDepartments;

  // Helper: Normalize department text from AI
  const normalizeDepartment = (rawText: string, role: string): string => {
    const text = rawText.toLowerCase().trim();
    
    if (role === 'Faculty') {
      // Map to college codes
      if (text.includes('comput') || text === 'ccs') return 'CCS';
      if (text.includes('health') || text === 'chs') return 'CHS';
      if (text.includes('criminal') || text.includes('justice') || text === 'ccj') return 'CCJ';
      if (text.includes('education') || text === 'ced') return 'CED';
      if (text.includes('national') || text.includes('service') || text.includes('nstp')) return 'NSTP';
      if (text.includes('gen') && text.includes('ed')) return 'GenEd';
      if (text.includes('business') || text.includes('public') || text.includes('management') || text.includes('cbpm')) return 'CBPM';
      if (text.includes('law') || text === 'cl') return 'CL';
      if (text.includes('arts') || text.includes('science') || text === 'cas') return 'CAS';
    } else if (role === 'Staff') {
      // Map to staff departments
      if (text.includes('clinic')) return 'Clinic';
      if (text.includes('security')) return 'Security';
      if (text.includes('canteen')) return 'Canteen';
      if (text.includes('library')) return 'Library';
      if (text.includes('clean')) return 'Cleaning Service';
      if (text.includes('hr') || text.includes('human') || text.includes('resource')) return 'Human Resource (HR)';
      if (text.includes('registrar')) return 'Registrar';
    }
    
    return rawText; // Return as-is if no match
  };

  // AI Scan Handler - FIXED
  const handleAiScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload an image file (PNG or JPG)',
      });
      return;
    }

    setIsScanning(true);
    toast({
      title: '🔍 Scanning Image...',
      description: 'AI is reading the document. Please wait.',
    });

    try {
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('image', file);

      console.log('📤 Sending image to Groq API...');

      // Call the API
      const data = await staffApi.scanAccountForm(formData);

      console.log('✅ Groq API response:', data);

      // Fill the form with AI-extracted data
      if (data.name) {
        console.log('Setting name:', data.name);
        setValue('name', data.name);
      }
      
      if (data.email) {
        console.log('Setting email:', data.email);
        setValue('email', data.email);
      }
      
      if (data.phone) {
        console.log('Setting phone:', data.phone);
        setValue('contact_number', data.phone);
      }

      // Extract just the prefix from faculty_number (e.g., "11" from "11-2025-0001")
      if (data.faculty_number) {
        const prefixMatch = data.faculty_number.match(/^([A-Za-z0-9]{2,6})/);
        const prefix = prefixMatch ? prefixMatch[1] : data.faculty_number;
        console.log('Setting staff_id_prefix:', prefix);
        setValue('staff_id_prefix', prefix);
      }

      // Determine role from AI data
      let detectedRole = data.role || '';
      const deptText = (data.department || '').toLowerCase();
      
      console.log('Detected role:', detectedRole, 'Department text:', deptText);

      // Smart role detection
      if (deptText.includes('college') || deptText.includes('ccs') || 
          deptText.includes('cas') || deptText.includes('chs') ||
          deptText.includes('ccj') || deptText.includes('cbpm') || 
          deptText.includes('ced') || deptText.includes('nstp') ||
          deptText.includes('gen ed') || deptText.includes('law') || deptText.includes('cl')) {
        detectedRole = 'Faculty';
      } else if (deptText.includes('canteen') || deptText.includes('clean') ||
                 deptText.includes('clinic') || deptText.includes('library') ||
                 deptText.includes('security') || deptText.includes('registrar') ||
                 deptText.includes('hr') || deptText.includes('human resource')) {
        detectedRole = 'Staff';
      } else if (detectedRole.toLowerCase().includes('faculty')) {
        detectedRole = 'Faculty';
      } else if (detectedRole.toLowerCase().includes('staff')) {
        detectedRole = 'Staff';
      }

      // Set role if detected
      if (detectedRole && roles.includes(detectedRole)) {
        console.log('Setting role:', detectedRole);
        setValue('role', detectedRole);
      }

      // Set department after role is determined
      if (data.department && detectedRole) {
        const normalized = normalizeDepartment(data.department, detectedRole);
        console.log('Setting department:', normalized);
        setValue('department', normalized);
      }

      toast({
        title: '✅ Scan Complete!',
        description: 'Form fields have been populated. Please verify the information.',
      });
    } catch (err) {
      console.error('❌ AI Scan Error:', err);
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: (err as Error).message || 'Failed to scan the image. Please check console for details.',
      });
    } finally {
      setIsScanning(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      console.log('📝 Creating account with data:', data);

      // Map role to employee_type and prepare department
      let employee_type = data.role;
      let department = data.department;

      // For Faculty, use the full college name
      if (data.role === 'Faculty') {
        const college = collegeDepartments.find(c => c.value === data.department);
        if (college) {
          department = college.label;
        }
      }

      const payload = {
        staff_id_prefix: data.staff_id_prefix,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        employee_type: employee_type,
        department: department,
        contact_number: data.contact_number || null,
      };

      console.log('📤 Sending payload to API:', payload);

      const result = await staffApi.create(payload);
      
      console.log('✅ Account created:', result);

      toast({
        title: '✅ Account Created Successfully',
        description: `Created account for ${data.name} with ID ${result.staff_id}.${result.device_pin ? ` Biometric PIN: ${result.device_pin}` : ''}`,
      });
      
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('❌ Create account error:', err);
      toast({
        variant: 'destructive',
        title: 'Error Creating Account',
        description: (err as Error).message || 'Failed to create account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            Fill in the details manually or upload an ID/form to scan automatically.
          </DialogDescription>
        </DialogHeader>

        {/* AI SCAN UPLOAD - FIXED */}
        <div className="space-y-2 border-b pb-4 bg-muted/50 p-4 rounded-lg">
          <Label htmlFor="ai-scan" className="text-base font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Scan ID or Form (Optional)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="ai-scan"
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleAiScan}
              disabled={isScanning || isSubmitting}
              className="flex-1"
            />
            {isScanning && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
          </div>
          {isScanning && (
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI is scanning the document... please wait.</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Upload an ID card or form image. AI will automatically extract and fill the form fields.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Staff ID Prefix - FIXED */}
          <div className="space-y-2">
            <Label htmlFor="staff_id_prefix">
              Staff ID Prefix <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff_id_prefix"
              placeholder="e.g., 11, 69, ABC (2-6 characters)"
              {...register('staff_id_prefix')}
              disabled={isSubmitting || isScanning}
              maxLength={6}
            />
            {errors.staff_id_prefix && (
              <p className="text-sm text-destructive">{errors.staff_id_prefix.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter 2-6 character prefix. Full ID will be auto-generated as: <strong>PREFIX-2025-0001</strong>
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Juan Dela Cruz"
              {...register('name')}
              disabled={isSubmitting || isScanning}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="juan.delacruz@example.com"
              {...register('email')}
              disabled={isSubmitting || isScanning}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              {...register('password')}
              disabled={isSubmitting || isScanning}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue('department', ''); // Reset department when role changes
                  }}
                  value={field.value}
                  disabled={isSubmitting || isScanning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <>
                  {roleValue === 'Faculty' ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || isScanning}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a college" />
                      </SelectTrigger>
                      <SelectContent>
                        {collegeDepartments.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : roleValue === 'Staff' ? (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || isScanning}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      {...field}
                      placeholder="Enter department"
                      disabled={isSubmitting || isScanning}
                    />
                  )}
                </>
              )}
            />
            {errors.department && (
              <p className="text-sm text-destructive">{errors.department.message}</p>
            )}
          </div>

          {/* Contact Number (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number (Optional)</Label>
            <Input
              id="contact_number"
              placeholder="09XX XXX XXXX"
              {...register('contact_number')}
              disabled={isSubmitting || isScanning}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting || isScanning}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isScanning}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}