import { Toaster } from "@/components/ui/toaster.tsx";
import SettingsDialog from "@/dialogs/SettingsDialog.tsx";

function DialogManager() {
  return (
    <>
      <Toaster />
      <SettingsDialog />
    </>
  );
}

export default DialogManager;
