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
    piPrice: 0,
    displayPrice: "0π",
    period: "forever",
    features: [
      "Only 1 link allowed",
      "Pi Ad Network included",
      "Droplink watermark",
      "Limited features only",
      "Community disabled",
    ],
    current: true,
  },
  {
    name: "Premium",
    piPrice: isYearly ? 96 : 10,
    displayPrice: isYearly ? "96π" : "10π",
    period: isYearly ? "per year" : "per month",
    discount: isYearly ? "20% off" : null,
    features: [
      "Unlimited links",
      "No Pi Ad Network",
      "Remove Droplink watermark",
      "Unlimited customized design",
      "Community enabled",
      "No analytics access",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Pro",
    piPrice: isYearly ? 288 : 30,
    displayPrice: isYearly ? "288π" : "30π",
    period: isYearly ? "per year" : "per month",
    discount: isYearly ? "20% off" : null,
    features: [
      "Everything in Premium",
      "Advanced analytics included",
      "API access",
      "White-label solution",
      "Custom integrations",
      "Dedicated account manager",
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
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setProfileId(profile.id);
        }
      }
    };

    getProfile();
  }, []);

  const handlePiPayment = async (planName: string, piAmount: number) => {
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
        memo: `${planName} Plan Subscription - Droplink`,
        metadata: {
          planName,
          profileId,
          subscriptionType: 'monthly',
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
              navigate("/dashboard");
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
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
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <span className="text-3xl font-bold text-foreground">{plan.displayPrice}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/{plan.period}</span>
                    {plan.discount && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {plan.discount}
                      </span>
                    )}
                  </div>
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
                  disabled={plan.current || loading}
                  onClick={() => handlePiPayment(plan.name, plan.piPrice)}
                >
                  {plan.current ? "Current Plan" : `Pay ${plan.displayPrice}`}
                </Button>
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
