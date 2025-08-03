import express, { Request, Response, NextFunction } from "express";
import { requireAuthentication } from "../middleware/auth";
import { requireEmployeeAccess } from "../middleware/admin";
import { db } from "@db/index";
import { eq, and, not, isNull } from "drizzle-orm";
import { users, kycDocuments } from "@db/schema";

export const employeeClientRouter = express.Router();

// Middleware to ensure all routes require authentication and employee access
employeeClientRouter.use(requireAuthentication);
employeeClientRouter.use(requireEmployeeAccess);

/**
 * @route GET /api/employee/clients
 * @desc Get all clients (non-admin, non-employee users)
 * @access Employee only
 */
employeeClientRouter.get("/", async (req: Request, res: Response) => {
  try {
    console.log("[Employee Clients API] Request received, auth status:", {
      authenticated: !!req.user,
      userId: req.user?.id,
      isEmployee: req.user?.is_employee,
      userGroup: req.user?.user_group
    });

    // Force content type for API response
    res.setHeader('Content-Type', 'application/json');

    // Make sure the user is authenticated and is an employee
    if (!req.user || !req.user.id) {
      console.log("[Employee Clients API] Authentication failed - no user in request");
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if the user is an employee (using snake_case property as per type definition)
    const isEmployeeUser = req.user.is_employee === true;
    
    console.log("[Employee Clients API] Employee status check:", {
      isEmployeeUser,
      employeeValue: req.user.is_employee
    });
    
    if (!isEmployeeUser) {
      console.log("[Employee Clients API] Access denied - not an employee");
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all clients (regular users who are not admins or employees)
    const clients = await db.query.users.findMany({
      where: and(
        not(eq(users.is_admin, true)),
        not(eq(users.is_employee, true))
      ),
      columns: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        phone_number: true,
        address: true,
        country_of_residence: true,
        kyc_status: true,
        created_at: true,
      },
    });

    // Transform the data to camelCase for frontend use
    const transformedClients = clients.map(client => ({
      id: client.id,
      username: client.username,
      email: client.email || "",
      fullName: client.full_name || "",
      phoneNumber: client.phone_number || "",
      address: client.address || "",
      country: client.country_of_residence || "",
      kycStatus: client.kyc_status || "pending",
      createdAt: client.created_at ? client.created_at.toISOString() : new Date().toISOString(),
    }));

    return res.json(transformedClients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /api/employee/clients/:id
 * @desc Get a specific client's details
 * @access Employee only
 */
employeeClientRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    console.log("[Employee Client Detail API] Request received for client ID:", req.params.id, "auth status:", {
      authenticated: !!req.user,
      userId: req.user?.id,
      isEmployee: req.user?.is_employee,
      userGroup: req.user?.user_group
    });

    // Force content type for API response
    res.setHeader('Content-Type', 'application/json');

    // Make sure the user is authenticated and is an employee
    if (!req.user || !req.user.id) {
      console.log("[Employee Client Detail API] Authentication failed - no user in request");
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if the user is an employee
    const isEmployee = req.user.is_employee === true;
    
    console.log("[Employee Client Detail API] Employee status check:", {
      isEmployee,
      employeeValue: req.user.is_employee
    });
    
    if (!isEmployee) {
      console.log("[Employee Client Detail API] Access denied - not an employee");
      return res.status(403).json({ error: "Access denied" });
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID" });
    }

    // Get the client details
    const client = await db.query.users.findFirst({
      where: eq(users.id, clientId),
      columns: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        phone_number: true,
        address: true,
        country_of_residence: true,
        kyc_status: true,
        created_at: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Get client's KYC documents
    const kycDocs = await db.query.kycDocuments.findMany({
      where: eq(kycDocuments.userId, clientId),
    });

    // Transform KYC documents
    const transformedDocs = kycDocs.map(doc => ({
      id: doc.id,
      type: doc.documentType,
      status: doc.status || "pending",
      fileUrl: doc.documentUrl,
      createdAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date().toISOString(),
      adminComment: doc.adminComment,
    }));

    // Transform the client data to camelCase for frontend use
    const transformedClient = {
      id: client.id,
      username: client.username,
      email: client.email || "",
      fullName: client.full_name || "",
      phoneNumber: client.phone_number || "",
      address: client.address || "",
      country: client.country_of_residence || "",
      countryOfResidence: client.country_of_residence || "",
      kycStatus: client.kyc_status || "pending",
      createdAt: client.created_at ? client.created_at.toISOString() : new Date().toISOString(),
      kycDocuments: transformedDocs,
    };

    return res.json(transformedClient);
  } catch (error) {
    console.error("Error fetching client details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route PATCH /api/employee/clients/:id/kyc
 * @desc Update a client's KYC status
 * @access Employee only
 */
employeeClientRouter.patch("/:id/kyc", async (req: Request, res: Response) => {
  try {
    console.log("[Employee KYC Update API] Request received for client ID:", req.params.id, "auth status:", {
      authenticated: !!req.user,
      userId: req.user?.id,
      isEmployee: req.user?.is_employee,
      userGroup: req.user?.user_group,
      requestBody: req.body
    });

    // Force content type for API response
    res.setHeader('Content-Type', 'application/json');

    // Make sure the user is authenticated and is an employee
    if (!req.user || !req.user.id) {
      console.log("[Employee KYC Update API] Authentication failed - no user in request");
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if the user is an employee
    const isEmployee = req.user.is_employee === true;
    
    console.log("[Employee KYC Update API] Employee status check:", {
      isEmployee,
      employeeValue: req.user.is_employee
    });
    
    if (!isEmployee) {
      console.log("[Employee KYC Update API] Access denied - not an employee");
      return res.status(403).json({ error: "Access denied" });
    }

    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID" });
    }

    const { kycStatus } = req.body;
    if (!kycStatus || !['pending', 'approved', 'rejected'].includes(kycStatus)) {
      return res.status(400).json({ error: "Invalid KYC status" });
    }

    // Update the client's KYC status
    await db.update(users)
      .set({ kyc_status: kycStatus })
      .where(eq(users.id, clientId));

    return res.json({ success: true, message: "KYC status updated successfully" });
  } catch (error) {
    console.error("Error updating KYC status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});