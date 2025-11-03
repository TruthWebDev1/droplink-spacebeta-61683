import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, Droplets, Gift, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PiSDK, PiPaymentData, PiPaymentCallbacks } from "@/lib/pi-sdk";

interface Transaction {
  id: string;
  created_at: string;
  sender_profile: { business_name: string };
  receiver_profile: { business_name: string };
  gift: { name: string; icon: string };
  drop_tokens_spent: number;
  isSent: boolean;
}

const Wallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        navigate("/");
        return;
      }

      setProfileId(profile.id);

      // Load wallet balance
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("drop_tokens")
        .eq("profile_id", profile.id)
        .single();

      setBalance(wallet?.drop_tokens || 0);

      // Load transactions (sent and received)
      const { data: sent } = await supabase
        .from("gift_transactions")
        .select(`
          id,
          created_at,
          drop_tokens_spent,
          receiver_profile:profiles!gift_transactions_receiver_profile_id_fkey(business_name),
          sender_profile:profiles!gift_transactions_sender_profile_id_fkey(business_name),
          gift:gifts(name, icon)
        `)
        .eq("sender_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: received } = await supabase
        .from("gift_transactions")
        .select(`
          id,
          created_at,
          drop_tokens_spent,
          receiver_profile:profiles!gift_transactions_receiver_profile_id_fkey(business_name),
          sender_profile:profiles!gift_transactions_sender_profile_id_fkey(business_name),
          gift:gifts(name, icon)
        `)
        .eq("receiver_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const allTransactions = [
        ...(sent || []).map((t: any) => ({ ...t, isSent: true })),
        ...(received || []).map((t: any) => ({ ...t, isSent: false })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions as any);
    } catch (error) {
      console.error("Error loading wallet:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const buyTokens = async (amount: number, piPrice: number) => {
    if (!profileId) return;

    try {
      setLoading(true);

      // Initialize Pi SDK
      await PiSDK.initialize(false); // false = production

      // Authenticate user
      toast.info("Authenticating with Pi Network...");
      const authResult = await PiSDK.authenticate(['payments', 'username']);
      console.log('Pi user authenticated:', authResult.user.username);

      // Create payment data
      const paymentData: PiPaymentData = {
        amount: piPrice,
        memo: `Purchase ${amount} DropTokens`,
        metadata: { 
          profileId,
          dropTokens: amount,
          type: 'droptoken_purchase'
        },
      };

      // Define payment callbacks
      const callbacks: PiPaymentCallbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('Payment ready for approval:', paymentId);
          toast.info("Approving payment...");
          
          try {
            const { data, error: approveError } = await supabase.functions.invoke('pi-payment-approve', {
              body: { paymentId }
            });

            if (approveError) {
              console.error('Approval error:', approveError);
              toast.error('Payment approval failed');
              throw approveError;
            }
            
            console.log('Payment approved:', data);
            toast.success('Payment approved!');
          } catch (error) {
            console.error('Failed to approve payment:', error);
            throw error;
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log('Payment ready for completion:', paymentId, txid);
          toast.info("Completing payment...");
          
          try {
            const { data, error: completeError } = await supabase.functions.invoke('pi-payment-complete', {
              body: { paymentId, txid }
            });

            if (completeError) {
              console.error('Completion error:', completeError);
              toast.error('Payment completion failed');
              throw completeError;
            }

            console.log('Payment completed:', data);

            // Update local balance
            const { error } = await supabase
              .from("user_wallets")
              .update({ drop_tokens: balance + amount })
              .eq("profile_id", profileId);

            if (error) throw error;

            setBalance(balance + amount);
            toast.success(`Successfully purchased ${amount} DropTokens!`);
            
            // Reload to reflect changes
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } catch (error) {
            console.error('Failed to complete payment:', error);
            throw error;
          }
        },
        onCancel: (paymentId: string) => {
          console.log('Payment cancelled:', paymentId);
          toast.info('Payment was cancelled');
        },
        onError: (error: Error) => {
          console.error('Payment error:', error);
          toast.error('Payment failed: ' + error.message);
        },
      };

      // Create the payment
      toast.info("Please approve the payment in Pi Browser...");
      await PiSDK.createPayment(paymentData, callbacks);
      
    } catch (error: any) {
      console.error("Error buying tokens:", error);
      
      if (error.message?.includes('not loaded')) {
        toast.error("Please open this app in Pi Browser");
      } else if (error.message?.includes('cancelled') || error.message?.includes('User cancelled')) {
        toast.info("Payment cancelled");
      } else {
        toast.error(`Failed to purchase tokens: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="w-6 h-6" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Droplets className="w-8 h-8 text-sky-400" />
              <p className="text-4xl font-bold">{balance}</p>
            </div>
            <p className="text-muted-foreground">DropTokens</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button onClick={() => buyTokens(100, 1)} disabled={loading} className="flex flex-col h-auto py-4">
              <span className="text-2xl font-bold">100</span>
              <span className="text-xs">1π</span>
            </Button>
            <Button onClick={() => buyTokens(500, 5)} disabled={loading} className="flex flex-col h-auto py-4">
              <span className="text-2xl font-bold">500</span>
              <span className="text-xs">5π</span>
            </Button>
            <Button onClick={() => buyTokens(1000, 10)} disabled={loading} className="flex flex-col h-auto py-4">
              <span className="text-2xl font-bold">1000</span>
              <span className="text-xs">10π</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Gift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No gift transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {transaction.isSent ? (
                      <ArrowUpRight className="w-5 h-5 text-red-500" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-2xl">{transaction.gift.icon}</span>
                    <div>
                      <p className="font-medium">
                        {transaction.isSent ? "Sent to" : "Received from"}{" "}
                        {transaction.isSent
                          ? transaction.receiver_profile.business_name
                          : transaction.sender_profile.business_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.isSent ? "text-red-500" : "text-green-500"}`}>
                      {transaction.isSent ? "-" : "+"}
                      {transaction.drop_tokens_spent}
                    </p>
                    <p className="text-xs text-muted-foreground">DropTokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Wallet;
