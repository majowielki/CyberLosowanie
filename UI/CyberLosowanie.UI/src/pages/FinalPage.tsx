import { useGetCyberekByIdQuery } from "@/apis/cyberLosowanieApi";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect} from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCyberekItem } from "@/features/redux/cyberekSlice";
import { RootState } from "@/features/redux/store";

function FinalPage() {
  const dispatch = useDispatch();
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);
  const { data, isLoading } = useGetCyberekByIdQuery(userHasGiftedCyberekId);
  const cyberekImg= useSelector((state: RootState) => state.cyberekItemStore.imageUrl);
  const cyberekName= useSelector((state: RootState) => state.cyberekItemStore.name);

  useEffect(() => {
    if (!isLoading && data) {
      dispatch(setCyberekItem(data.result));
    }
  }, [isLoading]);

  if (isLoading) {
    return <></>;
  }

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-4xl font-extrabold text-white mb-10">Congratulations!</h1>
      <h2 className="text-2xl font-extrabold text-white mb-10">This year you will be santa for {cyberekName}</h2>
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              <img src={cyberekImg} alt={`Cyber Losowanie`} className="w-full h-80 rounded-md object-cover" />
            </CardContent>
          </Card>
    </div>
  );
}

export default FinalPage;