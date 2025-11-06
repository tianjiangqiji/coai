export type PluginEditorState = {
  id?: number;
  avatar: string;
  name: string;
  description: string;
  server_url: string;
};

export type TestResult = {
  status: 'idle' | 'testing' | 'success' | 'error';
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
  error?: string;
};

export type PluginEditorAction = 
  | { type: "update-avatar"; payload: string }
  | { type: "update-name"; payload: string }
  | { type: "update-description"; payload: string }
  | { type: "update-server-url"; payload: string }
  | { type: "reset" }
  | { type: "set-plugin"; payload: PluginEditorState }
  | { type: "import-plugin"; payload: PluginEditorState };

export const initialPluginState: PluginEditorState = {
  avatar: "1f9e9",
  name: "",
  description: "",
  server_url: "",
};

export function pluginEditorReducer(
  state: PluginEditorState, 
  action: PluginEditorAction
): PluginEditorState {
  switch (action.type) {
    case "update-avatar":
      return { ...state, avatar: action.payload };
    case "update-name":
      return { ...state, name: action.payload };
    case "update-description":
      return { ...state, description: action.payload };
    case "update-server-url":
      return { ...state, server_url: action.payload };
    case "reset":
      return { ...initialPluginState };
    case "set-plugin":
      return { ...action.payload };
    case "import-plugin":
      return {
        ...action.payload,
        id: -1,
      };
    default:
      return state;
  }
}
