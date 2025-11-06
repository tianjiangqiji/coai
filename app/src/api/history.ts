import axios from "axios";
import type { ConversationInstance } from "./types.tsx";
import { setHistory } from "@/store/chat.ts";
import { AppDispatch } from "@/store";
import { CommonResponse } from "@/api/common.ts";
import { getErrorMessage } from "@/utils/base.ts";
import { VirtualWebSearchRole, VirtualRolePrefix, Message } from "./types.tsx";
import { formatToolCallResult } from "@/api/plugin.ts";

export async function getConversationList(): Promise<ConversationInstance[]> {
  try {
    const resp = await axios.get("/conversation/list");
    return (
      resp.data.status ? resp.data.data || [] : []
    ) as ConversationInstance[];
  } catch (e) {
    console.warn(e);
    return [];
  }
}

export async function updateConversationList(
  dispatch: AppDispatch,
): Promise<void> {
  const resp = await getConversationList();
  dispatch(setHistory(resp));
}

export async function loadConversation(
  id: number,
): Promise<ConversationInstance> {
  try {
    const resp = await axios.get(`/conversation/load?id=${id}`);
    
    if (resp.data.status) {
      const conversation = resp.data.data as ConversationInstance;

      if (conversation.message && conversation.message.length > 0) {
        const processedMessages: Message[] = [];
        
        for (let i = 0; i < conversation.message.length; i++) {
          const currentMsg = conversation.message[i];
          

          if (currentMsg.role === VirtualWebSearchRole) {

            let nextMsgIndex = i + 1;
            while (
              nextMsgIndex < conversation.message.length && 
              conversation.message[nextMsgIndex].role.startsWith(VirtualRolePrefix)
            ) {
              nextMsgIndex++;
            }
            

            if (nextMsgIndex < conversation.message.length) {

              conversation.message[nextMsgIndex].search_query = currentMsg.search_query;
              conversation.message[nextMsgIndex].search_result = currentMsg.search_result;
              conversation.message[nextMsgIndex].search_index = currentMsg.search_index;
            }
            

            continue;
          }
          
          if (currentMsg.role === "assistant" && currentMsg.tool_calls) {
            processedMessages.push(currentMsg);
          } else if (currentMsg.role === "tool" && currentMsg.tool_call_id) {
            const toolCallId = currentMsg.tool_call_id;
            for (let j = processedMessages.length - 1; j >= 0; j--) {
              const prevMsg = processedMessages[j];
              if (prevMsg.role === "assistant" && prevMsg.tool_calls) {
                const toolCall = prevMsg.tool_calls.find(tc => tc.id === toolCallId);
                if (toolCall) {
                  try {
                    const result = JSON.parse(currentMsg.content);
                    if (result.error) {
                      toolCall.error = result.error;
                      toolCall.status = "error";
                    } else {
                      const formattedResult = formatToolCallResult(currentMsg.content);
                      toolCall.result = formattedResult;
                      toolCall.status = "success";
                    }
                  } catch {
                    const formattedResult = formatToolCallResult(currentMsg.content);
                    toolCall.result = formattedResult;
                    toolCall.status = "success";
                  }
                }
                break;
              }
            }
            processedMessages.push(currentMsg);
          } else {
            processedMessages.push(currentMsg);
          }
        }
        

        conversation.message = processedMessages;
      }
      
      return conversation;
    }
    return { id, name: "", message: [] };
  } catch (e) {
    console.warn(e);
    return { id, name: "", message: [] };
  }
}

export async function deleteConversation(id: number): Promise<boolean> {
  try {
    const resp = await axios.get(`/conversation/delete?id=${id}`);
    return resp.data.status;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

export async function renameConversation(
  id: number,
  name: string,
): Promise<CommonResponse> {
  try {
    const resp = await axios.post("/conversation/rename", { id, name });
    return resp.data as CommonResponse;
  } catch (e) {
    console.warn(e);
    return { status: false, error: getErrorMessage(e) };
  }
}

export async function deleteAllConversations(): Promise<boolean> {
  try {
    const resp = await axios.get("/conversation/clean");
    return resp.data.status;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
