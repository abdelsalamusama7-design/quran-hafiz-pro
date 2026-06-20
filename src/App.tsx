import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AudioProvider } from "@/contexts/AudioContext";
import BottomNav from "@/components/BottomNav";
import AudioPlayer from "@/components/AudioPlayer";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import WhatsAppFloat from "@/components/WhatsAppFloat";
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
import AuthPage from "./pages/AuthPage";
import CommunityPage from "./pages/CommunityPage";
import FamilyPage from "./pages/FamilyPage";
import DownloadsPage from "./pages/DownloadsPage";
import ManualMemorizationPage from "./pages/ManualMemorizationPage";
import RecordReviewPage from "./pages/RecordReviewPage";
import SearchPage from "./pages/SearchPage";
import MushafTafsirPage from "./pages/MushafTafsirPage";
import PrayerTimesPage from "./pages/PrayerTimesPage";
import AdhanPage from "./pages/AdhanPage";
import NotFound from "./pages/NotFound";
import { useActivitySync } from "@/hooks/useActivitySync";

const ActivitySyncBoot = () => {
  useActivitySync();
  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AudioProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ActivitySyncBoot />
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
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/family" element={<FamilyPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/manual-memorization" element={<ManualMemorizationPage />} />
              <Route path="/record-review" element={<RecordReviewPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/mushaf-tafsir" element={<MushafTafsirPage />} />
              <Route path="/prayer-times" element={<PrayerTimesPage />} />
              <Route path="/adhan" element={<AdhanPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AudioPlayer />
            <InstallPrompt />
            <OfflineIndicator />
            <WhatsAppFloat />
            <BottomNav />
          </BrowserRouter>
        </AudioProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
