import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PiSDK, PiPaymentData, PiPaymentCallbacks } from "@/lib/pi-sdk";

const getPlans = (isYearly: boolean) => [
  {
    name: "Free",
    piAmount: 0,
    price: "Free",
    period: "forever",
    features: [
      "1 link only",
      "1 social link",
      "Pi Ad Network enabled",
      "Droplink watermark",
      "No analytics",
      "No YouTube links",
      "No Pi tips",
    ],
    current: false,
  },
  {
    name: "Premium",
    piAmount: isYearly ? 100 : 10,
    price: isYearly ? "100 Pi" : "10 Pi",
    period: isYearly ? "per year" : "per month",
    features: [
      "Unlimited links",
      "Unlimited social links",
      "YouTube link support",
      "Pi tips wallet",
      "No watermark",
      "No ads",
      "No analytics",
      "No AI support",
    ],
    popular: true,
  },
  {
    name: "Pro",
    piAmount: isYearly ? 300 : 30,
    price: isYearly ? "300 Pi" : "30 Pi",
    period: isYearly ? "per year" : "per month",
    features: [
      "Everything in Premium",
      "Full analytics with location data",
      "AI support chatbot",
      "Watch ads for rewards",
      "Priority support",
      "API access",
    ],
  },
];

const PiSubscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [piAuthenticated, setPiAuthenticated] = useState(false);
  const [piUsername, setPiUsername] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing profile
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, subscription_plan')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setProfileId(profile.id);
        }
      }
    };
    checkProfile();
  }, []);

  const handlePiAuth = async () => {
    setLoading(true);
    try {
      // Initialize Pi SDK for mainnet
      await PiSDK.initialize(false);
      
      toast.info("Please authenticate with Pi Browser...");
      const authResult = await PiSDK.authenticate(['payments', 'username']);
      
      console.log('Pi authenticated:', authResult.user.username);
      setPiAuthenticated(true);
      setPiUsername(authResult.user.username);
      
      // Call backend to verify and create/get user
      const { data, error } = await supabase.functions.invoke('pi-auth', {
        body: { accessToken: authResult.accessToken },
      });

      if (error) {
        console.error('Pi auth backend error:', error);
        toast.error("Authentication failed");
        return;
      }

      if (data.profileId) {
        setProfileId(data.profileId);
      }

      // Sign in using session token if provided
      if (data.sessionToken) {
        const url = new URL(data.sessionToken);
        const token = url.searchParams.get('token');
        if (token) {
          await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'magiclink',
          });
        }
      }

      toast.success(`Authenticated as ${authResult.user.username}!`);
    } catch (error: any) {
      console.error('Pi auth error:', error);
      if (error.message?.includes('not loaded')) {
        toast.error("Please open this app in Pi Browser");
      } else if (error.message?.includes('cancelled')) {
        toast.info("Authentication cancelled");
      } else {
        toast.error("Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFreePlan = async () => {
    if (!piAuthenticated) {
      toast.error("Please authenticate with Pi first");
      return;
    }

    setLoading(true);
    setSelectedPlan('Free');

    try {
      // Ensure profile exists
      let currentProfileId = profileId;
      
      if (!currentProfileId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              username: piUsername || `user-${user.id.slice(0, 8)}`,
              business_name: piUsername || 'Droplink User',
              subscription_plan: 'free'
            })
            .select('id')
            .single();
          
          if (newProfile) {
            currentProfileId = newProfile.id;
            setProfileId(currentProfileId);
          }
        }
      } else {
        // Update existing profile to free plan
        await supabase
          .from('profiles')
          .update({
            subscription_plan: 'free',
            subscription_expires_at: null,
            subscription_period: null
          })
          .eq('id', currentProfileId);
      }

      toast.success("Free plan activated!");
      navigate("/");
    } catch (error) {
      console.error('Free plan error:', error);
      toast.error("Failed to activate free plan");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handlePiPayment = async (planName: string, piAmount: number, period: 'monthly' | 'yearly') => {
    if (!piAuthenticated) {
      toast.error("Please authenticate with Pi first");
      return;
    }

    if (piAmount === 0) {
      await handleSelectFreePlan();
      return;
    }

    setLoading(true);
    setSelectedPlan(planName);

    try {
      // Ensure profile exists before payment
      let currentProfileId = profileId;
      
      if (!currentProfileId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              username: piUsername || `user-${user.id.slice(0, 8)}`,
              business_name: piUsername || 'Droplink User',
              subscription_plan: 'free'
            })
            .select('id')
            .single();
          
          if (newProfile) {
            currentProfileId = newProfile.id;
            setProfileId(currentProfileId);
          }
        }
      }

      if (!currentProfileId) {
        toast.error("Failed to create profile");
        return;
      }

      const paymentData: PiPaymentData = {
        amount: piAmount,
        memo: `Droplink ${planName} Subscription (${period})`,
        metadata: {
          profile_id: currentProfileId,
          plan: planName.toLowerCase(),
          period: period
        },
      };

      const paymentCallbacks: PiPaymentCallbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('Payment ready for approval:', paymentId);
          toast.info("Processing payment...");

          try {
            const { data, error } = await supabase.functions.invoke('pi-payment-approve', {
              body: { paymentId },
            });

            if (error) {
              console.error('Payment approval error:', error);
              toast.error("Failed to approve payment");
              throw error;
            }

            console.log('Payment approved:', data);
            toast.success("Payment approved! Waiting for blockchain confirmation...");
          } catch (err) {
            console.error('Approval error:', err);
            throw err;
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('Payment ready for completion:', paymentId, txid);
          toast.info("Completing payment...");

          try {
            const { data, error } = await supabase.functions.invoke('pi-payment-complete', {
              body: { paymentId, txid },
            });

            if (error) {
              console.error('Payment completion error:', error);
              toast.error("Failed to complete payment");
              throw error;
            }

            console.log('Payment completed:', data);
            toast.success(`Successfully subscribed to ${planName} plan!`);
            
            setTimeout(() => {
              navigate("/");
            }, 2000);
          } catch (err) {
            console.error('Completion error:', err);
            throw err;
          }
        },

        onCancel: (paymentId) => {
          console.log('Payment cancelled:', paymentId);
          toast.info("Payment cancelled");
        },

        onError: (error, payment) => {
          console.error('Payment error:', error, payment);
          toast.error(`Payment failed: ${error.message}`);
        },
      };

      toast.info("Please approve the payment in Pi Browser...");
      await PiSDK.createPayment(paymentData, paymentCallbacks);

    } catch (error: any) {
      console.error('Subscription error:', error);
      
      if (error.message?.includes('not loaded')) {
        toast.error("Please open this app in Pi Browser");
      } else if (error.message?.includes('cancelled')) {
        toast.info("Payment cancelled");
      } else {
        toast.error(`Failed to process subscription: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/droplink-logo.png" alt="Droplink" className="h-8 w-auto" />
            <span className="font-bold text-xl">Droplink</span>
          </div>
          {piAuthenticated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-primary" />
              Signed in as {piUsername}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Coins className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Upgrade your Droplink with powerful features using Pi cryptocurrency
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            All prices are in Pi (π) - Pi Network's native cryptocurrency
          </p>

          {/* Pi Authentication Button */}
          {!piAuthenticated && (
            <div className="mt-8">
              <Button
                size="lg"
                onClick={handlePiAuth}
                disabled={loading}
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting to Pi Network...
                  </>
                ) : (
                  "Sign in with Pi Network to Continue"
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Open this app in Pi Browser to authenticate
              </p>
            </div>
          )}
          
          {/* Billing Toggle - Only show after Pi auth */}
          {piAuthenticated && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm ${!isYearly ? 'font-bold' : 'text-muted-foreground'}`}>
                Monthly
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsYearly(!isYearly)}
                className="relative h-8 w-16 rounded-full p-0"
              >
                <div
                  className={`absolute top-1 h-6 w-6 rounded-full bg-primary transition-all ${
                    isYearly ? 'right-1' : 'left-1'
                  }`}
                />
              </Button>
              <span className={`text-sm ${isYearly ? 'font-bold' : 'text-muted-foreground'}`}>
                Yearly
                <span className="ml-1 text-xs text-primary">(Save 20%)</span>
              </span>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${!piAuthenticated ? 'opacity-50 pointer-events-none' : ''}`}>
          {getPlans(isYearly).map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  disabled={loading || !piAuthenticated}
                  onClick={() => handlePiPayment(plan.name, plan.piAmount, isYearly ? 'yearly' : 'monthly')}
                >
                  {loading && selectedPlan === plan.name ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : plan.name === 'Free' ? (
                    "Start Free"
                  ) : (
                    "Subscribe with Pi"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
          <p>All plans include a 14-day money-back guarantee.</p>
          <p>Payments are processed securely through Pi Network blockchain.</p>
          <p className="mt-2">Questions? Contact support@droplink.space</p>
        </div>
      </div>
    </div>
  );
};

export default PiSubscription;
