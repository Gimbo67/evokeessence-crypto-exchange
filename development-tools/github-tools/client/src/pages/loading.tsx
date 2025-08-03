
import React from 'react';

export default function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      <p className="ml-4 text-lg">Loading...</p>
    </div>
  );
}
