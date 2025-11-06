import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useTranslation } from "react-i18next";
import React, {
  Dispatch,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { Model as RawModel } from "@/api/types.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Import,
  Maximize,
  Minimize,
  Plus,
  RotateCw,
  Save,
  Trash2,
  UploadIcon,
} from "lucide-react";
import { generateRandomChar } from "@/utils/base.ts";
import { Textarea } from "@/components/ui/textarea.tsx";
import Tips from "@/components/Tips.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import { deprecatedModelImages, marketEditableTags } from "@/admin/market.ts";
import { Button, UploadFileButton } from "@/components/ui/button.tsx";
import { Combobox } from "@/components/ui/combo-box.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import PopupDialog, { popupTypes } from "@/components/PopupDialog.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { getApiMarket, getModelName, getV1Path } from "@/api/v1.ts";
import { updateMarket } from "@/admin/api/market.ts";
import { toast } from "sonner";
import { useChannelModels, useSupportModels } from "@/admin/hook.tsx";
import Icon from "@/components/utils/Icon.tsx";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { Label } from "@/components/ui/label.tsx";
import { uploadResource } from "@/admin/api/system.ts";
import { withNotify } from "@/api/common.ts";

type Model = RawModel & {
  seed?: string;
};

type MarketForm = Model[];

const generateSeed = () => generateRandomChar(8);

function reducer(state: MarketForm, action: any): MarketForm {
  switch (action.type) {
    case "set":
      return [
        ...action.payload.map((model: RawModel) => ({
          ...model,
          seed: generateSeed(),
        })),
      ];
    case "add":
      return [
        ...state,
        {
          ...action.payload,
          seed: generateSeed(),
        },
      ];
    case "add-multiple":
      return [
        ...state,
        ...action.payload.map((model: RawModel) => ({
          id: model.id || "",
          name: model.name || "",
          free: false,
          auth: false,
          description: model.description || "",
          high_context: model.high_context || false,
          default: model.default || false,
          tag: model.tag || [],
          avatar: model.avatar || "",
          seed: generateSeed(),
        })),
      ];
    case "new":
      return [
        ...state,
        {
          id: "",
          name: "",
          free: false,
          auth: false,
          description: "",
          high_context: false,
          default: false,
          tag: [],
          avatar: "",
          seed: generateSeed(),
        },
      ];
    case "new-template":
      return [
        {
          id: action.payload.id,
          name: action.payload.name,
          free: false,
          auth: false,
          description: "",
          high_context: false,
          default: true,
          tag: [],
          avatar: "",
          seed: generateSeed(),
        },
        ...state,
      ];
    case "batch-new-template":
      return [
        ...action.payload.map((model: { id: string; name: string }) => ({
          id: model.id,
          name: model.name,
          free: false,
          auth: false,
          description: "",
          high_context: false,
          default: true,
          tag: [],
          avatar: "",
          seed: generateSeed(),
        })),
        ...state,
      ];
    case "remove":
      let { idx } = action.payload;
      return [...state.slice(0, idx), ...state.slice(idx + 1)];
    case "update":
      let { index, data } = action.payload;
      return [...state.slice(0, index), data, ...state.slice(index + 1)];
    case "update-id":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, id: action.payload.id };
          }
          return model;
        }),
      ];
    case "update-name":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, name: action.payload.name };
          }
          return model;
        }),
      ];
    case "update-description":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, description: action.payload.description };
          }
          return model;
        }),
      ];
    case "update-context":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, high_context: action.payload.context };
          }
          return model;
        }),
      ];
    case "update-default":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, default: action.payload.default };
          }
          return model;
        }),
      ];
    case "update-function-calling":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, function_calling: action.payload.default };
          }
          return model;
        }),
      ];
    case "update-vision-model":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, vision_model: action.payload.default };
          }
          return model;
        }),
      ];
    case "update-thinking-model":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, thinking_model: action.payload.default };
          }
          return model;
        }),
      ];
    case "update-ocr-model":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, ocr_model: action.payload.default };
          }
          return model;
        }),
      ];
    case "update-reverse-model":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, reverse_model: action.payload.default };
          }
          return model;
        }),
      ];
    case "update-tags":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, tag: action.payload.tags };
          }
          return model;
        }),
      ];
    case "add-tag":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            const tag = model.tag || [];
            tag.push(action.payload.tag);
            return {
              ...model,
              tag: [...tag],
            };
          }
          return model;
        }),
      ];
    case "remove-tag":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            const tag = model.tag || [];
            return {
              ...model,
              tag: tag.filter((t) => t !== action.payload.tag),
            };
          }
          return model;
        }),
      ];
    case "set-avatar":
      return [
        ...state.map((model, idx) => {
          if (idx === action.payload.idx) {
            return { ...model, avatar: action.payload.avatar };
          }
          return model;
        }),
      ];
    case "replace":
      const { from, to } = action.payload;
      const [removed] = state.splice(from, 1);
      state.splice(to, 0, removed);
      return [...state];
    case "add-below":
      return [
        ...state.slice(0, action.payload.idx + 1),
        {
          id: "",
          name: "",
          free: false,
          auth: false,
          description: "",
          high_context: false,
          default: false,
          tag: [],
          avatar: "",
          seed: generateSeed(),
        },
        ...state.slice(action.payload.idx + 1),
      ];
    case "upward":
      if (action.payload.idx === 0) return state;
      const upward = state[action.payload.idx];
      state[action.payload.idx] = state[action.payload.idx - 1];
      state[action.payload.idx - 1] = upward;
      return [...state];
    case "downward":
      if (action.payload.idx === state.length - 1) return state;
      const downward = state[action.payload.idx];
      state[action.payload.idx] = state[action.payload.idx + 1];
      state[action.payload.idx + 1] = downward;
      return [...state];
    case "move":
      const { fromIndex, toIndex } = action.payload;
      const moved = state[fromIndex];
      state.splice(fromIndex, 1);
      state.splice(toIndex, 0, moved);
      return [...state];
    default:
      throw new Error();
  }
}

