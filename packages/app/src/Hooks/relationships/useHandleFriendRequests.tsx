import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { Database } from "../../../types/database.types";
import useGlobalStore, {
  IDatabaseUser,
  IFriend,
} from "../../store/useGlobalStore";

interface IAcceptFriendRequest {
  friendData: IDatabaseUser;
  friendship: IFriend;
}

interface IRejectFriendRequest {
  friendship: IFriend;
}

interface ISendFriendRequest {
  friendEmail: string;
  friendId: string;
}

const useHandleFriendsRequests = () => {
  const supabase = useSupabaseClient<Database>();
  const { user } = useGlobalStore();

  const [isLoading, setIsLoading] = useState(false);

  const handleSendFriendRequest = async ({
    friendId,
    friendEmail,
  }: ISendFriendRequest): Promise<void> => {
    setIsLoading(true);

    if (!user) return;
    if (!user.uid) return;

    const { error } = await supabase.from("relationships").insert({
      status: "PENDING",
      user_a: user.uid,
      user_b: friendId,
      user_id: user.uid,
    });

    if (error) {
      setIsLoading(false);
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });

      return;
    }

    showNotification({
      title: "Friend request sent successfully",
      message: "Now, its time to wait for them to accept it.",
    });

    setIsLoading(false);
  };

  const handleAcceptFriendRequest = async ({
    friendship,
  }: IAcceptFriendRequest): Promise<void> => {
    setIsLoading(true);

    if (!user) return;
    if (!user.uid) return;

    const { error } = await supabase
      .from("relationships")
      .update({
        status: "FRIENDS",
        user_id: user.uid,
        id: friendship.id,
      })
      .eq("id", friendship.id);

    if (error) {
      setIsLoading(false);
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });

      return;
    }

    setIsLoading(false);
  };

  const handleDeleteFriendship = async ({
    friendship,
  }: IRejectFriendRequest): Promise<void> => {
    setIsLoading(true);

    if (!user) return;
    if (!user.uid) return;

    const { error } = await supabase
      .from("relationships")
      .delete()
      .eq("id", friendship.id);

    if (error) {
      setIsLoading(false);
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });

      return;
    }

    setIsLoading(false);
  };

  return {
    isLoading,
    handleAcceptFriendRequest,
    handleDeleteFriendship,
    handleSendFriendRequest,
  };
};

export default useHandleFriendsRequests;
