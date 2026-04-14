import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AudioProvider } from "@/contexts/AudioContext";
import BottomNav from "@/components/BottomNav";
import AudioPlayer from "@/components/AudioPlayer";
import Index from "./pages/Index";
import QuranPage from "./pages/QuranPage";
import SurahViewPage from "./pages/SurahViewPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import QuizPage from "./pages/QuizPage";
import RecitationPage from "./pages/RecitationPage";
import AITutorPage from "./pages/AITutorPage";
import TajweedPage from "./pages/TajweedPage";
import BadgesPage from "./pages/BadgesPage";
import DailyWirdPage from "./pages/DailyWirdPage";
import KidsModePage from "./pages/KidsModeePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AudioProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/quran" element={<QuranPage />} />
              <Route path="/surah/:id" element={<SurahViewPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/recitation" element={<RecitationPage />} />
              <Route path="/tajweed" element={<TajweedPage />} />
              <Route path="/badges" element={<BadgesPage />} />
              <Route path="/daily-wird" element={<DailyWirdPage />} />
              <Route path="/ai-tutor" element={<AITutorPage />} />
              <Route path="/kids" element={<KidsModePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AudioPlayer />
            <BottomNav />
          </BrowserRouter>
        </AudioProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
