import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, AlertCircle, Settings, Eye } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/language-context";

interface KycUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  kycStatus: string;
  sumsubApplicantId?: string;
  sumsubReviewStatus?: string;
  sumsubReviewResult?: string;
  manualOverrideEnabled: boolean;
  manualOverrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

export function KycManagement() {
  const [users, setUsers] = useState<KycUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'toggle_override'>('approve');
  const { toast } = useToast();
  const t = useTranslations();

  useEffect(() => {
    fetchKycUsers();
  }, []);

  const fetchKycUsers = async () => {
    try {
      const response = await fetch('/api/admin/kyc-users', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch KYC users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching KYC users:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualDecision = async (userId: number, status: 'approved' | 'rejected', reason: string) => {
    try {
      const response = await fetch(`/api/kyc/manual-decision/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to update KYC status');
      }

      toast({
        title: "Success",
        description: `KYC status updated to ${status}`,
        variant: "default"
      });

      // Refresh the user list
      fetchKycUsers();
      setShowReasonDialog(false);
      setReason('');
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleOverride = async (userId: number, enabled: boolean, reason: string) => {
    try {
      const response = await fetch(`/api/kyc/manual-override/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ enabled, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle manual override');
      }

      toast({
        title: "Success",
        description: `Manual override ${enabled ? 'enabled' : 'disabled'}`,
        variant: "default"
      });

      // Refresh the user list
      fetchKycUsers();
      setShowReasonDialog(false);
      setReason('');
    } catch (error) {
      console.error('Error toggling manual override:', error);
      toast({
        title: "Error",
        description: "Failed to toggle manual override. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openReasonDialog = (user: KycUser, action: 'approve' | 'reject' | 'toggle_override') => {
    setSelectedUser(user);
    setActionType(action);
    setShowReasonDialog(true);
    setReason('');
  };

  const handleDialogSubmit = () => {
    if (!selectedUser) return;

    switch (actionType) {
      case 'approve':
        handleManualDecision(selectedUser.id, 'approved', reason);
        break;
      case 'reject':
        handleManualDecision(selectedUser.id, 'rejected', reason);
        break;
      case 'toggle_override':
        handleToggleOverride(selectedUser.id, !selectedUser.manualOverrideEnabled, reason);
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getSumsubBadge = (reviewStatus?: string, reviewResult?: string) => {
    if (!reviewStatus) return <Badge variant="outline">No SumSub Data</Badge>;
    
    if (reviewStatus === 'completed' && reviewResult) {
      switch (reviewResult) {
        case 'GREEN':
          return <Badge className="bg-green-100 text-green-800">✓ GREEN</Badge>;
        case 'RED':
          return <Badge className="bg-red-100 text-red-800">✗ RED</Badge>;
        case 'YELLOW':
          return <Badge className="bg-yellow-100 text-yellow-800">⚠ YELLOW</Badge>;
        default:
          return <Badge variant="outline">{reviewResult}</Badge>;
      }
    }
    
    return <Badge variant="outline">{reviewStatus}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KYC Management</CardTitle>
          <CardDescription>Loading KYC users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>KYC Management</CardTitle>
          <CardDescription>
            Manage user KYC verification status and manual overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>SumSub Status</TableHead>
                  <TableHead>Manual Override</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.fullName || user.username}</div>
                        <div className="text-sm text-gray-500">ID: {user.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getStatusBadge(user.kycStatus)}</TableCell>
                    <TableCell>{getSumsubBadge(user.sumsubReviewStatus, user.sumsubReviewResult)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.manualOverrideEnabled}
                          onCheckedChange={() => openReasonDialog(user, 'toggle_override')}
                        />
                        <Label className="text-sm">
                          {user.manualOverrideEnabled ? 'Enabled' : 'Disabled'}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReasonDialog(user, 'approve')}
                          disabled={user.kycStatus === 'approved'}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReasonDialog(user, 'reject')}
                          disabled={user.kycStatus === 'rejected'}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        {user.sumsubApplicantId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://cockpit.sumsub.com/checkus/#/applicant/${user.sumsubApplicantId}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve KYC Verification'}
              {actionType === 'reject' && 'Reject KYC Verification'}
              {actionType === 'toggle_override' && 'Toggle Manual Override'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReasonDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDialogSubmit}>
                {actionType === 'approve' && 'Approve'}
                {actionType === 'reject' && 'Reject'}
                {actionType === 'toggle_override' && 'Toggle Override'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KycManagement;