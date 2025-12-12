import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionPlan = 'free' | 'premium' | 'pro';

export interface SubscriptionFeatures {
  maxLinks: number;
  maxSocial: number;
  hasAnalytics: boolean;
  hasYoutube: boolean;
  hasPiTips: boolean;
  hasAI: boolean;
  hasWatchAds: boolean;
  hasWatermark: boolean;
  hasPiAdNetwork: boolean;
}

const PLAN_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    maxLinks: 1,
    maxSocial: 1,
    hasAnalytics: false,
    hasYoutube: false,
    hasPiTips: false,
    hasAI: false,
    hasWatchAds: false,
    hasWatermark: true,
    hasPiAdNetwork: true,
  },
  premium: {
    maxLinks: -1, // unlimited
    maxSocial: -1,
    hasAnalytics: false,
    hasYoutube: true,
    hasPiTips: true,
    hasAI: false,
    hasWatchAds: false,
    hasWatermark: false,
    hasPiAdNetwork: false,
  },
  pro: {
    maxLinks: -1,
    maxSocial: -1,
    hasAnalytics: true,
    hasYoutube: true,
    hasPiTips: true,
    hasAI: true,
    hasWatchAds: true,
    hasWatermark: false,
    hasPiAdNetwork: false,
  },
};

export const useSubscription = () => {
  const [plan, setPlan] = useState<SubscriptionPlan>('free');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlan('free');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // If no profile exists, just use free plan (profile will be created in subscription page)
      if (!profile) {
        setPlan('free');
        setLoading(false);
        return;
      }

      const currentPlan = profile.subscription_plan as SubscriptionPlan || 'free';
      const expires = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;

      // Check if subscription is expired
      if (expires && expires < new Date()) {
        // Reset to free if expired
        await supabase
          .from('profiles')
          .update({ 
            subscription_plan: 'free',
            subscription_expires_at: null,
            subscription_period: null 
          })
          .eq('user_id', user.id);
        setPlan('free');
        setExpiresAt(null);
      } else {
        setPlan(currentPlan);
        setExpiresAt(expires);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = PLAN_FEATURES[plan];

  return {
    plan,
    expiresAt,
    features,
    loading,
    refresh: loadSubscription,
  };
};
