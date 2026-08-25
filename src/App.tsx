import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RootRoute, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  notFoundMode: "root",
  defaultErrorComponent: ({ error }) => (
    <div className="flex items-center justify-center min-h-screen px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-red-600">حدث خطأ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'خطأ غير معروف'}
        </p>
      </div>
    </div>
  ),
});

DeclareModule("@tanstack/react-router") {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}
