export type PermissionType = 
  | 'view_transactions'
  | 'edit_transactions'
  | 'change_transaction_status'
  | 'view_clients' 
  | 'view_client_details'
  | 'edit_client_info'
  | 'change_kyc_status'
  | 'view_analytics'
  | 'manage_documents'
  | 'manage_kyc';

export interface PermissionGroup {
  label: string;
  permissions: {
    id: PermissionType;
    label: string;
    description: string;
  }[];
}

export const permissionGroups: PermissionGroup[] = [
  {
    label: "Transactions",
    permissions: [
      {
        id: "view_transactions",
        label: "View Transactions",
        description: "Can view all transaction history and details"
      },
      {
        id: "edit_transactions",
        label: "Edit Transactions",
        description: "Can modify transaction details and information"
      },
      {
        id: "change_transaction_status",
        label: "Change Transaction Status",
        description: "Can approve, reject, or mark transactions as suspicious"
      }
    ]
  },
  {
    label: "Clients",
    permissions: [
      {
        id: "view_clients",
        label: "View Clients List",
        description: "Can view the list of all clients in the system"
      },
      {
        id: "view_client_details",
        label: "View Client Details",
        description: "Can access detailed information about clients"
      },
      {
        id: "edit_client_info",
        label: "Edit Client Information",
        description: "Can modify client personal and account information"
      }
    ]
  },
  {
    label: "KYC",
    permissions: [
      {
        id: "change_kyc_status",
        label: "Change KYC Status",
        description: "Can approve or reject KYC verifications"
      },
      {
        id: "manage_kyc",
        label: "Manage KYC System",
        description: "Can access and manage the KYC verification system"
      }
    ]
  },
  {
    label: "Other",
    permissions: [
      {
        id: "view_analytics",
        label: "View Analytics",
        description: "Can access analytics and reporting dashboards"
      },
      {
        id: "manage_documents",
        label: "Manage Documents",
        description: "Can upload, view, and manage system documents"
      }
    ]
  }
];

export const getAllPermissionTypes = (): PermissionType[] => {
  return permissionGroups.flatMap(group => 
    group.permissions.map(permission => permission.id)
  );
};

export const getPermissionDetails = (permissionId: PermissionType) => {
  for (const group of permissionGroups) {
    const permission = group.permissions.find(p => p.id === permissionId);
    if (permission) {
      return permission;
    }
  }
  return null;
};