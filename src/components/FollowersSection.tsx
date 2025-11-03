import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, UserMinus, Gift } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { GiftDialog } from "./GiftDialog";

interface FollowersSectionProps {
  profileId: string;
  currentUserProfileId?: string;
}

export const FollowersSection = ({ profileId, currentUserProfileId }: FollowersSectionProps) => {
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadFollowData();
  }, [profileId, currentUserProfileId]);

  const loadFollowData = async () => {
    // Get profile business name
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", profileId)
      .single();

    setBusinessName(profile?.business_name || "User");

    // Get followers count
    const { count: followers } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_profile_id", profileId);

    setFollowersCount(followers || 0);

    // Get following count
    const { count: following } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_profile_id", profileId);

    setFollowingCount(following || 0);

    // Check if current user is following this profile
    if (currentUserProfileId && currentUserProfileId !== profileId) {
      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_profile_id", currentUserProfileId)
        .eq("following_profile_id", profileId)
        .maybeSingle();

      setIsFollowing(!!data);
    }
  };

  const handleFollow = async () => {
    if (!currentUserProfileId) {
      toast.error("Please login to follow");
      navigate("/");
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .eq("follower_profile_id", currentUserProfileId)
          .eq("following_profile_id", profileId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
        toast.success("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase
          .from("followers")
          .insert({
            follower_profile_id: currentUserProfileId,
            following_profile_id: profileId,
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        toast.success("Following successfully");
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Failed to update follow status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-md bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Community
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{followersCount}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{followingCount}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </div>
        </div>
        
        {currentUserProfileId && currentUserProfileId !== profileId && (
          <div className="space-y-2">
            <Button
              onClick={handleFollow}
              disabled={loading}
              className="w-full"
              variant={isFollowing ? "outline" : "default"}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow
                </>
              )}
            </Button>
            <Button
              onClick={() => setGiftDialogOpen(true)}
              className="w-full"
              variant="secondary"
            >
              <Gift className="w-4 h-4 mr-2" />
              Send Gift
            </Button>
          </div>
        )}
      </CardContent>
      
      <GiftDialog
        open={giftDialogOpen}
        onOpenChange={setGiftDialogOpen}
        receiverProfileId={profileId}
        receiverName={businessName}
        senderProfileId={currentUserProfileId}
      />
    </Card>
  );
};
