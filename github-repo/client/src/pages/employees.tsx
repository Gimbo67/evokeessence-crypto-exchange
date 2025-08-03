import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Loader2, RefreshCw, Key, Trash2 } from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { permissionGroups, PermissionType, getAllPermissionTypes } from "@/types/permission";

// Define the user groups based on backend implementation
const USER_GROUPS = [
  { id: "kyc_employee", label: "KYC Specialist" },
  { id: "finance_emp", label: "Financial Operations" },
  { id: "viewonly_employee", label: "View-Only Employee" },
  { id: "second_admin", label: "Secondary Admin" },
];

interface Permission {
  permissionType: string;
  granted: boolean;
}

interface Employee {
  id: number;
  username: string;
  fullName: string;
  email: string;
  userGroup: string;
  status?: string;
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
    permissions: {} as Record<string, boolean>
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  // Track loading state for each permission checkbox
  const [loadingPermissions, setLoadingPermissions] = useState<{
    [key: string]: boolean;
  }>({});

  // Query employees with permissions
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/employees"],
    queryFn: async () => {
      const res = await fetch("/api/admin/employees", {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch employees");
      }
      
      const data = await res.json();
      return data.employees || [];
    }
  });

  const employees: Employee[] = data || [];

  // Mutation for creating employee
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create employee");
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
        permissions: {}
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

  // Mutation for updating permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({
      userId,
      permissionType,
      granted,
    }: {
      userId: number;
      permissionType: string;
      granted: boolean;
    }) => {
      const loadingKey = `${userId}-${permissionType}`;
      setLoadingPermissions(prev => ({ ...prev, [loadingKey]: true }));

      try {
        const employee = employees.find(emp => emp.id === userId);
        if (!employee) throw new Error("Employee not found");

        const updatedPermissions = {
          ...employee.permissions,
          [permissionType]: granted,
        };

        const res = await fetch(`/api/admin/employees/${userId}/permissions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: updatedPermissions }),
          credentials: "include",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to update permissions");
        }

        return { userId, permissionType, granted };
      } finally {
        setLoadingPermissions(prev => ({ ...prev, [loadingKey]: false }));
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({
        title: "Success",
        description: `Permission ${data.granted ? "granted" : "revoked"} successfully`,
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

  // Mutation for deleting employee
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const res = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete employee");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      setConfirmDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setConfirmDeleteOpen(false);
    },
  });

  // Mutation for resetting employee password
  const resetPasswordMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const res = await fetch(`/api/admin/employees/${employeeId}/reset-password`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to reset password");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword);
      toast({
        title: "Success",
        description: "Password reset successfully",
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
    createEmployeeMutation.mutate({
      username: newEmployee.username,
      password: newEmployee.password,
      fullName: newEmployee.fullName,
      email: newEmployee.email,
      userGroup: newEmployee.userGroup,
      permissions: newEmployee.permissions
    });
  };

  const handlePermissionChange = (
    userId: number,
    permissionType: string,
    granted: boolean
  ) => {
    updatePermissionsMutation.mutate({
      userId,
      permissionType,
      granted,
    });
  };

  const handleNewEmployeePermissionChange = (
    permissionType: string,
    granted: boolean
  ) => {
    setNewEmployee({
      ...newEmployee,
      permissions: {
        ...newEmployee.permissions,
        [permissionType]: granted
      }
    });
  };

  const handleDeleteEmployee = (employeeId: number) => {
    setSelectedEmployeeId(employeeId);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEmployeeId) {
      deleteEmployeeMutation.mutate(selectedEmployeeId);
    }
  };

  const handleResetPassword = (employeeId: number) => {
    setSelectedEmployeeId(employeeId);
    setResetPasswordOpen(true);
    resetPasswordMutation.mutate(employeeId);
  };

  // Group permissions by category for better display
  const renderPermissionGroups = () => {
    return permissionGroups.map(group => (
      <div key={group.label} className="mb-4">
        <h3 className="font-medium text-sm mb-2">{group.label}</h3>
        <div className="grid grid-cols-2 gap-2">
          {group.permissions.map(permission => (
            <div key={permission.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`new-${permission.id}`}
                checked={newEmployee.permissions[permission.id] || false}
                onCheckedChange={(checked) => 
                  handleNewEmployeePermissionChange(permission.id, !!checked)
                }
              />
              <Label 
                htmlFor={`new-${permission.id}`}
                className="text-sm cursor-pointer"
                title={permission.description}
              >
                {permission.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Employee Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Employee</CardTitle>
          <CardDescription>
            Add a new employee with specific role and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEmployee} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="userGroup">User Group</Label>
                <Select
                  value={newEmployee.userGroup}
                  onValueChange={(value) =>
                    setNewEmployee({ ...newEmployee, userGroup: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {USER_GROUPS.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Permissions</h3>
              <div className="border rounded-md p-4 bg-muted/20">
                {renderPermissionGroups()}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createEmployeeMutation.isPending}
            >
              {createEmployeeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Employee...
                </>
              ) : "Create Employee Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            Manage existing employees and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found. Create your first employee above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User Group</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.fullName || employee.username}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        {USER_GROUPS.find(g => g.id === employee.userGroup)?.label || employee.userGroup}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          employee.status === 'active' ? 'bg-green-100 text-green-800' : 
                          employee.status === 'inactive' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {employee.status || 'active'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(employee.id)}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Permissions</CardTitle>
          <CardDescription>
            Manage detailed permissions for each employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  {permissionGroups.flatMap(group => 
                    group.permissions.map(perm => (
                      <TableHead key={perm.id} className="text-center whitespace-nowrap">
                        <div className="text-xs font-medium leading-none" title={perm.description}>
                          {perm.label}
                        </div>
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {employee.fullName || employee.username}
                    </TableCell>
                    {getAllPermissionTypes().map((permType) => {
                      const isLoading = loadingPermissions[`${employee.id}-${permType}`];
                      return (
                        <TableCell key={permType} className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={employee.permissions?.[permType] || false}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(employee.id, permType, !!checked)
                              }
                              disabled={isLoading}
                              className="relative"
                            />
                            {isLoading && (
                              <Loader2 className="w-4 h-4 text-primary absolute animate-spin" />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Deleting Employee */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Employee Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteEmployeeMutation.isPending}>
              {deleteEmployeeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for showing temporary password */}
      <Dialog open={resetPasswordOpen && !!tempPassword} onOpenChange={setResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A temporary password has been generated for this employee. Please provide this password to them securely.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm font-medium">Temporary Password:</p>
            <p className="text-xl font-mono mt-2 select-all">{tempPassword}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Note: This password will only be shown once. The employee should change it after their first login.
          </p>
          <DialogFooter>
            <Button onClick={() => {
              setResetPasswordOpen(false);
              setTempPassword("");
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}