import SelectGroup, {
  GroupSelectItem,
  SelectItemProps,
} from "@/components/SelectGroup.tsx";
import {
  selectModel,
  selectModelList,
  selectSupportModels,
  setModel,
} from "@/store/chat.ts";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthenticated } from "@/store/auth.ts";
import { Model, Plans } from "@/api/types.tsx";
import { modelEvent } from "@/events/model.ts";
import { levelSelector } from "@/store/subscription.ts";
import { teenagerSelector } from "@/store/package.ts";
import { useMemo } from "react";
import {
  CloudOff,
  Gem,
  Sparkles,
  Kanban,
  Award,
  EyeIcon,
  Globe,
  DollarSign,
  Github,
  Image,
  Bolt,
  Snail,
  Cpu,
  Zap,
} from "lucide-react";
import { goAuth } from "@/utils/app.ts";
import { includingModelFromPlan } from "@/conf/subscription.tsx";
import { subscriptionDataSelector } from "@/store/globals.ts";
import router from "@/router.tsx";
import ModelAvatar from "@/components/ModelAvatar.tsx";
import {
  NativeSelectTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectGroup as SelectGroupUI,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select.tsx";
import { ChatAction } from "@/components/home/assemblies/ChatAction.tsx";
import Icon from "@/components/utils/Icon.tsx";
import { toast } from "sonner";

const tagIcons: { [key: string]: React.ReactNode } = {
  official: <Award />,
  "multi-modal": <EyeIcon />,
  web: <Globe />,
  "high-quality": <Sparkles />,
  "high-price": <DollarSign />,
  "open-source": <Github />,
  "image-generation": <Image />,
  fast: <Bolt />,
  unstable: <Snail />,
  "high-context": <Cpu />,
  free: <Zap />,
};

const notDisplayTags = ["official", "fast", "unstable", "free"];

function GetModel(models: Model[], name: string): Model {
  return models.find((model) => model.id === name) as Model;
}

type ModelSelectorProps = {
  side?: "left" | "right" | "top" | "bottom";
};

function formatModel(
  data: Plans,
  model: Model,
  level: number,
  t: (key: string) => string,
) {
  let badge = [];
  if (model.free) {
    badge.push({
      variant: "default",
      icon: <CloudOff className={`h-3 w-3`} />,
      tooltip: t("tag.free"),
    });
  } else if (includingModelFromPlan(data, level, model.id)) {
    badge.push({
      variant: "gold",
      icon: <Gem className={`h-3 w-3`} />,
      tooltip: t("tag.badges.plan-included"),
    });
  }

  const tags = model.tag || [];
  tags.forEach((tag) => {
    if (tagIcons[tag] && !notDisplayTags.includes(tag)) {
      badge.push({
        variant: tag,
        icon: <Icon icon={tagIcons[tag]} className={`h-3 w-3`} />,
        tooltip: t(`tag.${tag}`),
      });
    }
  });

  return {
    name: model.id,
    value: model.name,
    badge: badge.length > 0 ? badge : undefined,
    icon: <ModelAvatar size={24} model={model} />,
  } as SelectItemProps;
}

export default function ModelFinder(props: ModelSelectorProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const model = useSelector(selectModel);
  const auth = useSelector(selectAuthenticated);
  const level = useSelector(levelSelector);
  const student = useSelector(teenagerSelector);
  const list = useSelector(selectModelList);

  const supportModels = useSelector(selectSupportModels);
  const modelList = useSelector(selectModelList);
  const subscriptionData = useSelector(subscriptionDataSelector);

  modelEvent.bind((target: string) => {
    if (supportModels.find((m) => m.id === target)) {
      if (model === target) return;
      console.debug(`[chat] toggle model from event: ${target}`);
      dispatch(setModel(target));
    }
  });

  const models = useMemo(() => {
    const raw = list.length
      ? supportModels.filter((model) => list.includes(model.id))
      : supportModels.filter((model) => model.default);

    if (raw.length === 0)
      raw.push({
        name: "default",
        id: "default",
      } as Model);

    return raw.map((model) => formatModel(subscriptionData, model, level, t));
  }, [supportModels, subscriptionData, level, student, modelList, t]);

  const current = useMemo((): SelectItemProps => {
    const raw = models.find((item) => item.name === model);
    return raw || models[0];
  }, [models, model, supportModels, modelList]);

  return (
    <SelectGroup
      current={current}
      list={models}
      maxElements={3}
      side={props.side}
      classNameMobile={`model-select-group`}
      selectGroupTop={{
        icon: <Sparkles size={16} />,
        name: "market",
        value: t("market.model"),
      }}
      onChange={(value: string) => {
        if (value === "market") {
          router.navigate("/model");
          return;
        }
        const model = GetModel(supportModels, value);
        console.debug(`[model] select model: ${model.name} (id: ${model.id})`);

        if (!auth && model.auth) {
          toast(t("login-require"), {
            action: {
              label: t("login"),
              onClick: goAuth,
            },
          });
          return;
        }
        dispatch(setModel(value));
      }}
    />
  );
}

export function ModelArea() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const model = useSelector(selectModel);
  const auth = useSelector(selectAuthenticated);
  const level = useSelector(levelSelector);
  const student = useSelector(teenagerSelector);

  const supportModels = useSelector(selectSupportModels);
  const modelList = useSelector(selectModelList);
  const subscriptionData = useSelector(subscriptionDataSelector);

  modelEvent.bind((target: string) => {
    if (supportModels.find((m) => m.id === target)) {
      if (model === target) return;
      console.debug(`[chat] toggle model from event: ${target}`);
      dispatch(setModel(target));
    }
  });

  const models = useMemo(() => {
    const raw =
      supportModels.length > 0
        ? supportModels
        : [
            {
              name: "default",
              id: "default",
            } as Model,
          ];

    return raw.map((model) => formatModel(subscriptionData, model, level, t));
  }, [supportModels, subscriptionData, level, student, modelList, t]);

  const starredModels = useMemo(() => {
    return models.filter((model) => modelList.includes(model.name));
  }, [models, modelList]);

  const unstarredModels = useMemo(() => {
    return models.filter((model) => !modelList.includes(model.name));
  }, [models, modelList]);

  const showStarred = starredModels.length > 0;

  const current = useMemo((): SelectItemProps => {
    const raw = models.find((item) => item.name === model);
    return raw || models[0];
  }, [models, model, supportModels, modelList]);

  return (
    <Select
      value={current.name}
      onValueChange={(value: string) => {
        if (value === "market") {
          router.navigate("/model");
          return;
        }
        const model = GetModel(supportModels, value);
        console.debug(`[model] select model: ${model.name} (id: ${model.id})`);

        if (!auth && model.auth) {
          toast(t("login-require"), {
            action: {
              label: t("login"),
              onClick: goAuth,
            },
          });
          return;
        }
        dispatch(setModel(value));
      }}
    >
      <NativeSelectTrigger>
        <ChatAction text={t("model")}>
          <Icon icon={current.icon} className={`h-4 w-4`} />
        </ChatAction>
      </NativeSelectTrigger>
      <SelectContent>
        <SelectGroupUI>
          <SelectLabel>{t("market.title")}</SelectLabel>
          <SelectItem value="market">
            <GroupSelectItem
              icon={
                <Kanban
                  className={`h-6 w-6 p-1 rounded-full bg-amber-500/10 text-amber-500`}
                />
              }
              name="market"
              value={t("market.model")}
            />
          </SelectItem>
        </SelectGroupUI>
        <SelectSeparator />

        {showStarred && (
          <>
            <SelectGroupUI>
              <SelectLabel>{t("starred")}</SelectLabel>
              {starredModels.map((model, idx) => (
                <SelectItem key={idx} value={model.name}>
                  <GroupSelectItem {...model} />
                </SelectItem>
              ))}
            </SelectGroupUI>
            <SelectSeparator />
          </>
        )}

        <SelectGroupUI>
          <SelectLabel>{t("unstarred")}</SelectLabel>
          {unstarredModels.map((model, idx) => (
            <SelectItem key={idx} value={model.name}>
              <GroupSelectItem {...model} />
            </SelectItem>
          ))}
        </SelectGroupUI>
      </SelectContent>
    </Select>
  );
}
