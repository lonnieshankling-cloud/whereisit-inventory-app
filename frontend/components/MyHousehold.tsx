import { useState, useEffect, ChangeEvent } from "react";
import { useBackend } from "@/lib/backend";
import type { GetHouseholdResponse } from "~backend/household/get";
import type { HouseholdInvitation } from "~backend/household/get_invitations";
import type { HouseholdMember } from "~backend/household/get_members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, RefreshCw, X, UserMinus } from "lucide-react";

export function MyHousehold() {
  const backend = useBackend();
  const [household, setHousehold] = useState<GetHouseholdResponse | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<HouseholdInvitation[]>([]);
  const [invitations, setInvitations] = useState<(HouseholdInvitation & { household_name: string })[]>([]);
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [resendingInvite, setResendingInvite] = useState<number | null>(null);
  const [cancelingInvite, setCancelingInvite] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      const response = await backend.household.get();
      setHousehold(response);

      if (!response.household) {
        const invitesResponse = await backend.household.getInvitations();
        const invitesWithNames = await Promise.all(
          invitesResponse.invitations.map(async (inv) => {
            const householdData = await backend.household.getHouseholdById({ household_id: inv.household_id });
            return { ...inv, household_name: householdData.name };
          })
        );
        setInvitations(invitesWithNames);
      } else {
        const membersResponse = await backend.household.getMembers();
        setMembers(membersResponse.members);

        if (response.household.owner_id === response.current_user_id) {
          const pendingResponse = await backend.household.getPendingInvitations();
          setPendingInvitations(pendingResponse.invitations);
        }
      }
    } catch (error) {
      console.error("Failed to load household", error);
      toast({
        title: "Error",
        description: "Failed to load household information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a household name",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const newHousehold = await backend.household.create({ name: householdName });
      setHousehold({ household: newHousehold, current_user_id: newHousehold.owner_id! });
      setMembers([{ id: newHousehold.owner_id!, created_at: newHousehold.created_at, is_owner: true }]);
      toast({
        title: "Success",
        description: "Household created successfully",
      });
    } catch (error) {
      console.error("Failed to create household", error);
      toast({
        title: "Error",
        description: "Failed to create household",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setInviting(true);
    try {
      await backend.household.invite({ invited_email: inviteEmail });
      setInviteEmail("");
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
      await loadHousehold();
    } catch (error) {
      console.error("Failed to send invitation", error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    setAccepting(invitationId);
    try {
      await backend.household.acceptInvitation({ invitation_id: invitationId });
      toast({
        title: "Success",
        description: "Invitation accepted successfully",
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to accept invitation", error);
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
      setAccepting(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingMember(userId);
    try {
      await backend.household.removeMember({ user_id: userId });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      await loadHousehold();
    } catch (error) {
      console.error("Failed to remove member", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setRemovingMember(null);
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    setResendingInvite(invitationId);
    try {
      await backend.household.resendInvitation({ invitation_id: invitationId });
      toast({
        title: "Success",
        description: "Invitation resent successfully",
      });
      await loadHousehold();
    } catch (error) {
      console.error("Failed to resend invitation", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setResendingInvite(null);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    setCancelingInvite(invitationId);
    try {
      await backend.household.cancelInvitation({ invitation_id: invitationId });
      toast({
        title: "Success",
        description: "Invitation cancelled successfully",
      });
      await loadHousehold();
    } catch (error) {
      console.error("Failed to cancel invitation", error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    } finally {
      setCancelingInvite(null);
    }
  };

  const handleLeaveHousehold = async () => {
    setLeaving(true);
    try {
      await backend.household.leave();
      toast({
        title: "Success",
        description: "You have left the household",
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to leave household", error);
      toast({
        title: "Error",
        description: "Failed to leave household",
        variant: "destructive",
      });
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isOwner = household?.household && household.household.owner_id === household.current_user_id;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Household</h1>

      {household?.household ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Household: {household.household.name}</CardTitle>
              <CardDescription>
                Created on {new Date(household.household.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Household Manager</CardTitle>
              <CardDescription>
                The owner and manager of this household
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{household.household.owner_id}</p>
                  {isOwner && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">You</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Members</CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? 's' : ''} in this household
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.id}</p>
                    {member.is_owner && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Owner</span>
                    )}
                    {member.id === household.current_user_id && !member.is_owner && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">You</span>
                    )}
                  </div>
                  {isOwner && !member.is_owner && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMember === member.id}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      {removingMember === member.id ? "Removing..." : "Remove"}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {isOwner && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Invite Members</CardTitle>
                  <CardDescription>
                    Invite others to join your household
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <Button onClick={handleSendInvite} disabled={inviting}>
                    {inviting ? "Sending..." : "Send Invite"}
                  </Button>
                </CardContent>
              </Card>

              {pendingInvitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>
                      {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{invitation.invited_email}</p>
                          <p className="text-sm text-muted-foreground">
                            Sent {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendingInvite === invitation.id}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {resendingInvite === invitation.id ? "Resending..." : "Resend"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={cancelingInvite === invitation.id}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {cancelingInvite === invitation.id ? "Canceling..." : "Cancel"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Leave Household</CardTitle>
                <CardDescription>
                  Remove yourself from this household
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleLeaveHousehold}
                  disabled={leaving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {leaving ? "Leaving..." : "Leave Household"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Invitations</CardTitle>
                <CardDescription>
                  You have been invited to join the following households
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invitations.map((invitation: any) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{invitation.household_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={accepting === invitation.id}
                    >
                      {accepting === invitation.id ? "Accepting..." : "Accept"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Create a Household</CardTitle>
              <CardDescription>
                You don't have a household yet. Create one to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">Household Name</Label>
                <Input
                  id="household-name"
                  value={householdName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setHouseholdName(e.target.value)}
                  placeholder="Enter household name"
                />
              </div>
              <Button onClick={handleCreateHousehold} disabled={creating}>
                {creating ? "Creating..." : "Create Household"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
