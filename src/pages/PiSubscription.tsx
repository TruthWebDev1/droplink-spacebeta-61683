import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Coins } from "lucide-react";
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
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    // Get current user's profile
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, business_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setProfileId(profile.id);
        } else {
          // Create minimal profile so user can proceed
          const username = `user-${user.id.slice(0, 8)}`;
          const business = user.email?.split('@')[0] || 'New User';
          const { data: created } = await supabase
            .from('profiles')
            .insert({ user_id: user.id, username, business_name: business, subscription_plan: 'free' })
            .select('id')
            .single();
          if (created) setProfileId(created.id);
        }
      }
    };

    getProfile();
  }, []);

  const handlePiPayment = async (planName: string, piAmount: number, period: 'monthly' | 'yearly') => {
    if (piAmount === 0) {
      toast.info("You're already on the free plan!");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to subscribe");
        navigate("/auth");
        return;
      }

      if (!profileId) {
        toast.error("Profile not found");
        return;
      }

      // Initialize Pi SDK
      await PiSDK.initialize(false); // false = production, true = sandbox

      // Authenticate with Pi to ensure user is valid
      toast.info("Authenticating with Pi Network...");
      const authResult = await PiSDK.authenticate(['payments', 'username']);
      console.log('Pi user authenticated:', authResult.user.username);

      const paymentData: PiPaymentData = {
        amount: piAmount,
        memo: `Droplink ${planName} Subscription (${period})`,
        metadata: {
          profile_id: profileId,
          plan: planName.toLowerCase(),
          period: period
        },
      };

      const paymentCallbacks: PiPaymentCallbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('Payment ready for approval:', paymentId);
          toast.info("Processing payment...");

          try {
            // Call backend to approve the payment
            const { data, error } = await supabase.functions.invoke('pi-payment-approve', {
              body: { paymentId },
            });

            if (error) {
              console.error('Payment approval error:', error);
              toast.error("Failed to approve payment");
              throw error;
            }

            console.log('Payment approved:', data);
            toast.success("Payment approved!");
          } catch (err) {
            console.error('Approval error:', err);
            throw err;
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('Payment ready for completion:', paymentId, txid);
          toast.info("Completing payment...");

          try {
            // Call backend to complete the payment
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
            
            // Refresh the page to show new subscription status
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

      // Create the payment
      toast.info("Please approve the payment in Pi Browser...");
      await PiSDK.createPayment(paymentData, paymentCallbacks);

    } catch (error: any) {
      console.error('Subscription error:', error);
      
      if (error.message?.includes('not loaded')) {
        toast.error("Please open this app in Pi Browser");
      } else if (error.message?.includes('cancelled') || error.message?.includes('User cancelled')) {
        toast.info("Payment cancelled");
      } else {
        toast.error(`Failed to process subscription: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Coins className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Upgrade your store with powerful features using Pi cryptocurrency
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            All prices are in Pi (π) - Pi Network's native cryptocurrency
          </p>
          
          {/* Billing Toggle */}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                {plan.name === 'Free' ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={loading}
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        toast.error('Please log in');
                        navigate('/auth');
                        return;
                      }
                      if (!profileId) {
                        toast.error('Profile not found');
                        return;
                      }
                      // Ensure plan is set to free and proceed
                      await supabase
                        .from('profiles')
                        .update({ subscription_plan: 'free', subscription_expires_at: null, subscription_period: null })
                        .eq('id', profileId);
                      toast.success('Using Free plan');
                      navigate('/');
                    }}
                  >
                    Continue with Free
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    disabled={loading}
                    onClick={() => handlePiPayment(plan.name, plan.piAmount, isYearly ? 'yearly' : 'monthly')}
                  >
                    Subscribe with Pi
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
          <p>All plans include a 14-day money-back guarantee.</p>
          <p>Payments are processed securely through Pi Network blockchain.</p>
          <p className="mt-2">Questions? Contact support@droplink.com</p>
        </div>
      </div>
    </div>
  );
};

export default PiSubscription;
