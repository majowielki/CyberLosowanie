import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {
  HomeLayout,
  Landing,
  Error,
  SelectYourCyberek,
  ChooseToBeGiftedCyberek,
  FinalPage,
  Register,
  Login
} from "./pages";
import { ErrorElement } from "./components";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthPersistence } from "./hooks/useAuthPersistence";
import { Toaster } from "./components/ui/toaster";

// Route protection lives here (and only here) via ProtectedRoute — pages must
// not re-implement their own auth checks.
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeLayout />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Landing />,
        errorElement: <ErrorElement />,
      },
      {
        path: "select-your-cyberek",
        element: (
          <ProtectedRoute>
            <SelectYourCyberek />
          </ProtectedRoute>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: "choose-to-be-gifted-cyberek",
        element: (
          <ProtectedRoute>
            <ChooseToBeGiftedCyberek />
          </ProtectedRoute>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: "final-page",
        element: (
          <ProtectedRoute>
            <FinalPage />
          </ProtectedRoute>
        ),
        errorElement: <ErrorElement />,
      },
    ],
  },
  {
    path: "/login",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Login />
      </ProtectedRoute>
    ),
    errorElement: <Error />,
  },
  {
    path: "/register",
    element: (
      <ProtectedRoute requireAuth={false}>
        <Register />
      </ProtectedRoute>
    ),
    errorElement: <Error />,
  },
]);

function App() {
  // Restore authentication state on app load
  useAuthPersistence();

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster />
    </ErrorBoundary>
  );
};
export default App;
