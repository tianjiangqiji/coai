import axios from "axios";
import { CommonResponse } from "@/api/common.ts";
import { getErrorMessage } from "@/utils/base.ts";

type ListPluginResponse = CommonResponse & {
  data: Plugin[];
};

type TestPluginResponse = CommonResponse & {
  data?: {
    tools?: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
  };
};

export async function listPlugins(): Promise<ListPluginResponse> {
  try {
    const resp = await axios.get("/conversation/plugin/view");
    return (
      resp.data ?? {
        status: true,
        data: [],
      }
    );
  } catch (e) {
    return {
      status: false,
      data: [],
      error: getErrorMessage(e),
    };
  }
}

export async function savePlugin(plugin: Partial<Plugin>): Promise<CommonResponse> {
  try {
    const resp = await axios.post("/conversation/plugin/save", plugin);
    return resp.data;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
    };
  }
}

export async function deletePlugin(id: number): Promise<CommonResponse> {
  try {
    const resp = await axios.post("/conversation/plugin/delete", { id });
    return resp.data;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
    };
  }
}

export async function testPlugin(serverUrl: string): Promise<TestPluginResponse> {
  try {
    const resp = await axios.get("/conversation/plugin/test", {
      params: { server_url: serverUrl }
    });
    return resp.data;
  } catch (e) {
    return {
      status: false,
      error: getErrorMessage(e),
    };
  }
}

export function formatToolCallResult(result: string): string {
  try {
    const parsed = JSON.parse(result);
    let textContent = '';
    
    if (parsed.text) {
      textContent = parsed.text;
    } else if (typeof parsed === 'string') {
      textContent = parsed;
    } else {
      textContent = result;
    }

    try {
      const secondParsed = JSON.parse(textContent);
      if (secondParsed.text) {
        return secondParsed.text;
      } else if (typeof secondParsed === 'string') {
        return secondParsed;
      } else {
        return JSON.stringify(secondParsed, null, 2);
      }
    } catch {
      return textContent;
    }
  } catch {
    return result;
  }
}

export function parseMCPInput(input: string): {
  status: 'success' | 'error' | 'noop';
  identifier?: string;
  mcpConfig?: {
    name: string;
    description: string;
    server_url: string;
  };
  errorCode?: string;
} {
  try {
    const parsed = JSON.parse(input);

    if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
      return { status: 'error', errorCode: 'plugin.import-error.invalid-format' };
    }

    const serverKeys = Object.keys(parsed.mcpServers);
    if (serverKeys.length === 0) {
      return { status: 'error', errorCode: 'plugin.import-error.no-servers' };
    }

    const identifier = serverKeys[0];
    const serverConfig = parsed.mcpServers[identifier];

    let server_url = '';
    let description = '';

    if (serverConfig.url) {
      server_url = serverConfig.url;
      description = `HTTP MCP Server: ${server_url}`;
    } else if (serverConfig.command) {
      return { status: 'error', errorCode: 'plugin.import-error.stdio-not-supported' };
    } else {
      return { status: 'error', errorCode: 'plugin.import-error.unsupported-config' };
    }

    return {
      status: 'success',
      identifier,
      mcpConfig: {
        name: identifier,
        description,
        server_url,
      }
    };
  } catch (error) {
    return { status: 'error', errorCode: 'plugin.import-error.invalid-json' };
  }
}
