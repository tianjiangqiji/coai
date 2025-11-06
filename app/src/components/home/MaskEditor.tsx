import { CustomMask, initialCustomMask } from "@/masks/types.ts";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthenticated } from "@/store/auth.ts";
import { themeSelector } from "@/store/globals.ts";
import React, { useState } from "react";
import { saveMask } from "@/api/mask.ts";
import { withNotify } from "@/api/common.ts";
import { updateMasks } from "@/store/chat.ts";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import EditorProvider from "@/components/EditorProvider.tsx";
import Tips from "@/components/Tips.tsx";
import { Button } from "@/components/ui/button.tsx";
import Emoji, { getEmojiSource } from "@/components/Emoji.tsx";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Input } from "@/components/ui/input.tsx";
import { FlexibleTextarea } from "@/components/ui/textarea.tsx";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash } from "lucide-react";
import { cn } from "@/components/ui/lib/utils.ts";
import { getRoleIcon, Roles, UserRole } from "@/api/types.tsx";
import Icon from "@/components/utils/Icon.tsx";

export function maskEditorReducer(state: CustomMask, action: any): CustomMask {
  switch (action.type) {
    case "update-avatar":
      return { ...state, avatar: action.payload };
    case "update-name":
      return { ...state, name: action.payload };
    case "update-description":
      return { ...state, description: action.payload };
    case "set-conversation":
      return {
        ...state,
        context: action.payload,
      };
    case "new-message":
      return {
        ...state,
        context: [...state.context, { role: UserRole, content: "" }],
      };
    case "new-message-below":
      return {
        ...state,
        context: [
          ...state.context.slice(0, action.index + 1),
          { role: UserRole, content: "" },
          ...state.context.slice(action.index + 1),
        ],
      };
    case "update-message-role":
      return {
        ...state,
        context: state.context.map((item, idx) => {
          if (idx === action.index) return { ...item, role: action.payload };
          return item;
        }),
      };
    case "update-message-content":
      return {
        ...state,
        context: state.context.map((item, idx) => {
          if (idx === action.index) return { ...item, content: action.payload };
          return item;
        }),
      };
    case "change-index":
      const { from, to } = action.payload;
      const context = [...state.context];
      const [removed] = context.splice(from, 1);
      context.splice(to, 0, removed);
      return { ...state, context };
    case "remove-message":
      return {
        ...state,
        context: state.context.filter((_, idx) => idx !== action.index),
      };
    case "reset":
      return { ...initialCustomMask };
    case "set-mask":
      return {
        ...action.payload,
      };
    case "import-mask":
      return {
        ...action.payload,
        description: action.payload.description || "",
        id: -1,
      };
    default:
      return state;
  }
}

type RoleActionProps = {
  role: string;
  onClick: (role: string) => void;
};

function RoleAction({ role, onClick }: RoleActionProps) {
  const icon = getRoleIcon(role);

  const toggle = () => {
    const index = Roles.indexOf(role);
    const next = (index + 1) % Roles.length;

    onClick(Roles[next]);
  };

  return (
    <Button
      variant={`outline`}
      size={`icon`}
      className={`shrink-0`}
      onClick={toggle}
    >
      <Icon icon={icon} className={`h-4 w-4`} />
    </Button>
  );
}

type MaskActionProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

function MaskAction({ children, disabled, onClick }: MaskActionProps) {
  return (
    <div
      className={cn(`mask-action`, disabled && "disabled")}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  );
}

