import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Flex,
  HoverCard,
  Loader,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import moment from "moment";
import React, { useState } from "react";
import { useClickOutside } from "@mantine/hooks";
import { closeAllModals, openModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { CornerUpRight, Send } from "react-feather";
import { Database } from "../../../../../../types/database.types";
import UserAvatarWithIndicator from "../../../../../components/UserAvatarWithIndicator/UserAvatarWithIndicator";
import UserPopup from "../../../../../components/UserPopup/UserPopup";
import useGlobalStore, {
  IDatabaseMessages,
} from "../../../../../store/useGlobalStore";
import MessageFunctions from "../MessagesFunctions/MessageFunctions";
import useMessageStyles from "../useMessageStyles";

interface Props {
  message: IDatabaseMessages;
}

const Message = ({ message }: Props): JSX.Element => {
  const { classes } = useMessageStyles();
  const supabase = useSupabaseClient<Database>();

  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { user } = useGlobalStore();

  const outsideClickRef = useClickOutside(() => setIsEditingMessage(false));

  const removeMessage = (id: number) => {
    const removeMessageAsync = async () => {
      setIsSendingMessage(true);
      if (!message.id || !user.uid) {
        return showNotification({
          title: "Error",
          message: "Error, please refresh page and try again.",
        });
      }

      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) {
        return showNotification({
          title: "Error",
          message: error.message,
        });
      }
      return null;
    };

    removeMessageAsync().finally(() => {
      closeAllModals();
    });
  };

  const handleEdit = async (m: IDatabaseMessages) => {
    if (editMessage.length <= 0) {
      setIsSendingMessage(false);
      return openModal({
        overlayProps: {
          blur: 5,
        },
        title: "Warning",
        children: (
          <>
            <p>Are you sure you want to remove this message?</p>
            <Flex
              mt={20}
              justify="flex-end"
            >
              <Button
                variant="light"
                mr={10}
                onClick={() => closeAllModals()}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={() => removeMessage(message.id)}
              >
                Delete message
              </Button>
            </Flex>
          </>
        ),
      });
    }

    setIsSendingMessage(true);
    const { error } = await supabase
      .from("messages")
      .update({
        content: { content: editMessage },
        is_edited: true,
      })
      .eq("id", m.id);

    if (error) {
      setIsSendingMessage(false);
      return showNotification({
        title: "Error",
        message: "Unable to send message.",
      });
    }

    setIsSendingMessage(false);
    setIsEditingMessage(false);

    return setEditMessage("");
  };

  const sendButton = (): JSX.Element => {
    return (
      <ActionIcon type="submit">
        {isSendingMessage ? <Loader size={16} /> : <Send size={16} />}
      </ActionIcon>
    );
  };

  return (
    <div>
      <HoverCard
        shadow="md"
        position="top-end"
        closeDelay={0}
        openDelay={0}
        offset={-15}
        withinPortal
      >
        <HoverCard.Target>
          <Flex
            key={message.id}
            mb={10}
            className={classes.messageDiv}
            justify="space-between"
          >
            <Flex>
              <div className={classes.avatarDiv}>
                <UserPopup
                  user={{
                    // @ts-ignore
                    email: message.userData.email || "",
                    // @ts-ignore
                    id: message.userData.id || "",
                    // @ts-ignore
                    imageUrl: message.userData.avatar_url || "",
                    // @ts-ignore
                    name: message.userData.name || "",
                  }}
                >
                  <UserAvatarWithIndicator
                    // @ts-ignore
                    user_email={message.userData.email}
                    size={30}
                    // @ts-ignore
                    image={message.userData.avatar_url}
                  />
                </UserPopup>
              </div>
              <div style={{ marginLeft: 10 }}>
                <Text
                  c="dimmed"
                  size={14}
                >
                  {/* @ts-ignore */}
                  {`${message.userData.name} - ${moment(
                    message.created_at,
                  ).fromNow()}`}
                  {message.is_edited && (
                    <Tooltip
                      withArrow
                      withinPortal
                      label="This message was... updated? Probably"
                    >
                      <Badge
                        color="red"
                        ml={10}
                      >
                        Edited
                      </Badge>
                    </Tooltip>
                  )}
                </Text>
                {isEditingMessage ? (
                  <form
                    ref={outsideClickRef}
                    onSubmit={(e): void => {
                      e.preventDefault();
                      handleEdit(message);
                    }}
                  >
                    <Textarea
                      sx={{ maxWidth: "calc(100vw - 100px)", width: 600 }}
                      autosize
                      className={classes.edit_input}
                      onChange={
                        (event): void =>
                          // eslint-disable-next-line max-len
                          // eslint-disable-next-line react/jsx-curly-newline, implicit-arrow-linebreak
                          setEditMessage(event.target.value)
                        // eslint-disable-next-line react/jsx-curly-newline
                      }
                      placeholder="Send message"
                      rightSection={sendButton()}
                      value={editMessage}
                      spellCheck="false"
                      autoComplete="off"
                    />
                  </form>
                ) : (
                  <Text>{message.content?.content}</Text>
                )}
              </div>
            </Flex>
          </Flex>
        </HoverCard.Target>
        <HoverCard.Dropdown p={5}>
          <div className={classes.messageFunctionsDiv}>
            <MessageFunctions
              handleEdit={() => {
                setEditMessage(message.content?.content);
                setIsEditingMessage(true);
              }}
              message={message}
            />
          </div>
        </HoverCard.Dropdown>
      </HoverCard>
    </div>
  );
};

export default Message;
