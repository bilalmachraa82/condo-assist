import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserPresence {
  user_id: string;
  name?: string;
  email?: string;
  online_at: string;
  status: "online" | "away" | "busy";
}

interface UseUserPresenceReturn {
  onlineUsers: UserPresence[];
  currentUser: UserPresence | null;
  updateStatus: (status: "online" | "away" | "busy") => void;
}

export const useUserPresence = (): UseUserPresenceReturn => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    console.log("👥 Setting up user presence for:", user.email);

    const presenceChannel = supabase.channel("user-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const userPresence: UserPresence = {
      user_id: user.id,
      name: user.user_metadata?.first_name || user.email?.split("@")[0],
      email: user.email,
      online_at: new Date().toISOString(),
      status: "online",
    };

    setCurrentUser(userPresence);

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const presenceState = presenceChannel.presenceState();
        console.log("👥 Presence sync:", presenceState);
        
        const users: UserPresence[] = [];
        Object.keys(presenceState).forEach((userId) => {
          const presences = presenceState[userId];
          if (presences.length > 0) {
            const presence = presences[0];
            // Ensure we have the correct UserPresence structure
            if (presence && typeof presence === 'object' && 
                'user_id' in presence && 'online_at' in presence && 'status' in presence) {
              users.push(presence as unknown as UserPresence);
            }
          }
        });
        
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("👥 User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("👥 User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("👥 Tracking user presence:", userPresence);
          await presenceChannel.track(userPresence);
        }
      });

    setChannel(presenceChannel);

    // Update presence every 30 seconds to show we're still active
    const presenceInterval = setInterval(async () => {
      if (presenceChannel && currentUser) {
        await presenceChannel.track({
          ...currentUser,
          online_at: new Date().toISOString(),
        });
      }
    }, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // User switched tabs/minimized - set to away
        const awayPresence = { ...userPresence, status: "away" as const };
        setCurrentUser(awayPresence);
        await presenceChannel.track(awayPresence);
      } else {
        // User is back - set to online
        const onlinePresence = { ...userPresence, status: "online" as const };
        setCurrentUser(onlinePresence);
        await presenceChannel.track(onlinePresence);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log("👥 Cleaning up user presence");
      clearInterval(presenceInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user]);

  const updateStatus = async (status: "online" | "away" | "busy") => {
    if (!channel || !currentUser) return;

    const updatedPresence = {
      ...currentUser,
      status,
      online_at: new Date().toISOString(),
    };

    setCurrentUser(updatedPresence);
    await channel.track(updatedPresence);
    console.log("👥 Updated status to:", status);
  };

  return {
    onlineUsers,
    currentUser,
    updateStatus,
  };
};