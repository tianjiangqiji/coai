import "@/assets/pages/navbar.less";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  selectAuthenticated,
  selectUsername,
  validateToken,
} from "@/store/auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Menu, Settings2 } from "lucide-react";
import { useEffect } from "react";
import { tokenField } from "@/conf/bootstrap.ts";
import { toggleMenu } from "@/store/menu.ts";
import router from "@/router.tsx";
import MenuBar from "./MenuBar.tsx";
import { getMemory } from "@/utils/memory.ts";
import { goAuth } from "@/utils/app.ts";
import Avatar from "@/components/Avatar.tsx";
import { appLogo } from "@/conf/env.ts";
import { refreshQuota } from "@/store/quota.ts";
import { refreshSubscription } from "@/store/subscription.ts";
import { useEffectAsync } from "@/utils/hook.ts";
import { AppDispatch, clearCronJobs, createCronJob } from "@/store";
import { openDialog } from "@/store/settings.ts";
import ThemeToggle from "@/components/ThemeProvider.tsx";
import ProjectLink from "@/components/ProjectLink.tsx";

function NavMenu() {
  const username = useSelector(selectUsername);

  return (
    <div className={`avatar`}>
      <MenuBar>
        <Button
          variant={`ghost`}
          size={`icon-md`}
          className={`rounded-full overflow-hidden`}
          unClickable
        >
          <Avatar username={username} className={`w-9 h-9 rounded-full`} />
        </Button>
      </MenuBar>
    </div>
  );
}

function NavBar() {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    validateToken(dispatch, getMemory(tokenField));
  }, []);
  const auth = useSelector(selectAuthenticated);

  useEffectAsync(async () => {
    if (!auth) return;

    const quotaTask = createCronJob(dispatch, refreshQuota, 30, true);
    const planTask = createCronJob(dispatch, refreshSubscription, 30, true);

    console.log(
      `[cron] register quota and plan fetching tasks: ${quotaTask}, ${planTask}`,
    );

    return () => clearCronJobs([quotaTask, planTask]);
  }, [auth]);

  return (
    <nav className={`navbar`}>
      <div className={`items space-x-2`}>
        <Button
          size={`icon-md`}
          variant={`ghost`}
          className={`sidebar-button`}
          onClick={() => dispatch(toggleMenu())}
        >
          <Menu className={`w-5 h-5`} />
        </Button>
        <img
          className={`logo w-9 h-9 scale-110`}
          src={appLogo}
          alt=""
          onClick={() => router.navigate("/")}
        />
        <div className={`grow`} />
        <ProjectLink />
        <ThemeToggle size="icon-md" className={`rounded-full overflow-hidden`} />
        <Button
          size={`icon-md`}
          variant={`outline`}
          className={`rounded-full overflow-hidden`}
          onClick={() => dispatch(openDialog())}
        >
          <Settings2 className={`w-4 h-4`} />
        </Button>
        {auth ? (
          <NavMenu />
        ) : (
          <Button size={`thin`} className={`rounded-full`} onClick={goAuth}>
            {t("login")}
          </Button>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
