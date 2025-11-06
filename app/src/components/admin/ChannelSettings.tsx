import { useEffect, useReducer, useState } from "react";
import ChannelTable from "@/components/admin/assemblies/ChannelTable.tsx";
import ChannelEditor from "@/components/admin/assemblies/ChannelEditor.tsx";
import { Channel, getChannelInfo } from "@/admin/channel.ts";
import { useSearchParams } from "react-router-dom";

const initialProxyState = {
  proxy: "",
  proxy_type: 0,
  username: "",
  password: "",
};

const initialState: Channel = {
  id: -1,
  type: "openai",
  name: "",
  models: [],
  priority: 0,
  weight: 1,
  retry: 3,
  secret: "",
  endpoint: getChannelInfo().endpoint,
  mapper: "",
  state: true,
  group: [],
  proxy: { ...initialProxyState },
};

function reducer(state: Channel, action: any): Channel {
  switch (action.type) {
    case "type":
      const isChanged =
        getChannelInfo(state.type).endpoint !== state.endpoint &&
        state.endpoint.trim() !== "";
      const endpoint = isChanged
        ? state.endpoint
        : getChannelInfo(action.value).endpoint;
      return { ...state, endpoint, type: action.value };
    case "name":
      return { ...state, name: action.value };
    case "models":
      return { ...state, models: action.value };
    case "add-model":
      if (state.models.includes(action.value) || action.value === "") {
        return state;
      }
      return { ...state, models: [...state.models, action.value] };
    case "add-models":
      const models = action.value.filter(
        (model: string) => !state.models.includes(model) && model !== "",
      );
      return { ...state, models: [...state.models, ...models] };
    case "remove-model":
      return {
        ...state,
        models: state.models.filter((model) => model !== action.value),
      };
    case "clear-models":
      return { ...state, models: [] };
    case "priority":
      return { ...state, priority: action.value };
    case "weight":
      return { ...state, weight: action.value };
    case "secret":
      return { ...state, secret: action.value };
    case "endpoint":
      return { ...state, endpoint: action.value };
    case "mapper":
      return { ...state, mapper: action.value };
    case "retry":
      return { ...state, retry: action.value };
    case "clear":
      return { ...initialState };
    case "add-group":
      return {
        ...state,
        group: state.group ? [...state.group, action.value] : [action.value],
      };
    case "remove-group":
      return {
        ...state,
        group: state.group
          ? state.group.filter((group) => group !== action.value)
          : [],
      };
    case "set-group":
      return { ...state, group: action.value };
    case "set-proxy":
      return {
        ...state,
        proxy: {
          proxy: action.value as string,
          proxy_type: state?.proxy?.proxy_type || 0,
          password: state?.proxy?.password || "",
          username: state?.proxy?.username || "",
        },
      };
    case "set-proxy-type":
      return {
        ...state,
        proxy: {
          proxy: state?.proxy?.proxy || "",
          proxy_type: action.value as number,
          password: state?.proxy?.password || "",
          username: state?.proxy?.username || "",
        },
      };
    case "set-proxy-username":
      return {
        ...state,
        proxy: {
          proxy: state?.proxy?.proxy || "",
          proxy_type: state?.proxy?.proxy_type || 0,
          password: state?.proxy?.password || "",
          username: action.value as string,
        },
      };
    case "set-proxy-password":
      return {
        ...state,
        proxy: {
          proxy: state?.proxy?.proxy || "",
          proxy_type: state?.proxy?.proxy_type || 0,
          password: action.value as string,
          username: state?.proxy?.username || "",
        },
      };
    case "set-first-message-as-user":
      return { ...state, first_message_as_user: action.value };
    case "set-merge-consecutive-user-messages":
      return { ...state, merge_consecutive_user_messages: action.value };
    case "set":
      return { ...state, ...action.value };
    case "import":
      return { ...state, ...action.value, id: state.id, state: state.state };
    default:
      return state;
  }
}

function ChannelSettings() {
  const [search] = useSearchParams();

  const [enabled, setEnabled] = useState<boolean>(
    search.get("editor_id") !== null && search.get("editor_id") !== "empty",
  );
  const [id, setId] = useState<number>(
    search.get("editor_id") !== null && search.get("editor_id") !== "empty"
      ? parseInt(search.get("editor_id") || "-1")
      : -1,
  );

  const [data, setData] = useState<Channel[]>([]);
  const [edit, dispatch] = useReducer(reducer, { ...initialState });

  useEffect(() => {
    // set uri to ?editor_id=${id} if enabled is true, otherwise remove it
    if (enabled) {
      window.history.replaceState({}, "", `?editor_id=${id}`);
    } else {
      window.history.replaceState({}, "", "?editor_id=empty");
    }
  }, [enabled, id]);

  return (
    <>
      <ChannelTable
        setEnabled={setEnabled}
        setId={setId}
        display={!enabled}
        dispatch={dispatch}
        data={data}
        setData={setData}
      />
      <ChannelEditor
        setEnabled={setEnabled}
        id={id}
        display={enabled}
        edit={edit}
        data={data}
        dispatch={dispatch}
      />
    </>
  );
}

export default ChannelSettings;
