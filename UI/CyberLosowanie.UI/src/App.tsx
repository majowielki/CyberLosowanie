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
]);

function App() {
  return <RouterProvider router={router} />;
};
export default App;