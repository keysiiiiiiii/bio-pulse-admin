import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, UserPlus } from "lucide-react";
import { PasswordResetDialog } from "./PasswordResetDialog";
import { CreateAccountDialog } from "./CreateAccountDialog";

interface AccountToolsProps {
  selectedUser: any;
}

export function AccountTools({ selectedUser }: AccountToolsProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Tools</CardTitle>
        <CardDescription>
          Manage user accounts and credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <KeyRound className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Password Reset</CardTitle>
                  <CardDescription className="mt-1">
                    Generate a temporary password for the selected account. The user will be forced to change it at next login.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setResetDialogOpen(true)}
                disabled={!selectedUser}
                variant="outline"
                className="w-full"
              >
                Set Password to Default
              </Button>
              {!selectedUser && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Select a user from the list to reset their password
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Create Account</CardTitle>
                  <CardDescription className="mt-1">
                    Register a new university account. Saved to the central database and appears in this panel.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="w-full"
              >
                Create New Account
              </Button>
            </CardContent>
          </Card>
        </div>

        <PasswordResetDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          user={selectedUser}
        />

        <CreateAccountDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            // Refresh user list or handle success
            setCreateDialogOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
}
