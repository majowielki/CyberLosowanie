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
import { useAuthPersistence } from "./hooks/useAuthPersistence";
import { Toaster } from "./components/ui/toaster";

const router = createBrowserRouter(
  [
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
          element: <SelectYourCyberek />, 
          errorElement: <ErrorElement />, 
        },
        {
          path: "choose-to-be-gifted-cyberek",
          element: <ChooseToBeGiftedCyberek />, 
          errorElement: <ErrorElement />, 
        },
        {
          path: "final-page",
          element: <FinalPage />, 
          errorElement: <ErrorElement />, 
        },
      ],
    },
    {
      path: "/login",
      element: <Login />, 
      errorElement: <Error />, 
    },
    {
      path: "/register",
      element: <Register />, 
      errorElement: <Error />, 
    },
  ],
  ({
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    }
  }) as any // eslint-disable-line @typescript-eslint/no-explicit-any
);

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