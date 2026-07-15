import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import CyberLosowanieClosed from "@/assets/CyberLosowanieClosed.svg";
import CyberLosowanieOpen from "@/assets/CyberLosowanieOpen.svg";
import { useDispatch } from "react-redux";
import { useGetAvailableGiftTargetsQuery, useAssignGiftedCyberekMutation } from "@/features/cyberki/cyberLosowanieApi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/app/store";
import { useSelector } from "react-redux";
import { setGiftedCyberekId } from "@/features/auth/userSlice";
import { toast } from "@/shared/hooks/use-toast";
import { debugLog } from "@/shared/config";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function ChooseToBeGiftedCyberek() {
  const navigate = useNavigate();
  const userName = useSelector((state: RootState) => state.userAuthStore.fullName);
  const cyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const cards = Array.from({ length: 12 });
  const dispatch = useDispatch();
  const [assignGiftedCyberek] = useAssignGiftedCyberekMutation();
  const { data, isLoading } = useGetAvailableGiftTargetsQuery(cyberekId ?? 0, { skip: cyberekId == null });
  const [loading, setLoading] = useState(false);

  // The boxes are purely visual (C2): clicking any available box triggers a
  // server-side draw. The chosen box number is not sent — the server decides the
  // target and returns it.
  const handleSelect = async () => {
    setLoading(true);

    try {
      const response = await assignGiftedCyberek({ userName }).unwrap();

      debugLog("assignGiftedCyberek draw response", response);

      // The server returns the assigned giftedCyberekId — reflect it in the store.
      if (response.data) {
        dispatch(setGiftedCyberekId(response.data));
      }

      navigate("/final-page");
    } catch (error) {
      debugLog("Failed to assign gifted cyberek:", error);
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-white text-lg">Processing your selection...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading mystery boxes...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-extrabold text-white mb-10 mt-10">Wybierz dostępne pudełko aby wylosować</h1>
      <div className="grid grid-cols-1 mb-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((_, index) => (
          <Card key={`gift-box-${index + 1}`} className="bg-transparent border-2 border-white">
            <CardContent className="p-4 flex flex-col items-center">
              {data?.data?.includes(index + 1) ? (
                <>
                  <img src={CyberLosowanieClosed} alt={`Cyber Losowanie Closed ${index + 1}`} className="w-full h-64 md:h-48 rounded-md object-cover mb-4" />
                  <Button className="text-xl font-semibold capitalize" onClick={() => handleSelect()}>
                    Select
                  </Button>
                </>
              ) : (
                <>
                  <img src={CyberLosowanieOpen} alt={`Cyber Losowanie Opened ${index + 1}`} className="w-full h-64 md:h-48 rounded-md object-cover mb-4" />
                  <Button className="text-xl font-semibold capitalize" disabled>Selected</Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ChooseToBeGiftedCyberek;
