import { useGetAvailableToPickQuery, useAssignCyberekMutation } from "@/features/cyberki/cyberLosowanieApi";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/carousel";
import { RootState } from "@/app/store";
import { setCyberekId } from "@/features/auth/userSlice";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/hooks/use-toast";
import { debugLog } from "@/shared/config";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function SelectYourCyberek() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  const { data, isLoading, error } = useGetAvailableToPickQuery();

  const [assignCyberek] = useAssignCyberekMutation();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (cyberekId: number) => {
    setLoading(true);

    try {
      // Identity comes from the JWT on the request — no userName in the payload.
      await assignCyberek({ cyberekId }).unwrap();

      dispatch(setCyberekId(cyberekId));
      toast({ description: "Cyberek selected successfully!" });
    } catch (error) {
      debugLog("Failed to assign cyberek:", error);
      toast({
        description: "Failed to select cyberek. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (!data?.data?.length) {
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
      <h1 className="text-4xl font-extrabold text-white mb-10">Wybierz siebie z listy</h1>
      <p className="text-white text-center mb-6">Wybierz spośród dostępnych opcji w karuzeli poniżej</p>
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {(data.data || []).map((cyberek, index) => (
            <CarouselItem key={index}>
                <Card>
                <CardContent className="p-2 flex flex-col items-center">
                  <span className="text-black text-lg font-semibold mb-2">{cyberek.name}</span>
                  <img src={cyberek.imageUrl} alt="cyberki" className="w-full h-[24rem] rounded-md object-cover mb-4" />
                  <Button
                    className="px-4 py-2 mb-2"
                    onClick={async () => {
                      await handleSelect(cyberek.id);
                      navigate(userHasGiftedCyberekId != null ? "/final-page" : "/choose-to-be-gifted-cyberek");
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
