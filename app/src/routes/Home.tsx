import "@/assets/pages/chat.less";
import ChatWrapper from "@/components/home/ChatWrapper.tsx";
import SideBar from "@/components/home/SideBar.tsx";
function Home() {
  return (
    <div className={`home-page flex flex-row flex-1`}>
      <SideBar />
      <ChatWrapper />
    </div>
  );
}

export default Home;
