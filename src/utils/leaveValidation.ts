import { staffApi } from '@/services/api/staffApi';

export interface LeaveValidationResult {
  canApply: boolean;
  message?: string;
  remainingCredits?: number;
}

export async function validateLeaveApplication(
  staff_id: string,
  leaveType: 'sick' | 'vacation' | 'emergency',
  days: number
): Promise<LeaveValidationResult> {
  try {
    const credits = await staffApi.getMyLeaveCredits();

    if (!credits.leave_eligible) {
      return {
        canApply: false,
        message: 'Your leave credits are not activated. Please contact HR.',
      };
    }

    const remaining = credits.computed_credits || 0;

    // Emergency leave doesn't require balance check
    if (leaveType === 'emergency') {
      return { canApply: true, remainingCredits: remaining };
    }

    // Check if sufficient balance for sick/vacation leave
    if (days > remaining) {
      return {
        canApply: false,
        message: `Insufficient leave balance. You have ${remaining.toFixed(2)} days remaining, but requested ${days} days.`,
        remainingCredits: remaining,
      };
    }

    return { canApply: true, remainingCredits: remaining };
  } catch (error) {
    console.error('Leave validation error:', error);
    return {
      canApply: false,
      message: 'Failed to validate leave credits. Please try again.',
    };
  }
}