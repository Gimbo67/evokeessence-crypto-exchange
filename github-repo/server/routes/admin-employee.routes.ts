import express, { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { users, userPermissions, userPermissionsRelations } from '../../db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { requireAuthentication } from '../middleware/auth';
import { requireAdminAccess } from '../middleware/admin';

export const adminEmployeeRouter = express.Router();

// Apply auth middleware to all routes
adminEmployeeRouter.use(requireAuthentication);
adminEmployeeRouter.use(requireAdminAccess);

/**
 * @route GET /api/admin/employees
 * @desc Get all employees
 * @access Admin only
 */
adminEmployeeRouter.get(
  '/',
  async (req: Request, res: Response) => {
    try {
      // Log available user groups
      console.log("Available user groups:", { 
        KYC_EMPLOYEE: 'kyc_employee',
        FINANCE_EMPLOYEE: 'finance_emp',
        VIEWONLY_EMPLOYEE: 'viewonly_employee',
        SECOND_RANK_ADMIN: 'second_admin',
        CLIENT: 'client'
      });
      
      // Query all users with employee flag set to true
      const employeeUsers = await db.query.users.findMany({
        where: eq(users.is_employee, true)
      });
      
      // Fetch all permissions separately since there's an issue with the relation
      const userIds = employeeUsers.map(user => user.id);
      // Default to empty array if no employees found
      let allPermissions: any[] = [];
      
      if (userIds.length > 0) {
        allPermissions = await db.query.userPermissions.findMany({
          where: userIds.length === 1 
            ? eq(userPermissions.user_id, userIds[0])
            : sql`${userPermissions.user_id} IN (${sql.join(userIds, sql`, `)})`
        });
      }
      
      // Log found employee users
      console.log(`Found ${employeeUsers.length} employee users:`, 
        employeeUsers.map(u => ({ 
          id: u.id, 
          username: u.username, 
          is_employee: u.is_employee, 
          user_group: u.user_group 
        })));

      // Transform permissions to the expected format
      const employees = employeeUsers.map(user => {
        // Find all permissions for this user
        const userPermissions = allPermissions.filter(p => p.user_id === user.id);
        
        // Convert array of permission objects to a record/map
        const permissionsMap = userPermissions.reduce((acc: Record<string, boolean>, permission: { permission_type: string; granted: boolean }) => {
          acc[permission.permission_type] = permission.granted === true;
          return acc;
        }, {});

        return {
          id: user.id,
          username: user.username,
          fullName: user.full_name || '',
          email: user.email || '',
          userGroup: user.user_group || '',
          status: user.status || 'active',
          permissions: permissionsMap
        };
      });

      return res.status(200).json({ employees });
    } catch (error) {
      console.error('Error fetching employees:', error);
      return res.status(500).json({ message: 'Failed to fetch employees' });
    }
  }
);

/**
 * @route POST /api/admin/employees
 * @desc Create a new employee
 * @access Admin only
 */
adminEmployeeRouter.post(
  '/',
  async (req: Request, res: Response) => {
    try {
      const { username, fullName, email, password, userGroup, permissions } = req.body;

      // Check if username or email already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { or }) => or(
          eq(users.username, username),
          eq(users.email, email)
        )
      });

      if (existingUser) {
        return res.status(409).json({ 
          message: 'Username or email already in use' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with employee role
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          full_name: fullName,
          email,
          password: hashedPassword,
          user_group: userGroup,
          is_employee: true,
          is_admin: userGroup === 'second_admin',
          kyc_status: 'verified'
        })
        .returning();

      if (!newUser) {
        return res.status(500).json({ message: 'Failed to create employee account' });
      }

      // Add permissions if provided
      if (permissions && typeof permissions === 'object') {
        console.log("Processing permissions:", permissions);
        
        try {
          const permissionsToInsert = Object.entries(permissions)
            .filter(([_, granted]) => granted === true)
            .map(([permission_type, _]) => ({
              user_id: newUser.id,
              permission_type,
              granted: true
            }));

          console.log("Permissions to insert:", permissionsToInsert);

          if (permissionsToInsert.length > 0) {
            const result = await db.insert(userPermissions).values(permissionsToInsert).returning();
            console.log("Permission insert result:", result);
          } else {
            console.log("No permissions to insert");
          }
        } catch (permErr) {
          console.error("Error inserting permissions:", permErr);
          // Continue without failing the entire request
        }
      } else {
        console.log("No permissions provided in request");
      }

      return res.status(201).json({ 
        message: 'Employee created successfully',
        employee: {
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.full_name,
          email: newUser.email,
          userGroup: newUser.user_group
        }
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      return res.status(500).json({ message: 'Failed to create employee account' });
    }
  }
);

/**
 * @route PATCH /api/admin/employees/:id/permissions
 * @desc Update a specific employee's permissions and information
 * @access Admin only
 */
adminEmployeeRouter.patch(
  '/:id/permissions',
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      const { permissions, fullName, email, userGroup } = req.body;

      if (isNaN(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID' });
      }

      // Check if employee exists
      const employee = await db.query.users.findFirst({
        where: eq(users.id, employeeId)
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Update user information if provided
      if (fullName || email || userGroup) {
        await db
          .update(users)
          .set({
            full_name: fullName || employee.full_name,
            email: email || employee.email,
            user_group: userGroup || employee.user_group,
            is_admin: userGroup === 'second_admin' ? true : employee.is_admin
          })
          .where(eq(users.id, employeeId));
      }

      // Update permissions if provided
      if (permissions && typeof permissions === 'object') {
        console.log("Processing permissions update for employee ID:", employeeId, permissions);
        
        try {
          // Delete existing permissions
          const deleteResult = await db
            .delete(userPermissions)
            .where(eq(userPermissions.user_id, employeeId))
            .returning();
            
          console.log("Deleted existing permissions:", deleteResult);

          // Add new permissions
          const permissionsToInsert = Object.entries(permissions)
            .filter(([_, granted]) => granted === true)
            .map(([permission_type, _]) => ({
              user_id: employeeId,
              permission_type,
              granted: true
            }));

          console.log("Permissions to insert after update:", permissionsToInsert);

          if (permissionsToInsert.length > 0) {
            const insertResult = await db.insert(userPermissions).values(permissionsToInsert).returning();
            console.log("Inserted permissions after update:", insertResult);
          } else {
            console.log("No permissions to insert after update");
          }
        } catch (permErr) {
          console.error("Error updating permissions:", permErr);
          // Continue without failing the entire request
        }
      } else {
        console.log("No permissions provided in update request");
      }

      return res.status(200).json({ 
        message: 'Employee information and permissions updated successfully' 
      });
    } catch (error) {
      console.error('Error updating employee permissions:', error);
      return res.status(500).json({ message: 'Failed to update employee permissions' });
    }
  }
);

/**
 * @route DELETE /api/admin/employees/:id
 * @desc Delete an employee
 * @access Admin only
 */
adminEmployeeRouter.delete(
  '/:id',
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);

      if (isNaN(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID' });
      }

      // Check if employee exists
      const employee = await db.query.users.findFirst({
        where: eq(users.id, employeeId)
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Delete employee permissions first (foreign key constraint)
      await db
        .delete(userPermissions)
        .where(eq(userPermissions.user_id, employeeId));

      // Delete employee user account
      await db
        .delete(users)
        .where(eq(users.id, employeeId));

      return res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Error deleting employee:', error);
      return res.status(500).json({ message: 'Failed to delete employee' });
    }
  }
);

/**
 * @route POST /api/admin/employees/:id/reset-password
 * @desc Reset an employee's password
 * @access Admin only
 */
adminEmployeeRouter.post(
  '/:id/reset-password',
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);

      if (isNaN(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID' });
      }

      // Check if employee exists
      const employee = await db.query.users.findFirst({
        where: eq(users.id, employeeId)
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Generate temporary password
      const temporaryPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      // Update employee password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, employeeId));

      return res.status(200).json({ 
        message: 'Password reset successfully',
        temporaryPassword
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({ message: 'Failed to reset password' });
    }
  }
);

/**
 * @route GET /api/admin/employees/:id
 * @desc Get detailed information about a specific employee
 * @access Admin only
 */
adminEmployeeRouter.get(
  '/:id',
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);

      if (isNaN(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID' });
      }

      // Fetch employee details
      const employee = await db.query.users.findFirst({
        where: eq(users.id, employeeId)
      });

      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      // Fetch permissions separately
      const employeePermissions = await db.query.userPermissions.findMany({
        where: eq(userPermissions.user_id, employeeId)
      });

      // Transform permissions to the expected format
      const permissionsMap = employeePermissions.reduce((acc: Record<string, boolean>, permission: { permission_type: string; granted: boolean }) => {
        acc[permission.permission_type] = permission.granted === true;
        return acc;
      }, {});

      return res.status(200).json({
        employee: {
          id: employee.id,
          username: employee.username,
          fullName: employee.full_name,
          email: employee.email,
          userGroup: employee.user_group,
          status: employee.status,
          permissions: permissionsMap,
          createdAt: employee.created_at,
          lastLoginAt: employee.last_login_at
        }
      });
    } catch (error) {
      console.error('Error fetching employee details:', error);
      return res.status(500).json({ message: 'Failed to fetch employee details' });
    }
  }
);