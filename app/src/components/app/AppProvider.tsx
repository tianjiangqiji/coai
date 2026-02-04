import { ThemeProvider } from "@/components/ThemeProvider.tsx";
import DialogManager from "@/dialogs";
import { useEffectAsync } from "@/utils/hook.ts";
import { bindMarket, getApiPlans } from "@/api/v1.ts";
import { useDispatch } from "react-redux";
import {
  stack,
  updateMasks,
  updateSupportModels,
  useMessageActions,
} from "@/store/chat.ts";
import { dispatchSubscriptionData, setTheme } from "@/store/globals.ts";
import { infoEvent } from "@/events/info.ts";
import { setForm } from "@/store/info.ts";
import { themeEvent } from "@/events/theme.ts";
import { useEffect } from "react";
import { getMemory } from "@/utils/memory.ts";
import { tokenField } from "@/conf/bootstrap.ts";
import { apiEndpoint } from "@/conf/bootstrap.ts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import router from "@/router.tsx";

function AppProvider({ children }: { children?: React.ReactNode }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { receive } = useMessageActions();

  useEffect(() => {
    infoEvent.bind((data) => dispatch(setForm(data)));
    themeEvent.bind((theme) => dispatch(setTheme(theme)));

    stack.setCallback(async (id, message) => {
      await receive(id, message);
    });

    // Check for pending drawing tasks
    const token = getMemory(tokenField);
    if (token) {
      fetch(`${apiEndpoint}/v1/images/tasks`, {
        headers: {
          Authorization: token,
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.status && res.data) {
            toast.success(t("drawing.taskFound"), {
              description: t("drawing.taskFoundDesc"),
              action: {
                label: t("drawing.viewTask"),
                onClick: () => {
                  localStorage.setItem(
                    "drawing_results",
                    JSON.stringify(res.data),
                  );
                  router.navigate("/drawing");
                },
              },
            });
          }
        })
        .catch((err) => console.warn("[drawing] failed to check tasks", err));
    }
  }, []);

  useEffectAsync(async () => {
    updateSupportModels(dispatch, await bindMarket());
    dispatchSubscriptionData(dispatch, await getApiPlans());
    await updateMasks(dispatch);
  }, []);

  return (
    <ThemeProvider>
      <DialogManager />
      {children}
    </ThemeProvider>
  );
}

export default AppProvider;
