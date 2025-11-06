import { updateDocumentTitle, updateFavicon } from "@/utils/dom.ts";
import { setMemory } from "@/utils/memory.ts";

export let appName =
  localStorage.getItem("app_name") || import.meta.env.VITE_APP_NAME || "CoAI";
export let appLogo =
  localStorage.getItem("app_logo") ||
  import.meta.env.VITE_APP_LOGO ||
  "/favicon.ico";
export let blobEndpoint =
  localStorage.getItem("blob_endpoint") ||
  import.meta.env.VITE_BLOB_ENDPOINT ||
  "https://blob.coai.dev";
export let docsEndpoint =
  localStorage.getItem("docs_url") ||
  import.meta.env.VITE_DOCS_ENDPOINT ||
  "https://coai.dev";
export let buyLink =
  localStorage.getItem("buylink") || import.meta.env.VITE_buylink || "";

export const useDeeptrain = !!import.meta.env.VITE_USE_DEEPTRAIN;
export const backendEndpoint = import.meta.env.VITE_BACKEND_ENDPOINT || "/api";
export const deeptrainEndpoint =
  import.meta.env.VITE_DEEPTRAIN_ENDPOINT || "https://deeptrain.net";
export const deeptrainAppName = import.meta.env.VITE_DEEPTRAIN_APP || "coai";
export const deeptrainApiEndpoint =
  import.meta.env.VITE_DEEPTRAIN_API_ENDPOINT || "https://api.deeptrain.net";

updateDocumentTitle(import.meta.env.VITE_APP_NAME);
updateFavicon(import.meta.env.VITE_APP_LOGO);

export function getDev(): boolean {
  /**
   * return if the current environment is development
   */
  return window.location.hostname === "localhost";
}

export function getRestApi(deploy: boolean): string {
  /**
   * return the REST API address
   */
  return !deploy ? "http://localhost:8094" : backendEndpoint;
}

export function getWebsocketApi(deploy: boolean): string {
  /**
   * return the WebSocket API address
   */
  if (!deploy) return "ws://localhost:8094";

  if (backendEndpoint.startsWith("http://"))
    return `ws://${backendEndpoint.slice(7)}`;
  if (backendEndpoint.startsWith("https://"))
    return `wss://${backendEndpoint.slice(8)}`;
  if (backendEndpoint.startsWith("/"))
    return location.protocol === "https:"
      ? `wss://${location.host}${backendEndpoint}`
      : `ws://${location.host}${backendEndpoint}`;
  return backendEndpoint;
}

export function getTokenField(deploy: boolean): string {
  /**
   * return the token field name in localStorage
   */
  return deploy ? "token" : "token-dev";
}

export function setAppName(name: string): void {
  /**
   * set the app name in localStorage
   */
  name = name.trim() || "CoAI";
  setMemory("app_name", name);
  appName = name;

  updateDocumentTitle(name);
}

export function setAppLogo(logo: string): void {
  /**
   * set the app logo in localStorage
   */
  logo = logo.trim() || "/favicon.ico";
  setMemory("app_logo", logo);
  appLogo = logo;

  updateFavicon(logo);
}

export function setDocsUrl(url: string): void {
  /**
   * set the docs url in localStorage
   */
  url = url.trim() || "https://coai.dev";
  setMemory("docs_url", url);
  docsEndpoint = url;
}

export function setBlobEndpoint(endpoint: string): void {
  /**
   * set the blob endpoint in localStorage
   */
  endpoint = endpoint.trim() || "https://blob.coai.dev";
  setMemory("blob_endpoint", endpoint);
  blobEndpoint = endpoint;
}

export function setBuyLink(link: string): void {
  /**
   * set the buy link in localStorage
   */
  link = link.trim() || "";
  setMemory("buylink", link);
  buyLink = link;
}

