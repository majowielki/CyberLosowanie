import { Outlet, useNavigation } from "react-router-dom";
import { Footer, Loading, Navbar } from "@/shared/components";

// The pine background and snow live on <body> / SceneBackground (App), so the
// layout only arranges navbar · content · footer.
const HomeLayout = () => {
  const navigation = useNavigation();
  const isPageLoading = navigation.state === "loading";
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="align-element flex flex-1 flex-col items-center py-8 sm:py-12">
        {isPageLoading ? <Loading /> : <Outlet />}
      </main>
      <Footer />
    </div>
  );
};
export default HomeLayout;
