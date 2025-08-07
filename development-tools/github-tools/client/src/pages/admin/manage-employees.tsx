import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, User, UserPlus, Edit, Trash2, Search, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { permissionGroups, PermissionType, getAllPermissionTypes } from "@/types/permission";

// Types
interface Employee {
  id: number;
  username: string;
  fullName: string;
  email: string;
  userGroup: string;
  permissions: Record<PermissionType, boolean>;
  status?: string;
}

// Form schemas
const createEmployeeSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userGroup: z.string(),
  permissions: z.record(z.boolean()).optional(),
});

const updateEmployeeSchema = z.object({
  id: z.number(),
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  userGroup: z.string(),
  permissions: z.record(z.boolean()).optional(),
});

type CreateEmployeeInputs = z.infer<typeof createEmployeeSchema>;
type UpdateEmployeeInputs = z.infer<typeof updateEmployeeSchema>;

const ManageEmployees = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize form for creating new employees
  const createForm = useForm<CreateEmployeeInputs>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      userGroup: "finance_emp",
      permissions: getAllPermissionTypes().reduce((acc, permission) => {
        acc[permission] = false;
        return acc;
      }, {} as Record<PermissionType, boolean>),
    },
  });

  // Initialize form for editing employees
  const updateForm = useForm<UpdateEmployeeInputs>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      id: 0,
      fullName: "",
      email: "",
      userGroup: "",
      permissions: {},
    },
  });

  // Fetch employees data
  const { data: employees, isLoading, isError } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await axios.get("/api/admin/employees");
      return response.data.employees;
    },
  });

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeInputs) => {
      console.log("Creating employee with data:", {
        ...data,
        password: data.password ? "***" : undefined // Don't log actual password
      });
      
      // Ensure we have at least some default permissions
      const permissions = data.permissions || getAllPermissionTypes().reduce((acc, permission) => {
        acc[permission] = false;
        return acc;
      }, {} as Record<PermissionType, boolean>);
      
      // Create the request payload
      const payload = {
        ...data,
        permissions,
      };
      
      // Log what we're sending (without password)
      console.log("Sending employee create request:", {
        ...payload,
        password: "***"
      });
      
      const response = await axios.post("/api/admin/employees", payload);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Employee created successfully:", data);
      
      toast({
        title: "Success",
        description: "Employee account created successfully",
      });
      setIsCreateOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: any) => {
      console.error("Error creating employee:", error);
      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateEmployeeInputs) => {
      console.log("Updating employee permissions for ID:", data.id);
      
      // Ensure permissions is not null or undefined
      const permissions = data.permissions || getAllPermissionTypes().reduce((acc, permission) => {
        acc[permission] = false;
        return acc;
      }, {} as Record<PermissionType, boolean>);
      
      // Create the request payload
      const payload = {
        permissions,
        fullName: data.fullName,
        email: data.email,
        userGroup: data.userGroup
      };
      
      console.log("Sending permission update payload:", payload);
      
      const response = await axios.patch(`/api/admin/employees/${data.id}/permissions`, payload);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Employee permissions updated successfully:", data);
      
      toast({
        title: "Success",
        description: "Employee permissions updated successfully",
      });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: any) => {
      console.error("Error updating employee permissions:", error);
      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update employee permissions",
        variant: "destructive",
      });
    },
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axios.delete(`/api/admin/employees/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axios.post(`/api/admin/employees/${id}/reset-password`);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset",
        description: `New temporary password: ${data.temporaryPassword}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Submit handlers
  const onCreateSubmit = (data: CreateEmployeeInputs) => {
    createMutation.mutate(data);
  };

  const onUpdateSubmit = (data: UpdateEmployeeInputs) => {
    updateMutation.mutate(data);
  };

  // Handle edit employee
  const handleEditEmployee = (employee: Employee) => {
    setCurrentEmployee(employee);
    updateForm.reset({
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      userGroup: employee.userGroup,
      permissions: employee.permissions || {},
    });
    setIsEditOpen(true);
  };

  // Handle delete employee
  const handleDeleteEmployee = (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  // Handle reset password
  const handleResetPassword = (id: number) => {
    if (window.confirm("Are you sure you want to reset this employee's password?")) {
      resetPasswordMutation.mutate(id);
    }
  };

  // Filter employees by search query
  const filteredEmployees = employees?.filter((employee: Employee) => {
    const query = searchQuery.toLowerCase();
    return (
      employee.username.toLowerCase().includes(query) ||
      employee.fullName.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query)
    );
  }) || [];

  // User group options
  const userGroupOptions = [
    { value: "kyc_employee", label: "KYC Specialist" },
    { value: "finance_emp", label: "Finance Manager" },
    { value: "viewonly_employee", label: "View Only Employee" },
    { value: "second_admin", label: "Secondary Admin" },
  ];

  // Get user group label
  const getUserGroupLabel = (value: string) => {
    const option = userGroupOptions.find((option) => option.value === value);
    return option ? option.label : value;
  };

  // Helper to check if all permissions in a group are enabled
  const areAllPermissionsInGroupEnabled = (group: string, permissions: Record<PermissionType, boolean>) => {
    const groupPermissions = permissionGroups.find(g => g.label === group)?.permissions || [];
    return groupPermissions.every(p => permissions[p.id]);
  };

  // Helper for select all permissions in a group
  const handleSelectAllInGroup = (group: string, checked: boolean, form: any) => {
    const groupPermissions = permissionGroups.find(g => g.label === group)?.permissions || [];
    const updatedPermissions = { ...form.getValues().permissions };
    
    groupPermissions.forEach(permission => {
      updatedPermissions[permission.id] = checked;
    });
    
    form.setValue('permissions', updatedPermissions);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Create and manage employee accounts with customizable permissions
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create Employee
        </Button>
      </div>

      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Accounts</CardTitle>
          <CardDescription>
            Manage employee accounts and their access rights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load employees. Please try again.
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No employees found matching your search." : "No employees created yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee: Employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div>{employee.fullName}</div>
                            <div className="text-sm text-muted-foreground">@{employee.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getUserGroupLabel(employee.userGroup)}</Badge>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {employee.permissions && Object.entries(employee.permissions)
                            .filter(([_, enabled]) => enabled)
                            .slice(0, 3)
                            .map(([permission]) => (
                              <Badge variant="secondary" key={permission} className="text-xs">
                                {permission.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          {employee.permissions && 
                            Object.values(employee.permissions).filter(Boolean).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{Object.values(employee.permissions).filter(Boolean).length - 3} more
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === "active" ? "default" : "secondary"} 
                          className={employee.status === "active" ? "bg-green-500 hover:bg-green-600" : ""}>
                          {employee.status || "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleResetPassword(employee.id)}
                          >
                            Reset Pwd
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Employee Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account with customized permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="userGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userGroupOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Permissions</h3>
                <Tabs defaultValue="transactions">
                  <TabsList className="mb-4">
                    {permissionGroups.map((group) => (
                      <TabsTrigger key={group.label} value={group.label.toLowerCase()}>
                        {group.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {permissionGroups.map((group) => (
                    <TabsContent key={group.label} value={group.label.toLowerCase()} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`select-all-${group.label}`}
                          checked={createForm.watch('permissions') ? 
                            areAllPermissionsInGroupEnabled(group.label, createForm.watch('permissions') as Record<PermissionType, boolean>) 
                            : false
                          }
                          onCheckedChange={(checked) => {
                            handleSelectAllInGroup(group.label, checked === true, createForm);
                          }}
                        />
                        <label
                          htmlFor={`select-all-${group.label}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Select all {group.label.toLowerCase()} permissions
                        </label>
                      </div>
                      <Separator className="my-2" />
                      {group.permissions.map((permission) => (
                        <div key={permission.id} className="flex flex-col space-y-2 border-b pb-2 last:border-0">
                          <div className="flex items-center space-x-2">
                            <FormField
                              control={createForm.control}
                              name={`permissions.${permission.id}`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-medium">
                                      {permission.label}
                                    </FormLabel>
                                    <FormDescription>
                                      {permission.description}
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Employee
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee: {currentEmployee?.fullName}</DialogTitle>
            <DialogDescription>
              Modify employee details and permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={updateForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="userGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userGroupOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Permissions</h3>
                <Tabs defaultValue="transactions">
                  <TabsList className="mb-4">
                    {permissionGroups.map((group) => (
                      <TabsTrigger key={group.label} value={group.label.toLowerCase()}>
                        {group.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {permissionGroups.map((group) => (
                    <TabsContent key={group.label} value={group.label.toLowerCase()} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`edit-select-all-${group.label}`}
                          checked={updateForm.watch('permissions') ? 
                            areAllPermissionsInGroupEnabled(group.label, updateForm.watch('permissions') as Record<PermissionType, boolean>) 
                            : false
                          }
                          onCheckedChange={(checked) => {
                            handleSelectAllInGroup(group.label, checked === true, updateForm);
                          }}
                        />
                        <label
                          htmlFor={`edit-select-all-${group.label}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Select all {group.label.toLowerCase()} permissions
                        </label>
                      </div>
                      <Separator className="my-2" />
                      {group.permissions.map((permission) => (
                        <div key={permission.id} className="flex flex-col space-y-2 border-b pb-2 last:border-0">
                          <div className="flex items-center space-x-2">
                            <FormField
                              control={updateForm.control}
                              name={`permissions.${permission.id}`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-medium">
                                      {permission.label}
                                    </FormLabel>
                                    <FormDescription>
                                      {permission.description}
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageEmployees;