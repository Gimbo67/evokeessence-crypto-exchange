import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserGroup } from "@db/schema";

// Define permissions that can be granted to employees
const PERMISSIONS = [
  { id: "view_client_info", label: "View Client Information" },
  { id: "edit_client_info", label: "Edit Client Information" },
  { id: "view_transactions", label: "View Transactions" },
  { id: "edit_transactions", label: "Edit Transactions" },
  { id: "view_kyc", label: "View KYC Documents" },
  { id: "edit_kyc", label: "Edit KYC Status" },
  { id: "view_balances", label: "View Client Balances" },
  { id: "edit_balances", label: "Edit Client Balances" }
];

// User groups with their labels for the dropdown
const USER_GROUPS = [
  { value: UserGroup.KYC_EMPLOYEE, label: "KYC Specialist" },
  { value: UserGroup.FINANCE_EMPLOYEE, label: "Finance Officer" },
  { value: UserGroup.VIEWONLY_EMPLOYEE, label: "View Only" },
  { value: UserGroup.SECOND_RANK_ADMIN, label: "Second Rank Admin" }
];

interface Employee {
  id: number;
  username: string;
  fullName: string;
  email: string;
  userGroup: string;
  permissions: Record<string, boolean>;
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmployee, setNewEmployee] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    userGroup: "",
  });

  // Query employees with permissions
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/admin/employees"],
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      console.log('Creating employee:', { ...employeeData, password: '[REDACTED]' });
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create employee');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({
        title: "Success",
        description: "Employee account created successfully",
      });
      setNewEmployee({
        username: "",
        password: "",
        fullName: "",
        email: "",
        userGroup: "",
      });
    },
    onError: (error: Error) => {
      console.error('Error creating employee:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: number;
      permissions: Record<string, boolean>;
    }) => {
      const res = await fetch(`/api/admin/employees/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.userGroup) {
      toast({
        title: "Error",
        description: "Please select a role for the employee",
        variant: "destructive",
      });
      return;
    }
    createEmployeeMutation.mutate({
      ...newEmployee,
      isEmployee: true,
    });
  };

  const handlePermissionChange = (userId: number, permissionId: string, granted: boolean) => {
    const employee = employees.find(emp => emp.id === userId);
    if (!employee) return;

    const updatedPermissions = {
      ...employee.permissions,
      [permissionId]: granted,
    };

    updatePermissionsMutation.mutate({
      userId,
      permissions: updatedPermissions,
    });
  };

  return (
    <div className="container py-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Employee Account</CardTitle>
          <CardDescription>Add a new employee with specific permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newEmployee.username}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={newEmployee.fullName}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, fullName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newEmployee.userGroup}
                  onValueChange={(value) =>
                    setNewEmployee({ ...newEmployee, userGroup: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_GROUPS.map(group => (
                      <SelectItem key={group.value} value={group.value}>
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createEmployeeMutation.isPending}>
              {createEmployeeMutation.isPending ? "Creating..." : "Create Employee Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Permissions</CardTitle>
          <CardDescription>Manage access rights for each employee</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  {PERMISSIONS.map((perm) => (
                    <TableHead key={perm.id} className="text-center">
                      <div className="text-xs font-medium leading-none">
                        {perm.label}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.fullName}
                    </TableCell>
                    <TableCell>{USER_GROUPS.find(g => g.value === employee.userGroup)?.label || employee.userGroup}</TableCell>
                    {PERMISSIONS.map((perm) => (
                      <TableCell key={perm.id} className="text-center">
                        <Checkbox
                          checked={employee.permissions?.[perm.id] || false}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(employee.id, perm.id, checked as boolean)
                          }
                          disabled={updatePermissionsMutation.isPending}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={PERMISSIONS.length + 2} className="text-center">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}