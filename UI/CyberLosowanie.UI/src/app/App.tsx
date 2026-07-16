import { RouterProvider, createBrowserRouter } from "react-router-dom";
import HomeLayout from "./HomeLayout";
import Landing from "./Landing";
import Error from "./Error";
import ProtectedRoute from "./ProtectedRoute";
import Login from "@/features/auth/Login";
import Register from "@/features/auth/Register";
import SelectYourCyberek from "@/features/cyberki/SelectYourCyberek";
import ChooseToBeGiftedCyberek from "@/features/cyberki/ChooseToBeGiftedCyberek";
import FinalPage from "@/features/cyberki/FinalPage";
import MyWishlistPage from "@/features/wishlist/MyWishlistPage";
import GiftedWishlistPage from "@/features/wishlist/GiftedWishlistPage";
import { ErrorElement } from "@/shared/components";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { useAuthPersistence } from "@/features/auth/useAuthPersistence";
import { Toaster } from "@/shared/ui/toaster";

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
      {
        path: "wishlist",
        element: (
          <ProtectedRoute>
            <MyWishlistPage />
          </ProtectedRoute>
        ),
        errorElement: <ErrorElement />,
      },
      {
        path: "wishlist/gifted",
        element: (
          <ProtectedRoute>
            <GiftedWishlistPage />
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
