import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportUserData, deleteUser } from '../lib/api-client';
import { useToast } from './use-toast';

/**
 * Custom hook for user deletion operations including data export
 */
export function useUserDeletion() {
  const { toast } = useToast();
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);

  // Export user data mutation
  const exportMutation = useMutation({
    mutationFn: async (userId: number | string) => {
      return await exportUserData(userId);
    },
    onSuccess: (data) => {
      console.log("Export successful, data received:", data);
      
      toast({
        title: "Data export successful",
        description: "All user data has been successfully exported.",
        variant: "default",
      });

      try {
        // Check if data is in the expected format
        const exportData = data.data ? data.data : data;
        
        // Convert exported data to JSON string
        const dataStr = JSON.stringify(exportData, null, 2);
        
        // Get user ID from the appropriate location in the data structure
        const userId = exportData.user?.id || 'unknown';
        
        // Create a blob and download link
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-${userId}-export.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error("Error processing exported data:", err);
        toast({
          title: "Export processing failed",
          description: "The data was exported but couldn't be downloaded. Check console for details.",
          variant: "destructive",
        });
      }
      
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Data export failed",
        description: error.message || "There was an error exporting user data.",
        variant: "destructive",
      });
    }
  });

  // User deletion mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number | string) => {
      return await deleteUser(userId);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user and all associated data have been permanently deleted.",
        variant: "default",
      });
      setIsConfirmingDeletion(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message || "There was an error deleting the user.",
        variant: "destructive",
      });
      setIsConfirmingDeletion(false);
    }
  });

  // Function to handle export operation
  const handleExportUserData = async (userId: number | string) => {
    return exportMutation.mutateAsync(userId);
  };

  // Function to handle delete operation with confirmation
  const handleDeleteUser = async (userId: number | string) => {
    // Set confirmation state
    setIsConfirmingDeletion(true);
    
    try {
      // First export the data (GDPR compliance)
      await exportMutation.mutateAsync(userId);
      
      // Then delete the user
      await deleteMutation.mutateAsync(userId);
      
      return true;
    } catch (error) {
      setIsConfirmingDeletion(false);
      return false;
    }
  };

  return {
    exportUserData: handleExportUserData,
    deleteUser: handleDeleteUser,
    isExporting: exportMutation.isPending,
    isDeleting: deleteMutation.isPending || isConfirmingDeletion,
    isConfirmingDeletion,
  };
}