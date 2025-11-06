import InfoBox from "@/components/admin/InfoBox.tsx";
import ChartBox from "@/components/admin/ChartBox.tsx";

function DashBoard() {
  return (
    <div className="bg-background w-full h-full">
      <div className={`dashboard bg-muted/10`}>
        <InfoBox />
        <ChartBox />
      </div>
    </div>
  );
}

export default DashBoard;