type CustomMaskDialogProps = {
  mask: CustomMask;
  dispatch: (action: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function MaskEditor({
  mask,
  dispatch,
  open,
  onOpenChange,
}: CustomMaskDialogProps) {
  const { t } = useTranslation();

  const auth = useSelector(selectAuthenticated);
  const theme = useSelector(themeSelector);

  const [picker, setPicker] = useState(false);

  const [editor, setEditor] = useState(false);
  const [editorIndex, setEditorIndex] = useState(-1);

  const global = useDispatch();

  const openEditor = (index: number) => {
    setEditorIndex(index);
    setEditor(true);
  };

  const post = async () => {
    const data = { ...mask };
    data.context = mask.context.filter(
      (item) => item.content.trim().length > 0,
    );

    if (data.name.trim().length === 0) return;
    if (data.context.length === 0) return;

    const resp = await saveMask(data);
    withNotify(t, resp, true);

    if (!resp.status) return;

    await updateMasks(global);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className={`mask-drawer-viewport py-4 max-w-[620px] mx-auto`}>
          <DrawerHeader>
            <DrawerTitle className={`text-center mb-4`}>
              {mask.id !== -1 ? t("mask.edit") : t("mask.create")}
            </DrawerTitle>
            <DrawerDescription>
              <EditorProvider
                value={editor ? mask.context[editorIndex].content : ""}
                onChange={(content) =>
                  dispatch({
                    type: "update-message-content",
                    index: editorIndex,
                    payload: content,
                  })
                }
                open={editor}
                setOpen={setEditor}
              />
              <div
                className={`mask-editor-container no-scrollbar max-h-[60vh] overflow-y-auto`}
              >
                <div className={`mask-editor-row`}>
                  <div className={`mask-editor-column`}>
                    <p>{t("mask.avatar")}</p>
                    <div className={`grow`} />

                    <Tips
                      trigger={
                        <Button
                          variant={`outline`}
                          size={`icon`}
                          className={`shrink-0`}
                        >
                          <Emoji emoji={mask.avatar} className={`h-6 w-6`} />
                        </Button>
                      }
                      open={picker}
                      onOpenChange={setPicker}
                      align={`end`}
                      classNamePopup={`mask-picker-dialog`}
                      notHide
                    >
                      <EmojiPicker
                        className={`picker`}
                        height={360}
                        lazyLoadEmojis
                        skinTonesDisabled
                        theme={theme as Theme}
                        open={true}
                        searchPlaceHolder={t("mask.search-emoji")}
                        getEmojiUrl={getEmojiSource}
                        onEmojiClick={(emoji) => {
                          setPicker(false);
                          dispatch({
                            type: "update-avatar",
                            payload: emoji.unified,
                          });
                        }}
                      />
                    </Tips>
                  </div>
                  <div className={`mask-editor-column`}>
                    <p>{t("mask.name")}</p>
                    <Input
                      value={mask.name}
                      className={`ml-4`}
                      placeholder={t("mask.name-placeholder")}
                      onChange={(e) =>
                        dispatch({
                          type: "update-name",
                          payload: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={`mask-editor-column`}>
                    <p>{t("mask.description")}</p>
                    <FlexibleTextarea
                      value={mask.description || ""}
                      className={`ml-4`}
                      placeholder={t("mask.description-placeholder")}
                      onChange={(e) =>
                        dispatch({
                          type: "update-description",
                          payload: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className={`mask-conversation-list`}>
                  <div className={`mask-conversation-title`}>
                    {t("mask.conversation")}
                  </div>
                  {mask.context.map((item, index) => (
                    <div key={index} className={`mask-conversation-wrapper`}>
                      <div className={`mask-conversation`}>
                        <RoleAction
                          role={item.role}
                          onClick={(role) =>
                            dispatch({
                              type: "update-message-role",
                              index,
                              payload: role,
                            })
                          }
                        />
                        <FlexibleTextarea
                          className={`ml-4`}
                          value={item.content}
                          onChange={(e) =>
                            dispatch({
                              type: "update-message-content",
                              index,
                              payload: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className={`mask-actions`}>
                        <MaskAction
                          onClick={() =>
                            dispatch({ type: "new-message-below", index })
                          }
                        >
                          <Plus />
                        </MaskAction>
                        <MaskAction onClick={() => openEditor(index)}>
                          <Pencil />
                        </MaskAction>
                        <MaskAction
                          disabled={index === 0}
                          onClick={() =>
                            dispatch({
                              type: "change-index",
                              payload: { from: index, to: index - 1 },
                            })
                          }
                        >
                          <ChevronUp />
                        </MaskAction>
                        <MaskAction
                          disabled={index === mask.context.length - 1}
                          onClick={() =>
                            dispatch({
                              type: "change-index",
                              payload: { from: index, to: index + 1 },
                            })
                          }
                        >
                          <ChevronDown />
                        </MaskAction>
                        <MaskAction
                          disabled={mask.context.length === 1}
                          onClick={() =>
                            dispatch({ type: "remove-message", index })
                          }
                        >
                          <Trash />
                        </MaskAction>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button unClickable loading={true} onClick={post} disabled={!auth}>
              {auth ? t("submit") : t("login-require")}
            </Button>
            <DrawerClose asChild>
              <Button unClickable variant="outline">
                {t("cancel")}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default MaskEditor;
