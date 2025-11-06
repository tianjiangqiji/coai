import { version } from "@/conf/bootstrap.ts";
import { useTranslation } from "react-i18next";
import { getMemory, setMemory } from "@/utils/memory.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

function ReloadPrompt() {
  const { t } = useTranslation();

  const before = getMemory("version");
  if (version.length === 0) {
    return <></>;
  }
  if (before.length > 0 && before !== version) {
    setMemory("version", version);

    setTimeout(() => {
      toast.success(t("service.update-success"), {
        description: (
          <p>
            <Badge variant={`outline`} className={`font-medium mr-1`}>
              v{version}
            </Badge>
            {t("service.update-success-prompt")}
          </p>
        ),
      });
    }, 2500);

    console.debug(
      `[service] service worker updated (from ${before} to ${version})`,
    );
  }
  setMemory("version", version);

  return <></>;
}

export default ReloadPrompt;