type MarketTagsProps = {
  tag: string[] | undefined;
  idx: number;
  dispatch: Dispatch<any>;
};

function MarketTags({ tag, idx, dispatch }: MarketTagsProps) {
  const { t } = useTranslation();
  const tags = useMemo((): Record<string, boolean> => {
    const selected = tag || [];

    return marketEditableTags.reduce(
      (acc, name) => {
        acc[name] = selected.includes(name);
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [tag]);

  return (
    <div className={`market-tags`}>
      {tags &&
        Object.keys(tags).map((name) => (
          <Toggle
            key={name}
            variant={`outline`}
            size={`sm`}
            pressed={tags[name]}
            className={`market-tag`}
            onPressedChange={(state) => {
              dispatch({
                type: state ? "add-tag" : "remove-tag",
                payload: {
                  idx,
                  tag: name,
                },
              });
            }}
          >
            {t(`tag.${name}`)}
          </Toggle>
        ))}
    </div>
  );
}

type MarketImageProps = {
  image: string;
  idx: number;
  dispatch: Dispatch<any>;
};

function CustomMarketImage({ image, idx, dispatch }: MarketImageProps) {
  const { t } = useTranslation();
  const [customizedImage, setCustomizedImage] = useState<boolean>(
    image.trim().length > 0 && !deprecatedModelImages.includes(image),
  );

  const setAvatar = (source: string) =>
    dispatch({
      type: "set-avatar",
      payload: {
        idx,
        avatar: source,
      },
    });

  useEffect(() => {
    if (!customizedImage) {
      setAvatar("");
    }
  }, [customizedImage]);

  return (
    <>
      <div className={`market-row flex flex-row items-center`}>
        <Label>{t("admin.market.custom-image")}</Label>
        <div className={`grow`} />
        <Switch
          checked={customizedImage}
          onCheckedChange={setCustomizedImage}
        />
      </div>
      {customizedImage && (
        <div
          className={`market-row flex flex-row !flex-nowrap items-center market-custom-image !gap-0`}
        >
          <UploadFileButton
            onFileChange={async (file) => {
              const resp = await uploadResource(file);
              withNotify(t, resp, true);
              if (resp.status) {
                resp.url && setAvatar(resp.url);
              }
            }}
            variant={`outline`}
            size={`icon`}
            className={`!mr-1 shrink-0`}
          >
            <UploadIcon className={`h-4 w-4`} />
          </UploadFileButton>
          <Input
            value={image}
            placeholder={t("admin.market.custom-image-placeholder")}
            onChange={(e) => {
              setAvatar(e.target.value);
            }}
          />
        </div>
      )}
    </>
  );
}

type MarketItemProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  model: Model;
  form: MarketForm;
  dispatch: Dispatch<any>;
  index: number;
  stacked: boolean;
  channelModels: string[];
  forwardRef?: React.Ref<HTMLDivElement>;
};

function MarketItem({
  model,
  form,
  stacked,
  dispatch,
  index,
  channelModels,
  forwardRef,
  ...props
}: MarketItemProps) {
  const { t } = useTranslation();

  const [stackedFilled, setStackedFilled] = useState<boolean>(false);

  const checked = useMemo(
    (): boolean => model.id.trim().length > 0 && model.name.trim().length > 0,
    [model],
  );

  useEffect(() => {
    setStackedFilled(stacked);
  }, [stacked]);

  const Actions = ({ stacked }: { stacked?: boolean }) => (
    <div className={`market-row`}>
      {!stacked && <div className={`grow`} />}
      <Button
        size={`icon`}
        variant={`outline`}
        onClick={() =>
          dispatch({
            type: "add-below",
            payload: { idx: index },
          })
        }
      >
        <Plus className={`h-4 w-4`} />
      </Button>

      {!stacked && (
        <Button
          size={`icon`}
          variant={`outline`}
          onClick={() =>
            dispatch({
              type: "upward",
              payload: { idx: index },
            })
          }
          disabled={index === 0}
        >
          <ChevronUp className={`h-4 w-4`} />
        </Button>
      )}

      {!stacked && (
        <Button
          size={`icon`}
          variant={`outline`}
          onClick={() =>
            dispatch({
              type: "downward",
              payload: { idx: index },
            })
          }
          disabled={index === form.length - 1}
        >
          <ChevronDown className={`h-4 w-4`} />
        </Button>
      )}

      <Button
        size={`icon`}
        variant={`outline`}
        onClick={() => setStackedFilled(!stackedFilled)}
      >
        {!stackedFilled ? (
          <Minimize className={`h-4 w-4`} />
        ) : (
          <Maximize className={`h-4 w-4`} />
        )}
      </Button>

      <Button
        size={`icon`}
        onClick={() =>
          dispatch({
            type: "remove",
            payload: { idx: index },
          })
        }
      >
        <Trash2 className={`h-4 w-4`} />
      </Button>
    </div>
  );

  return stackedFilled ? (
    <div
      className={cn("market-item", !checked && "error")}
      {...props}
      ref={forwardRef}
    >
      <div className={`model-wrapper`}>
        <div
          className={`flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-x-4`}
        >
          <div className={`market-row md:!flex-nowrap`}>
            <span>{t("admin.market.model-name")}</span>
            <Input
              value={model.name}
              className={`max-w-[320px] ml-auto`}
              placeholder={t("admin.market.model-name-placeholder")}
              onChange={(e) => {
                dispatch({
                  type: "update-name",
                  payload: {
                    idx: index,
                    name: e.target.value,
                  },
                });
              }}
            />
          </div>
          <div className={`market-row md:!flex-nowrap`}>
            <span>{t("admin.market.model-id")}</span>
            <Combobox
              value={model.id}
              onChange={(id: string) => {
                dispatch({
                  type: "update-id",
                  payload: { idx: index, id },
                });
              }}
              className={`model-combobox`}
              list={channelModels}
              placeholder={t("admin.market.model-id-placeholder")}
            />
          </div>
          <div className={`market-row col-span-2`}>
            <span>{t("admin.market.model-description")}</span>
            <Textarea
              value={model.description || ""}
              placeholder={t("admin.market.model-description-placeholder")}
              onChange={(e) => {
                dispatch({
                  type: "update-description",
                  payload: {
                    idx: index,
                    description: e.target.value,
                  },
                });
              }}
            />
          </div>
          <div className={`market-row`}>
            <span>
              {t("admin.market.model-context")}
              <Tips content={t("admin.market.model-context-tip")} />
            </span>
            <Switch
              className={`ml-auto`}
              checked={model.high_context}
              onCheckedChange={(state) => {
                dispatch({
                  type: "update-context",
                  payload: {
                    idx: index,
                    context: state,
                  },
                });
              }}
            />
          </div>
          {/*function-calling*/}
          <div className={`market-row`}>
            <span>
              {t("admin.market.function-calling")}
              <Tips content={t("admin.market.function-calling-tip")} />
            </span>
            <Switch
              className={`ml-auto`}
              checked={model.function_calling || false}
              onCheckedChange={(state) => {
                dispatch({
                  type: "update-function-calling",
                  payload: {
                    idx: index,
                    default: state,
                  },
                });
              }}
            />
          </div>
          <div className={`market-row`}>
            <span>
              {t("admin.market.vision-model")}
              <Tips content={t("admin.market.vision-model-tip")} />
            </span>
            <Switch
              className={`ml-auto`}
              checked={model.vision_model || false}
              onCheckedChange={(state) => {
                dispatch({
                  type: "update-vision-model",
                  payload: {
                    idx: index,
                    default: state,
                  },
                });
              }}
            />
          </div>
          <div className={`market-row`}>
            <span>
              {t("admin.market.thinking-model")}
              <Tips content={t("admin.market.thinking-model-tip")} />
            </span>
            <Switch
              className={`ml-auto`}
              checked={model.thinking_model || false}
              onCheckedChange={(state) => {
                dispatch({
                  type: "update-thinking-model",
                  payload: {
                    idx: index,
                    default: state,
                  },
                });
              }}
            />
          </div>
          <div className={`market-row`}>
            <span>
              {t("admin.market.reverse-model")}
              <Tips
                hideTimeout={20000}
                content={t("admin.market.reverse-model-tip")}
              />
            </span>
            <Switch
              className={`ml-auto`}
              checked={model.reverse_model || false}
              onCheckedChange={(state) => {
                dispatch({
                  type: "update-reverse-model",
                  payload: {
                    idx: index,
                    default: state,
                  },
                });
              }}
            />
          </div>
          <div className={`market-row`}>
            <span>
              {t("admin.market.ocr-model")}
              <Tips content={t("admin.market.ocr-model-tip")} />
            </span>
            <Switch
              className={`ml-auto`}
              checked={model.ocr_model || false}
              onCheckedChange={(state) => {
                dispatch({
                  type: "update-ocr-model",
                  payload: {
                    idx: index,
                    default: state,
                  },
                });
              }}
            />
          </div>
          <CustomMarketImage
            image={model.avatar}
            idx={index}
            dispatch={dispatch}
          />
        </div>
        <div className={`market-row`}>
          <span>{t("admin.market.model-tag")}</span>
          <MarketTags tag={model.tag} idx={index} dispatch={dispatch} />
        </div>
        <Actions />
      </div>
    </div>
  ) : (
    <div
      className={cn("market-item stacked", !checked && "error")}
      {...props}
      ref={forwardRef}
    >
      <GripVertical className={`h-4 w-4 mr-2 cursor-pointer`} />
      <Input
        value={model.name}
        placeholder={t("admin.market.model-name-placeholder")}
        className={`grow mr-2`}
        onChange={(e) => {
          dispatch({
            type: "update-name",
            payload: {
              idx: index,
              name: e.target.value,
            },
          });
        }}
      />
      <Actions stacked={true} />
    </div>
  );
}

type MarketGroupProps = {
  form: MarketForm;
  dispatch: Dispatch<any>;
  stacked: boolean;
  channelModels: string[];
};

function MarketGroup({
  form,
  dispatch,
  stacked,
  channelModels,
}: MarketGroupProps) {
  return form.map((model, index) => (
    <Draggable
      key={model.seed as string}
      draggableId={model.seed as string}
      index={index}
    >
      {(provided) => (
        <MarketItem
          key={index}
          model={model}
          form={form}
          stacked={stacked}
          dispatch={dispatch}
          index={index}
          channelModels={channelModels}
          forwardRef={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        />
      )}
    </Draggable>
  ));
}

type SyncDialogProps = {
  open: boolean;
  setOpen: (state: boolean) => void;
  onConfirm: (form: MarketForm) => Promise<boolean>;
  allModels: string[];
  supportModels: Model[];
};

function SyncDialog({
  open,
  setOpen,
  allModels,
  supportModels,
  onConfirm,
}: SyncDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<MarketForm>([]);

  const siteModels = useMemo(
    (): string[] => form.map((model) => model.id),
    [form],
  );
  const existModels = useMemo(
    (): string[] =>
      supportModels
        .filter((model) => siteModels.includes(model.id))
        .map((model) => model.id),
    [siteModels, supportModels],
  );
  const newModels = useMemo(
    (): string[] => siteModels.filter((model) => !existModels.includes(model)),
    [siteModels, existModels],
  );
  const newSupportedModels = useMemo(
    (): string[] => newModels.filter((model) => allModels.includes(model)),
    [newModels, allModels],
  );

  return (
    <>
      <Dialog
        open={form.length > 0}
        onOpenChange={(open: boolean) => {
          if (open) return;
          setOpen(false);
          setForm([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.market.sync-option")}</DialogTitle>
            <DialogDescription>
              {t("admin.market.sync-items", {
                length: siteModels.length,
                exist: existModels.length,
                new: newModels.length,
                support: newSupportedModels.length,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              unClickable
              variant={`outline`}
              loading={true}
              onClick={async () => {
                const target = form.filter((model) =>
                  newModels.includes(model.id),
                );
                if (await onConfirm(target)) {
                  setForm([]);
                  setOpen(false);
                }
              }}
              disabled={newModels.length === 0}
            >
              {t("admin.market.sync-all", { length: newModels.length })}
            </Button>
            <Button
              unClickable
              loading={true}
              onClick={async () => {
                const target = form.filter((model) =>
                  newSupportedModels.includes(model.id),
                );
                if (await onConfirm(target)) {
                  setForm([]);
                  setOpen(false);
                }
              }}
              disabled={newSupportedModels.length === 0}
            >
              {t("admin.market.sync-self", {
                length: newSupportedModels.length,
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PopupDialog
        title={t("admin.market.sync")}
        name={t("admin.market.sync-site")}
        placeholder={t("admin.market.sync-placeholder")}
        open={open}
        setOpen={setOpen}
        type={popupTypes.Text}
        defaultValue={"https://api.chatnio.net"}
        onSubmit={async (endpoint: string) => {
          const raw = getV1Path("/v1/market", { endpoint });
          const resp = await getApiMarket({ endpoint });
          if (resp.length === 0) {
            toast.info(t("admin.market.sync-failed"), {
              description: t("admin.market.sync-failed-prompt", {
                endpoint: raw,
              }),
            });
            return false;
          }

          setForm(resp);
          return false;
        }}
      />
    </>
  );
}

type MarketAlertProps = {
  open: boolean;
  models: string[];
  onImport: (model: string) => void;
  onImportAll: () => void;
};

function MarketAlert({
  open,
  models,
  onImport,
  onImportAll,
}: MarketAlertProps) {
  const { t } = useTranslation();

  return (
    open &&
    models.length > 0 && (
      <div className={`market-alert`}>
        <div
          className={`flex flex-row items-center mb-2 whitespace-nowrap select-none`}
        >
          <AlertCircle className={`h-4 w-4 mr-2 translate-y-[1px]`} />
          <span>{t("admin.market.not-use")}</span>
          <Button
            variant={`outline`}
            size={`sm`}
            className={`ml-auto`}
            onClick={onImportAll}
          >
            <Import className={`h-4 w-4 mr-2`} />
            {t("admin.market.import-all")}
          </Button>
        </div>
        <div className={`market-alert-wrapper`}>
          {models.map((model, index) => (
            <Button
              key={index}
              variant={`outline`}
              size={`sm`}
              className={`text-sm`}
              onClick={() => onImport(model)}
            >
              {model}
            </Button>
          ))}
        </div>
      </div>
    )
  );
}

function Market() {
  const { t } = useTranslation();

  const [stepSupport, setStepSupport] = useState<boolean>(false);
  const [stepAll, setStepAll] = useState<boolean>(false);

  const [stacked, setStacked] = useState<boolean>(true);

  const [form, dispatch] = useReducer(reducer, []);
  const [open, setOpen] = useState<boolean>(false);

  const { supportModels, update: updateSuppportModels } = useSupportModels(
    (state, data) => {
      setStepSupport(!state);
      state && dispatch({ type: "set", payload: data });
    },
  );

  const {
    allModels,
    channelModels,
    update: updateAllModels,
  } = useChannelModels((state) => setStepAll(!state));

  const unusedModels = useMemo(
    (): string[] =>
      allModels.filter((model) => !form.map((m) => m.id).includes(model)),
    [form, allModels],
  );

  const loading = stepSupport || stepAll;
  const update = async () => {
    await updateSuppportModels();
    await updateAllModels();
  };

  const sync = async (): Promise<void> => {};

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (
      !destination ||
      destination.index === source.index ||
      destination.index === -1
    )
      return;

    const from = source.index;
    const to = destination.index;

    dispatch({
      type: "move",
      payload: {
        fromIndex: from,
        toIndex: to,
      },
    });
  };

  const submit = async (): Promise<void> => {
    const preflight = form.filter(
      (model) => model.id.trim().length > 0 && model.name.trim().length > 0,
    );
    const resp = await updateMarket(preflight);

    if (!resp.status) {
      toast(t("admin.market.update-failed"), {
        description: t("admin.market.update-failed-prompt", {
          reason: resp.error,
        }),
      });
      return;
    }

    toast(t("admin.market.update-success"), {
      description: t("admin.market.update-success-prompt"),
    });
    await sync();
  };

  const migrate = async (data: RawModel[]): Promise<void> => {
    if (data.length === 0) return;
    dispatch({ type: "add-multiple", payload: [...data] });
  };

  return (
    <div className={`market`}>
      <SyncDialog
        open={open}
        setOpen={setOpen}
        allModels={allModels}
        supportModels={supportModels}
        onConfirm={async (data: MarketForm) => {
          await migrate(data);
          toast(t("admin.market.sync-success"), {
            description: t("admin.market.sync-success-prompt", {
              length: data.length,
            }),
          });

          return true;
        }}
      />
      <Card className={`admin-card market-card`}>
        <CardHeader>
          <CardTitle>{t("admin.market.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`market-actions flex flex-row items-center mb-4`}>
            <Button
              variant={`outline`}
              className={`whitespace-nowrap`}
              onClick={() => setOpen(true)}
            >
              <Activity className={`h-4 w-4 mr-2`} />
              {t("admin.market.sync")}
            </Button>
            <div className={`grow`} />
            <Button
              variant={`outline`}
              size={`icon`}
              className={`mr-2`}
              onClick={() => setStacked(!stacked)}
            >
              <Icon
                icon={!stacked ? <Minimize /> : <Maximize />}
                className={`h-4 w-4`}
              />
            </Button>
            <Button
              size={`icon`}
              variant={`outline`}
              className={`mr-2`}
              onClick={update}
            >
              <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              size={`icon`}
              className={`mr-2`}
              loading={true}
              onClick={submit}
            >
              <Save className={`h-4 w-4`} />
            </Button>
          </div>
          <MarketAlert
            open={!loading}
            models={unusedModels}
            onImport={(model: string) => {
              dispatch({
                type: "new-template",
                payload: {
                  id: model,
                  name: getModelName(model),
                },
              });
            }}
            onImportAll={() => {
              dispatch({
                type: "batch-new-template",
                payload: unusedModels.map((model) => ({
                  id: model,
                  name: getModelName(model),
                })),
              });
            }}
          />
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={`market-list`}>
              {(provided) => (
                <div
                  className={`market-list cursor-default`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {form.length > 0 ? (
                    <MarketGroup
                      form={form}
                      dispatch={dispatch}
                      stacked={stacked}
                      channelModels={channelModels}
                    />
                  ) : (
                    <p className={`align-center text-sm empty`}>
                      {t("admin.empty")}
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <div className={`market-footer flex flex-row items-center mt-4`}>
            <div className={`grow`} />
            <Button
              size={`sm`}
              variant={`outline`}
              className={`mr-2`}
              onClick={() => dispatch({ type: "new" })}
            >
              <Plus className={`h-4 w-4 mr-2`} />
              {t("admin.market.new-model")}
            </Button>
            <Button size={`sm`} onClick={submit} loading={true}>
              {t("admin.market.migrate")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Market;
