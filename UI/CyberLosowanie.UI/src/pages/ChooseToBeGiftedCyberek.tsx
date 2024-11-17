import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CyberLosowanieClosed from "@/assets/CyberLosowanieClosed.svg";
import CyberLosowanieOpen from "@/assets/CyberLosowanieOpen.svg";
import { useDispatch } from "react-redux";
import { useGetValidateIdsQuery, useUpdateCyberekMutation } from "@/apis/cyberLosowanieApi";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RootState } from "@/features/redux/store";
import { useSelector } from "react-redux";
import { setGiftedCyberekId } from "@/features/redux/userSlice";
import { setCyberkiList } from "@/features/redux/cyberkiSlice";

function ChooseToBeGiftedCyberek() {
  const userName = useSelector((state: RootState) => state.userAuthStore.fullName);
  const cyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const cards = Array.from({ length: 12 });
  const dispatch = useDispatch();
  const [updateCyberek] = useUpdateCyberekMutation();
  const { data, isLoading } = useGetValidateIdsQuery(cyberekId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && data) {
      dispatch(setCyberkiList(data.result));
      setCyberkiList(data.result);
    }
  }, [isLoading]);

  const handleSelect = (index: string) => {
    setLoading(true);

    const formData = new FormData();

    formData.append("GiftedCyberekId", index);
    formData.append("CyberekId", "0");

    try {
      updateCyberek({ data: formData, userName: userName });
    } catch (error) {
      console.error("Failed to update cyberek:", error);
    } finally {
      dispatch(setGiftedCyberekId(index));
      setLoading(false);
    }
  };

  if (loading) {
    return <></>;
  }

  if (isLoading) {
    return <></>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-extrabold text-white mb-10 mt-10">Choose mystery cyberek box</h1>
      <div className="grid grid-cols-1 mb-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((_, index) => (
          <Card key={index} className="bg-transparent border-2 border-white">
            <CardContent className="p-4 flex flex-col items-center">
              {data.result.includes(index + 1) ? (
                <>
                  <img src={CyberLosowanieClosed} alt={`Cyber Losowanie Closed ${index + 1}`} className="w-full h-64 md:h-48 rounded-md object-cover mb-4" />
                  <Button className="text-xl font-semibold capitalize" onClick={() => handleSelect(`${index + 1}`)}>
                    <Link to="/final-page">Select</Link>
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