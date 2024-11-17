import { useGetCyberkiQuery, useUpdateCyberekMutation } from "@/apis/cyberLosowanieApi";
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
import { Link } from "react-router-dom";

function SelectYourCyberek() {
  const dispatch = useDispatch();
  const { data, isLoading } = useGetCyberkiQuery(null);
  const [updateCyberek] = useUpdateCyberekMutation();
  const [loading, setLoading] = useState(false);
  const userName = useSelector((state: RootState) => state.userAuthStore.fullName);
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  useEffect(() => {
    if (!isLoading) {
      dispatch(setCyberkiList(data.result));
      setCyberkiList(data.result);
    }
  }, [isLoading]);

  const handleSelect = (index: number) => {
    setLoading(true);

    const formData = new FormData();

    formData.append("GiftedCyberekId", "0");   
    formData.append("CyberekId", `${index + 1}`);

    try {
      updateCyberek({ data: formData, userName: userName });
    } catch (error) {
      console.error("Failed to update cyberek:", error);
    } finally {
      dispatch(setCyberekId(`${index + 1}`));
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
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-4xl font-extrabold text-white mb-10">Choose your cyberek</h1>
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {data.result.map((cyberek: cyberekModel, index: number) => (
            <CarouselItem key={index}>
              <Card>
              <CardContent className="p-2 flex flex-col items-center">
                  <img src={cyberek.imageUrl} alt="cyberki" className="w-full h-[24rem] rounded-md object-cover mb-4" />
                  <Button className="px-4 py-2 mb-2" onClick={() => handleSelect(index)}>
                    <Link to={userHasGiftedCyberekId !== "0" ? "/final-page" : "/choose-to-be-gifted-cyberek"}>Confirm your choice</Link>
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
