import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "Basic profile page",
      "Up to 5 products",
      "Basic analytics",
      "Social links",
    ],
    current: true,
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "per month",
    features: [
      "Everything in Free",
      "Unlimited products",
      "Advanced analytics with location data",
      "Custom domain support",
      "Donation/tip wallets",
      "Priority support",
      "Remove Droplink branding",
    ],
    popular: true,
  },
  {
    name: "Pro",
    price: "$29.99",
    period: "per month",
    features: [
      "Everything in Premium",
      "API access",
      "White-label solution",
      "Custom integrations",
      "Dedicated account manager",
    ],
  },
];

const Subscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planName: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to subscribe");
        navigate("/auth");
        return;
      }

      // This is a placeholder - in production, integrate with Stripe or payment provider
      toast.info(`Subscribing to ${planName} plan. Payment integration coming soon!`);
      
      // You would typically redirect to a payment page or open a payment modal here
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to process subscription");
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
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Upgrade your store with powerful features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
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
                  disabled={plan.current || loading}
                  onClick={() => handleSubscribe(plan.name)}
                >
                  {plan.current ? "Current Plan" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include a 14-day money-back guarantee.</p>
          <p className="mt-2">Questions? Contact support@droplink.com</p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;