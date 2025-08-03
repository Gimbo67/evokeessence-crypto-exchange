import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'PPP');
}

export function formatDateTime(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'PPP p');
}

export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function getStatusColor(status: string): "default" | "success" | "warning" | "destructive" | "secondary" {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'approved':
    case 'completed':
    case 'successful':
      return 'success';
    case 'pending':
    case 'in_progress':
    case 'processing':
      return 'warning';
    case 'rejected':
    case 'failed':
      return 'destructive';
    case 'not_started':
      return 'secondary';
    default:
      return 'default';
  }
}