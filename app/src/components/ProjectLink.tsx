import { Button } from "./ui/button.tsx";
import { useConversationActions, useMessages } from "@/store/chat.ts";
import { MessageSquarePlus } from "lucide-react";
import Api from "@/components/ui/icons/Api.tsx";
import { openWindow } from "@/utils/device.ts";

function ProjectLink() {
  const messages = useMessages();
  const { toggle } = useConversationActions();

  return messages.length > 0 ? (
    <Button
      variant="outline"
      size="icon-md"
      className="rounded-full overflow-hidden"
      onClick={async () => await toggle(-1)}
    >
      <MessageSquarePlus className={`h-4 w-4`} />
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon-md"
      className="rounded-full overflow-hidden"
      onClick={() => openWindow("https://api.ccode.vip")}
    >
      <Api className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100" />
    </Button>
  );
}

export default ProjectLink;
