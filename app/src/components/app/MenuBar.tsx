import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  logout,
  selectAdmin,
  selectAuthenticated,
  selectUsername,
} from "@/store/auth.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import router from "@/router.tsx";
import React from "react";
import {
  LibraryBig,
  MessageCircle,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import Icon from "@/components/utils/Icon.tsx";

type MenuBarProps = {
  children: React.ReactNode;
  className?: string;
};

type MenuBarItemProps = {
  icon: React.ReactElement;
  path: string;
  name: string;
};

const BarItem = ({ icon, path, name }: MenuBarItemProps) => {
  const { t } = useTranslation();
  const navigate = () => router.navigate(path);

  return (
    <DropdownMenuItem onClick={navigate}>
      <Icon icon={icon} className={`w-4 h-4 mr-1.5`} />
      {t(`bar.${name}-full`)}
    </DropdownMenuItem>
  );
};

function MenuBar({ children, className }: MenuBarProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const auth = useSelector(selectAuthenticated);
  const username = useSelector(selectUsername);
  const admin = useSelector(selectAdmin);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className={className} align={`end`}>
        {auth ? (
          <>
            <DropdownMenuLabel className={`username`}>
              {username}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <BarItem icon={<MessageCircle />} path={`/`} name={"chat"} />
            <BarItem icon={<LibraryBig />} path={`/model`} name={"model"} />
            {/* <BarItem icon={<Compass />} path={`/preset`} name={"preset"} /> */}
            <BarItem icon={<Wallet />} path={`/wallet`} name={"wallet"} />
            {/* <BarItem icon={<DraftingCompass />} path={`/key`} name={"key"} /> */}
            <BarItem icon={<User />} path={`/account`} name={"account"} />
            {/* <BarItem icon={<PieChart />} path={`/log`} name={"log"} /> */}
            {admin && (
              <BarItem icon={<Shield />} path={`/admin`} name={"admin"} />
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Button
                size={`sm`}
                className={`action-button`}
                onClick={() => dispatch(logout())}
              >
                {t("logout")}
              </Button>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Button
              size={`sm`}
              className={`h-max w-full cursor-pointer`}
              onClick={() => router.navigate("/login")}
            >
              {t("login")}
            </Button>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MenuBar;
