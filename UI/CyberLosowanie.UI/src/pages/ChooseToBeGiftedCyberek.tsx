import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CyberLosowanieClosed from "@/assets/CyberLosowanieClosed.svg";
import CyberLosowanieOpen from "@/assets/CyberLosowanieOpen.svg";
import { useDispatch } from "react-redux";
import { useGetAvailableGiftTargetsQuery, useAssignGiftedCyberekMutation } from "@/apis/cyberLosowanieApi";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/features/redux/store";
import { useSelector } from "react-redux";
import { setGiftedCyberekId } from "@/features/redux/userSlice";
import { resetCyberek } from "@/features/redux/cyberekSlice";
import { toast } from "@/hooks/use-toast";

function ChooseToBeGiftedCyberek() {
  const navigate = useNavigate();
  const userName = useSelector((state: RootState) => state.userAuthStore.fullName);
  const cyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const cards = Array.from({ length: 12 });
  const dispatch = useDispatch();
  const [assignGiftedCyberek] = useAssignGiftedCyberekMutation();
  const { data, isLoading } = useGetAvailableGiftTargetsQuery(parseInt(cyberekId || "0"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const typedData = data as {data?: number[]};
    if (!isLoading && typedData?.data) {
      console.log('Available gift targets:', typedData.data);
      // Note: We don't dispatch setCyberkiList here anymore since this endpoint 
      // returns available target IDs, not cyberek objects
    }
  }, [isLoading, data, dispatch]);

  const handleSelect = async (index: string) => {
    setLoading(true);

    try {
      await assignGiftedCyberek({ 
        giftedCyberekId: parseInt(index), 
        userName: userName 
      }).unwrap();
      
      dispatch(setGiftedCyberekId(index));
      
      // Clear the cyberek item store to ensure fresh data on FinalPage
      dispatch(resetCyberek());
      
      navigate("/final-page");
    } catch (error) {
      console.error("Failed to assign gifted cyberek:", error);
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
      <h1 className="text-4xl font-extrabold text-white mb-10 mt-10">Choose mystery cyberek box</h1>
      <div className="grid grid-cols-1 mb-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((_, index) => (
          <Card key={index} className="bg-transparent border-2 border-white">
            <CardContent className="p-4 flex flex-col items-center">
              {(data as {data?: number[]})?.data?.includes(index + 1) ? (
                <>
                  <img src={CyberLosowanieClosed} alt={`Cyber Losowanie Closed ${index + 1}`} className="w-full h-64 md:h-48 rounded-md object-cover mb-4" />
                  <Button className="text-xl font-semibold capitalize" onClick={() => handleSelect(`${index + 1}`)}>
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