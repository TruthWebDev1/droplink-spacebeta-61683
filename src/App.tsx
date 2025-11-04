import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PublicBio from "./pages/PublicBio";
import NotFound from "./pages/NotFound";
import Subscription from "./pages/Subscription";
import PiSubscription from "./pages/PiSubscription";
import Followers from "./pages/Followers";
import Wallet from "./pages/Wallet";
import AISupport from "./pages/AISupport";
import Admin from "./pages/Admin";
import { Auth } from "./components/Auth";
import { PiAuth } from "./components/PiAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<PiAuth />} />
          <Route path="/subscription" element={<PiSubscription />} />
          <Route path="/followers" element={<Followers />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/ai-support" element={<AISupport />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/:username" element={<PublicBio />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
