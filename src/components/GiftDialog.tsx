import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift as GiftIcon, Coins } from "lucide-react";

interface Gift {
  id: string;
  name: string;
  icon: string;
  drop_token_cost: number;
}

interface GiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverProfileId: string;
  receiverName: string;
  senderProfileId?: string;
}

export const GiftDialog = ({
  open,
  onOpenChange,
  receiverProfileId,
  receiverName,
  senderProfileId,
}: GiftDialogProps) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadGifts();
      loadBalance();
    }
  }, [open, senderProfileId]);

  const loadGifts = async () => {
    const { data, error } = await supabase
      .from("gifts")
      .select("*")
      .order("drop_token_cost", { ascending: true });

    if (error) {
      console.error("Error loading gifts:", error);
      return;
    }

    setGifts(data || []);
  };

  const loadBalance = async () => {
    if (!senderProfileId) return;

    const { data, error } = await supabase
      .from("user_wallets")
      .select("drop_tokens")
      .eq("profile_id", senderProfileId)
      .single();

    if (error) {
      console.error("Error loading balance:", error);
      return;
    }

    setBalance(data?.drop_tokens || 0);
  };

  const sendGift = async (gift: Gift) => {
    if (!senderProfileId) {
      toast.error("Please login to send gifts");
      return;
    }

    if (balance < gift.drop_token_cost) {
      toast.error("Insufficient DropTokens. Please buy more!");
      return;
    }

    setLoading(true);
    try {
      // Deduct tokens from sender
      const { error: walletError } = await supabase
        .from("user_wallets")
        .update({ drop_tokens: balance - gift.drop_token_cost })
        .eq("profile_id", senderProfileId);

      if (walletError) throw walletError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from("gift_transactions")
        .insert({
          sender_profile_id: senderProfileId,
          receiver_profile_id: receiverProfileId,
          gift_id: gift.id,
          drop_tokens_spent: gift.drop_token_cost,
        });

      if (transactionError) throw transactionError;

      toast.success(`Sent ${gift.icon} ${gift.name} to ${receiverName}!`);
      setBalance(balance - gift.drop_token_cost);
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending gift:", error);
      toast.error("Failed to send gift");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GiftIcon className="w-5 h-5" />
            Send Gift to {receiverName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
          <span className="text-sm font-medium">Your Balance</span>
          <span className="flex items-center gap-1 font-bold">
            <Coins className="w-4 h-4" />
            {balance} DropTokens
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {gifts.map((gift) => (
            <Button
              key={gift.id}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => sendGift(gift)}
              disabled={loading || balance < gift.drop_token_cost}
            >
              <span className="text-3xl">{gift.icon}</span>
              <span className="text-xs font-medium">{gift.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {gift.drop_token_cost}
              </span>
            </Button>
          ))}
        </div>

        <Button
          variant="link"
          className="w-full mt-2"
          onClick={() => {
            onOpenChange(false);
            window.location.href = "/wallet";
          }}
        >
          Buy More DropTokens
        </Button>
      </DialogContent>
    </Dialog>
  );
};
