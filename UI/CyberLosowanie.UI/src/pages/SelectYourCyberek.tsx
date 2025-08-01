import { useGetAvailableToPickQuery, useAssignCyberekMutation } from "@/apis/cyberLosowanieApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { setCyberkiList } from "@/features/redux/cyberkiSlice";
import { RootState } from "@/features/redux/store";
import { setCyberekId } from "@/features/redux/userSlice";
import { cyberekModel } from "@/interfaces";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

function SelectYourCyberek() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userName = useSelector((state: RootState) => state.userAuthStore.fullName);
  const userId = useSelector((state: RootState) => state.userAuthStore.id);
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);
  
  // Skip API call if user is not authenticated
  const { data, isLoading, error } = useGetAvailableToPickQuery(null, {
    skip: !userId || !userName
  });
  
  const [assignCyberek] = useAssignCyberekMutation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!userId || !userName) {
      navigate("/login");
      return;
    }

    const typedData = data as {data?: cyberekModel[]};
    if (!isLoading && typedData?.data) {
      dispatch(setCyberkiList(typedData.data));
    }
  }, [isLoading, data, dispatch, userId, userName, navigate]);

  const handleSelect = async (index: number) => {
    setLoading(true);

    try {
      await assignCyberek({ 
        cyberekId: index + 1, 
        userName: userName 
      }).unwrap();
      
      dispatch(setCyberekId(`${index + 1}`));
      toast({ description: "Cyberek selected successfully!" });
    } catch (error) {
      console.error("Failed to assign cyberek:", error);
      toast({ 
        description: "Failed to select cyberek. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Authentication check
  if (!userId || !userName) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Please log in to select your cyberek.</div>
        <Button onClick={() => navigate("/login")} className="mt-4">
          Go to Login
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Selecting your cyberek...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Loading available cybereks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">Error loading available cybereks. Please try again.</div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!(data as {data?: cyberekModel[]})?.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">No cybereks available to pick at this time.</div>
        <div className="text-white text-sm mt-2">You may have already selected a cyberek or none are available.</div>
        <Button onClick={() => navigate("/")} className="mt-4">
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-4xl font-extrabold text-white mb-10">Choose your cyberek</h1>
      <p className="text-white text-center mb-6">Select from the available cybereks below</p>
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {((data as {data?: cyberekModel[]})?.data || []).map((cyberek: cyberekModel, index: number) => (
            <CarouselItem key={index}>
              <Card>
              <CardContent className="p-2 flex flex-col items-center">
                  <img src={cyberek.imageUrl} alt="cyberki" className="w-full h-[24rem] rounded-md object-cover mb-4" />
                  <Button 
                    className="px-4 py-2 mb-2" 
                    onClick={() => {
                      handleSelect(cyberek.id - 1);
                      navigate(userHasGiftedCyberekId !== "0" ? "/final-page" : "/choose-to-be-gifted-cyberek");
                    }}
                  >
                    Confirm your choice
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}
  export default SelectYourCyberek;
