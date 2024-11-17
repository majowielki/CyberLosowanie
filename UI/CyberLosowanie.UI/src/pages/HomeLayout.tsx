import { Outlet, useNavigation } from "react-router-dom";
import { Loading, Navbar } from "@/components";

const HomeLayout = () => {
  const navigation = useNavigation();
  const isPageLoading = navigation.state === "loading";
  return (
    <div className="bg-gradient-to-t from-green-900 via-green-700 to-green-500 min-h-screen w-full">
      <Navbar />
        <div className="align-element flex items-center justify-center">
          {isPageLoading ? <Loading /> : <Outlet />}
        </div>
    </div>
  );
};
export default HomeLayout;
