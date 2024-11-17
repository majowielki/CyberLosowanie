import CyberLogo from "@/assets/cyber2.svg";
import ProceedButton from "@/components/ProceedButton";

function Landing() {
  return (
    <section className="flex flex-col items-center justify-center">
    <div className="flex flex-wrap items-center justify-center leading-none tracking-wide">
      <img src={CyberLogo} alt="Cyber Losowanie Logo" className="w-[700px] h-auto"/>
    </div>
    <div className="tracking-wide flex items-center justify-center mb-20">
      <ProceedButton/>
    </div>
  </section>
  );
}

export default Landing;
