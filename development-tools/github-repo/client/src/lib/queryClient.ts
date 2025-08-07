import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        console.log('Making API request:', {
          endpoint: queryKey[0],
          params: queryKey.slice(1),
          timestamp: new Date().toISOString()
        });

        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          console.error('API request failed:', {
            status: res.status,
            statusText: res.statusText,
            endpoint: queryKey[0],
            timestamp: new Date().toISOString()
          });

          if (res.status >= 500) {
            throw new Error(`Server error: ${res.status} - ${res.statusText}`);
          }

          const errorText = await res.text();
          console.error('Error response:', errorText);
          throw new Error(`${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log('API request successful:', {
          endpoint: queryKey[0],
          dataPreview: JSON.stringify(data).slice(0, 200) + '...',
          timestamp: new Date().toISOString()
        });

        return data;
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Only retry server errors (5xx), not client errors (4xx)
        if (error instanceof Error && error.message.includes('Server error')) {
          return failureCount < 3;
        }
        return false;
      },
    },
    mutations: {
      retry: false,
    }
  },
});