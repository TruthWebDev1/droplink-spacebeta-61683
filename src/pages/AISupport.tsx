import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";

const AISupport = () => {
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    business_info: "",
    faqs: "",
    custom_instructions: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in");
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        await loadAIConfig(profile.id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadAIConfig = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_support_config")
        .select("*")
        .eq("profile_id", id)
        .maybeSingle();

      if (data) {
        setConfig({
          enabled: data.enabled || false,
          business_info: data.business_info || "",
          faqs: data.faqs || "",
          custom_instructions: data.custom_instructions || "",
        });
      }
    } catch (error) {
      console.error("Error loading AI config:", error);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("ai_support_config")
        .upsert({
          profile_id: profileId,
          enabled: config.enabled,
          business_info: config.business_info,
          faqs: config.faqs,
          custom_instructions: config.custom_instructions,
        });

      if (error) throw error;

      toast.success("AI Support settings saved!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              AI Support Assistant
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your AI-powered customer support assistant
            </p>
          </div>
        </div>

        {/* Enable/Disable AI */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Label htmlFor="ai-enabled" className="text-lg font-semibold">
                  Enable AI Support
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Allow visitors to chat with an AI assistant on your profile
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enabled: checked })
              }
            />
          </div>
        </Card>

        {/* Configuration */}
        <Card className="p-6 space-y-6">
          <div>
            <Label htmlFor="business-info" className="text-base font-semibold">
              Business Information
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Tell the AI about your business, products, and services
            </p>
            <Textarea
              id="business-info"
              placeholder="We offer premium digital products for content creators. Our main products include... We also provide 24/7 customer support..."
              value={config.business_info}
              onChange={(e) =>
                setConfig({ ...config, business_info: e.target.value })
              }
              rows={6}
              className="resize-none"
            />
          </div>

          <div>
            <Label htmlFor="faqs" className="text-base font-semibold">
              Frequently Asked Questions
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Add common questions and answers (one per line or paragraph)
            </p>
            <Textarea
              id="faqs"
              placeholder="Q: What payment methods do you accept?&#10;A: We accept all major credit cards, PayPal, and cryptocurrency.&#10;&#10;Q: How long does delivery take?&#10;A: Digital products are delivered instantly after purchase."
              value={config.faqs}
              onChange={(e) => setConfig({ ...config, faqs: e.target.value })}
              rows={8}
              className="resize-none"
            />
          </div>

          <div>
            <Label htmlFor="instructions" className="text-base font-semibold">
              Custom Instructions
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Special guidelines for how the AI should respond
            </p>
            <Textarea
              id="instructions"
              placeholder="Always be professional and friendly. If someone asks about refunds, direct them to email support@example.com. Never discuss pricing discounts."
              value={config.custom_instructions}
              onChange={(e) =>
                setConfig({ ...config, custom_instructions: e.target.value })
              }
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="min-w-[150px]"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            How it works
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Visitors will see a chat button on your profile page</li>
            <li>• The AI uses the information you provide to answer questions</li>
            <li>• Conversations are saved for your review</li>
            <li>• The AI is powered by Google Gemini for natural conversations</li>
            <li>• You can update these settings anytime to improve responses</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AISupport;