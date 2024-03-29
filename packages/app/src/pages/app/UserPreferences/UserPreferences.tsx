import { Avatar, Button, Divider, Flex, Grid, TextInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { closeAllModals, openModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import React, { useState } from "react";
import { Save, User } from "react-feather";
import { useForm } from "react-hook-form";
import UploadProfileImage from "../../../components/RegisterUser/helpers/UploadProfileImage.tsx/UploadProfileImage";
import { Database } from "../../../../types/database.types";
import constants from "../../../constants/constants";
import useGlobalStore from "../../../store/useGlobalStore";

interface IFormValues {
  name: string;
}

const UserPreferences = (): JSX.Element => {
  const { user, setUser } = useGlobalStore();
  const session = useSession();
  const supabase = useSupabaseClient<Database>();

  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(user.imageUrl);
  const [isSavingChanges, setIsSavingChanges] = useState(false);

  const isMobile = useMediaQuery("(max-width: 900px)");

  const COL_SPAN = isMobile ? 12 : 6;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormValues>({
    defaultValues: {
      name: user.name || "",
    },
  });

  const onSubmit = handleSubmit(async (data): Promise<void> => {
    setIsSavingChanges(true);

    if (!session?.user.id) {
      setIsSavingChanges(false);
      return showNotification({
        title: "Error, unable to save information.",
        message:
          "Please reload the page, if the error persists try logging out and back in.",
      });
    }

    let IMAGE_URL = imageUrl;

    if (image) {
      const { data: imageUploadData, error } = await supabase.storage
        .from("profile-images")
        .upload(`${session.user.id}/profile.png`, image, {
          cacheControl: "0",
          upsert: true,
        });

      if (error) {
        return showNotification({
          title: "Error.",
          message: error.message,
        });
      }

      const { data: imageUrlData } = await supabase.storage
        .from("profile-images")
        .getPublicUrl(imageUploadData.path);

      if (!imageUrlData) {
        return showNotification({
          title: "Error.",
          message: "Unable to get image URL",
        });
      }

      IMAGE_URL = imageUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("accounts")
      .update({
        name: data.name,
        id: session?.user.id,
        avatar_url: IMAGE_URL,
      })
      .eq("id", session.user.id);

    if (error) {
      setIsSavingChanges(false);

      return openModal({
        title: "Could not complete setup",
        overlayProps: {
          blur: 5,
        },
        children: (
          <div>
            <p>
              There was an error while we tried to process your signup, please
              try again later.
            </p>
            <br />
            <p>Details:</p>
            <p>{error?.message}</p>
            <Flex
              justify="flex-end"
              mt={20}
            >
              <Button
                onClick={(): void => {
                  closeAllModals();
                }}
              >
                Close
              </Button>
            </Flex>
          </div>
        ),
      });
    }

    setIsSavingChanges(false);

    return setUser({
      imageUrl: IMAGE_URL,
      name: data.name,
    });
  });

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
      >
        <h1>Account</h1>
      </Flex>
      <Divider mb={20} />
      <Flex
        justify="flex-start"
        wrap="wrap"
      >
        <Avatar
          mr={20}
          size={150}
          src={user.imageUrl || constants.avatarPlaceholder(user.email || "")}
        />
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      </Flex>
      <form onSubmit={onSubmit}>
      <Divider mb={20} />
      <Grid>
        <Grid.Col span={COL_SPAN}>
          <UploadProfileImage
            image={image}
            imageUrl={imageUrl}
            setImage={setImage}
            setImageUrl={setImageUrl}
          />
        </Grid.Col>
        <Grid.Col span={COL_SPAN}>
          <TextInput
            {...register("name", {
              required: "Your name is required",
              minLength: {
                value: 5,
                message: "At least 5 letters",
              },
            })}
            description="This is your publicly shown name"
            error={errors.name?.message}
            label="Your Name"
            placeholder="Stephen Smith"
            withAsterisk
          />
        </Grid.Col>
      </Grid>
      <Divider
        mb={10}
        mt={20}
      />
      <Flex justify="flex-end">
      <Button
        mr={'auto'}
        leftIcon={<User />}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // log out with supabase
          supabase.auth.signOut();
        }}
        variant="white"
      >
        Logout
      </Button>
        <Button
          leftIcon={<Save size={16} />}
          loading={isSavingChanges}
          type="submit"
        >
          Save Changes
        </Button>
      </Flex>
    </form>
    </div>
  );
};

export default UserPreferences;
