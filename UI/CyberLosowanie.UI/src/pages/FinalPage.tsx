import { useGetMyGiftedCyberekQuery } from "@/apis/cyberLosowanieApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect} from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCyberekItem } from "@/features/redux/cyberekSlice";
import { RootState } from "@/features/redux/store";
import { useNavigate } from "react-router-dom";

function FinalPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.userAuthStore.id);
  const userName = useSelector((state: RootState) => state.userAuthStore.fullName);
  // FinalPage always asks backend for the final gifted cyberek using the
  // current user context. Backend is the single source of truth.
  const { data, isLoading, error } = useGetMyGiftedCyberekQuery(userName, {
    skip: !userId || !userName,
  });
  

  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!userId) {
      navigate("/login");
      return;
    }

    const typedData = data as {data?: {name: string; imageUrl: string}};
    if (!isLoading && typedData?.data) {
      dispatch(setCyberekItem(typedData.data));
    }
  }, [isLoading, data, dispatch, userId, navigate]);

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Please log in to view your results.</div>
        <Button onClick={() => navigate("/login")} className="mt-4">
          Go to Login
        </Button>
      </div>
    );
  }

  // If we are still loading results from backend, show a loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Loading your final results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Error loading your cyberek. Please try again.</div>
        <Button onClick={() => navigate("/")} className="mt-4">
          Go to Home
        </Button>
      </div>
    );
  }

  // Use fresh API data; if unavailable, show an error state
  const typedData = data as {data?: {name: string; imageUrl: string}};
  const currentCyberek = typedData?.data;

  if (!currentCyberek) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Could not load your final cyberek. Please try again.</div>
        <Button onClick={() => navigate("/")} className="mt-4">
          Go to Home
        </Button>
      </div>
    );
  }

  const cyberekName = currentCyberek.name || 'Unknown';
  const cyberekImg = currentCyberek.imageUrl || '';

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-4xl font-extrabold text-white mb-10">Congratulations!</h1>
      <h2 className="text-2xl font-extrabold text-white mb-10">This year you will be santa for {cyberekName}</h2>
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              {cyberekImg ? (
                <img src={cyberekImg} alt={`Cyber Losowanie for ${cyberekName}`} className="w-full h-80 rounded-md object-cover" />
              ) : (
                <div className="w-full h-80 bg-gray-200 rounded-md flex items-center justify-center">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  );
}

export default FinalPage;