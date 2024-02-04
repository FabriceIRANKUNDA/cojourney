import { useEffect, useState } from "react";
import {
  AgentRuntime,
  initialize,
  onMessage,
  agentActions,
  getGoals,
  createGoal,
} from "@cojourney/agent";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import chalk from "chalk";
import useGlobalStore from "../../../../store/useGlobalStore";

const agentId = "00000000-0000-0000-0000-000000000000";
const userName = "User"; // TODO: get from user profile
const agentName = "CJ";
const debugMode = false;
const updateInterval = 10000;

const defaultGoal = {
  name: "First Time User Experience",
  description: "CJ wants to get to know the user.",
  status: "IN_PROGRESS", // other types are "DONE" and "FAILED"
  objectives: [
    {
      description: "Determine if it is the user's first time",
      condition:
        "User indicates that it is their first time or that they are new",
      completed: false,
    },
    {
      description:
        "Get the user to enable their microphone by pressing the microphone button",
      condition: "User calls microphone_enabled action",
      completed: false,
    },
    {
      description: "Learn details about the user's interests and personality",
      condition:
        "User tells CJ a few key facts about about their interests and personality",
      completed: false,
    },
    {
      description:
        "CJ updates the user's profile with the information she has learned",
      condition: "CJ calls update_profile action",
      completed: false,
    },
    {
      description:
        "Connect the user to someone from the rolodex who they might like to chat with",
      condition: "CJ calls INTRODUCE action",
      completed: false,
    },
  ],
};

interface Props {
  roomData: any;
}

const AgentBinding = ({ roomData }: Props) => {
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntime | null>(null);
  const supabase = useSupabaseClient();

  const {
    currentRoom: { messages, roomParticipants },
    user: { uid },
  } = useGlobalStore();

  const userId = uid as string;

  useEffect(() => {
    if (!supabase || !userId) return;
    async function startAgent(): Promise<void> {
      console.log("messages", messages);
      console.log("roomParticipants", roomParticipants);

      const runtime = new AgentRuntime({
        debugMode,
        userId,
        agentId,
        supabase,
        serverUrl: import.meta.env.VITE_SERVER_URL,
      });
      setAgentRuntime(runtime);

      // get the room_id where user_id is user_a and agent_id is user_b OR vice versa
      const { data, error } = await supabase
        .from("relationships")
        .select("*")
        .or(
          `user_a.eq.${userId},user_b.eq.${agentId},user_a.eq.${agentId},user_b.eq.${userId}`,
        )
        .single();

      if (error) {
        return console.error(new Error(JSON.stringify(error)));
      }

      // TODO, just get the room id from channel
      const room_id = data?.room_id;

      const goals = await getGoals({
        supabase: runtime.supabase,
        userIds: [userId, agentId],
      });

      if (goals.length === 0) {
        console.log("creating goal");
        await createGoal({
          supabase: runtime.supabase,
          userIds: [userId, agentId],
          userId: agentId,
          goal: defaultGoal,
        });
      }
      const {
        start: startLoop,
        reset: resetLoop,
        registerHandler,
      } = initialize();

      runtime.registerMessageHandler(
        async ({ agentName: _agentName, content, action }: any) => {
          console.log(
            chalk.green(
              `${_agentName}: ${content}${action ? ` (${action})` : ""}`,
            ),
          );
          resetLoop();
        },
      );

      agentActions.forEach((action) => {
        // console.log('action', action)
        runtime.registerActionHandler(action);
      });

      if (runtime.debugMode) {
        console.log(
          chalk.yellow(
            `Actions registered: ${runtime
              .getActions()
              .map((a) => a.name)
              .join(", ")}`,
          ),
        );
      }

      // Function to simulate agent's response
      // TODO: bind to realtime channel
      const respond = async (content) => {
        resetLoop(); // reset the update interval early to prevent async update race
        await onMessage(
          {
            name: userName,
            content,
            senderId: userId,
            agentId,
            eventType: "message",
            userIds: [userId, agentId],
            agentName,
            data,
            room_id,
          },
          runtime,
        );
        resetLoop(); // reset again
      };

      registerHandler(async () => {
        resetLoop();
        await onMessage(
          {
            name: userName,
            senderId: userId,
            agentId,
            eventType: "update",
            userIds: [userId, agentId],
            agentName,
            data,
            room_id,
          },
          runtime,
        );
        resetLoop();
      });

      startLoop(updateInterval);
      return undefined;
    }
    startAgent();
  }, [supabase, userId]);

  useEffect(() => {
    console.log("roomData changed", roomData);
  }, [roomData]);
};

export default AgentBinding;