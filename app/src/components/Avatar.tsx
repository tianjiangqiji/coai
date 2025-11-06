import { deeptrainApiEndpoint, useDeeptrain } from "@/conf/env.ts";
import { ImgHTMLAttributes, useMemo, useState, useEffect } from "react";
import { cn } from "@/components/ui/lib/utils.ts";
import { getUserInfo, UserInfo, initialUserInfo } from "@/api/auth.ts";
import md5 from "crypto-js/md5";
import { getConfig } from "@/admin/api/system";
import { useSelector, useDispatch } from "react-redux";
import { setAvatar } from "@/store/avatar";

export interface AvatarProps extends ImgHTMLAttributes<HTMLElement> {
  username: string;
}

async function checkGravatar(
  gravatar_endpoint: string,
  email: string,
): Promise<boolean> {
  if (!email || email === "root@example.com") {
    return false;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const hash = md5(trimmedEmail).toString();
  const uri = `${gravatar_endpoint}/avatar/${hash}?d=404`;

  try {
    const response = await fetch(uri);

    if (response.ok) {
      return true;
    }
    console.info("[avatar] gravatar not found:", trimmedEmail);
    return false;
  } catch (error) {
    console.error("[avatar] request failed:", error);
    return false;
  }
}
function Avatar({ username, ...props }: AvatarProps) {
  const dispatch = useDispatch();
  const cachedAvatarBlob = useSelector(
    (state: any) => state.avatar.avatars[username],
  );

  const [userInfo, setUserInfo] = useState<UserInfo>(initialUserInfo);
  const [hasAvatar, setHasAvatar] = useState(false);
  const [gravatar_endpoint, setGravatarEndpoint] = useState<string>("");

  useEffect(() => {
    getUserInfo().then((info) => setUserInfo(info?.data ?? initialUserInfo));
  }, []);

  useEffect(() => {
    getConfig().then((config) => {
      if (
        config.data.general.gravatar === undefined ||
        config.data.general.gravatar === ""
      ) {
        setGravatarEndpoint("");
        return;
      }
      setGravatarEndpoint(config.data.general.gravatar);
    });
  }, []);

  useEffect(() => {
    if (cachedAvatarBlob !== null) {
      setHasAvatar(true);
      return;
    }
    checkGravatar(gravatar_endpoint, userInfo.email).then((hasAvatar) => {
      setHasAvatar(hasAvatar);
      if (hasAvatar) {
        const avatarUrl = getGravatarUrl(userInfo.email);
        fetch(avatarUrl)
          .then((response) => response.blob())
          .then((blob) => {
            dispatch(setAvatar({ username, blob }));
          });
      }
    });
  }, [gravatar_endpoint, userInfo]);

  const code = useMemo(
    () => (username?.length > 0 ? username[0].toUpperCase() : "A"),
    [username],
  );

  const background = useMemo(() => {
    const colors = [
      "bg-gradient-to-br from-red-500 to-orange-500",
      "bg-gradient-to-br from-yellow-500 to-green-500",
      "bg-gradient-to-br from-green-500 to-teal-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-sky-500 to-blue-500",
      "bg-gradient-to-br from-pink-500 to-rose-500",
    ];
    const index = code.charCodeAt(0) % colors.length;
    return colors[index];
  }, [username]);
  const getGravatarUrl = (email: string | undefined) => {
    if (!email) return "";
    const trimmedEmail = email.trim().toLowerCase();
    const hash = md5(trimmedEmail).toString();
    if (!gravatar_endpoint) return "";
    return `${gravatar_endpoint}/avatar/${hash}?d=identicon`;
  };

  const avatarSrc =
    useDeeptrain && username.length > 0
      ? `${deeptrainApiEndpoint}/avatar/${username}`
      : hasAvatar && cachedAvatarBlob
      ? URL.createObjectURL(cachedAvatarBlob)
      : hasAvatar && userInfo.email
      ? getGravatarUrl(userInfo.email)
      : "";

  return avatarSrc ? (
    <img
      {...props}
      className={cn("w-10 h-10", props.className)}
      src={avatarSrc}
      alt=""
    />
  ) : (
    <div
      {...props}
      className={cn("avatar w-10 h-10 shadow", background, props.className)}
    >
      <p className={`text-white`}>{code}</p>
    </div>
  );
}

export default Avatar;
