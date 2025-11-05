import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function PasswordResetDialog({ open, onOpenChange, user }: PasswordResetDialogProps) {
  const { toast } = useToast();

  const handleReset = () => {
    // TODO: API call to reset password
    toast({
      title: "Password Reset Successful",
      description: `Password for ${user?.name} has been reset to 'default123'`,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password</AlertDialogTitle>
          <AlertDialogDescription>
            Do you want to reset the password for <strong>{user?.name}</strong>'s account?
            <br />
            <br />
            The account password will become <strong>'default123'</strong>.
            <br />
            The user will be required to change this password on their next login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
