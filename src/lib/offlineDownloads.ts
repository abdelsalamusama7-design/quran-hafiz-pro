// Verse counts per surah (1-114) — used to compute global verse number for cdn.islamic.network audio URLs
const VERSE_COUNTS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

const SURAH_OFFSETS: Record<number, number> = {};
{
  let cum = 0;
  for (let i = 0; i < VERSE_COUNTS.length; i++) {
    SURAH_OFFSETS[i + 1] = cum;
    cum += VERSE_COUNTS[i];
  }
}

const TEXT_CACHE_KEY = 'hafiz_offline_surahs_v1';
const SURAH_CACHE_NAME = 'hafiz-surah-text';
const AUDIO_CACHE_NAME = 'hafiz-audio-cache';

export interface DownloadProgress {
  surahId: number;
  current: number;
  total: number;
  phase: 'text' | 'audio' | 'done';
}

export interface OfflineSurahMeta {
  id: number;
  reciter: string;
  downloadedAt: string;
  verseCount: number;
  sizeEstimateMB: number;
}

const readMeta = (): Record<string, OfflineSurahMeta> => {
  try {
    const raw = localStorage.getItem(TEXT_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeMeta = (meta: Record<string, OfflineSurahMeta>) => {
  try {
    localStorage.setItem(TEXT_CACHE_KEY, JSON.stringify(meta));
  } catch {}
};

const metaKey = (surahId: number, reciter: string) => `${surahId}__${reciter}`;

export const getDownloadedSurahs = (): OfflineSurahMeta[] => {
  return Object.values(readMeta()).sort((a, b) => a.id - b.id);
};

export const isSurahDownloaded = (surahId: number, reciter: string): boolean => {
  const meta = readMeta();
  return Boolean(meta[metaKey(surahId, reciter)]);
};

const getAudioUrl = (reciterFolder: string, surahId: number, verseNum: number) => {
  const globalVerse = SURAH_OFFSETS[surahId] + verseNum;
  return `https://cdn.islamic.network/quran/audio/${reciterFolder}/${globalVerse}.mp3`;
};

const getTextUrl = (surahId: number) => `https://api.alquran.cloud/v1/surah/${surahId}`;

/**
 * Download a surah's text + all verses' audio for offline use.
 * Uses Cache Storage API (works with the PWA service worker).
 */
export const downloadSurah = async (
  surahId: number,
  reciterFolder: string,
  reciterId: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<{ success: boolean; error?: string }> => {
  const verseCount = VERSE_COUNTS[surahId - 1];
  if (!verseCount) return { success: false, error: 'Invalid surah' };

  try {
    // 1) Fetch and cache surah text
    onProgress?.({ surahId, current: 0, total: verseCount + 1, phase: 'text' });
    const textRes = await fetch(getTextUrl(surahId));
    if (!textRes.ok) throw new Error('Failed to fetch surah text');

    if ('caches' in window) {
      const textCache = await caches.open(SURAH_CACHE_NAME);
      await textCache.put(getTextUrl(surahId), textRes.clone());
    }

    // 2) Download all audio verses (in batches of 5 for parallel speed without DDoS)
    const audioCache = 'caches' in window ? await caches.open(AUDIO_CACHE_NAME) : null;
    const BATCH = 5;
    let totalBytes = 0;

    for (let start = 1; start <= verseCount; start += BATCH) {
      const batch: Promise<number>[] = [];
      for (let v = start; v < start + BATCH && v <= verseCount; v++) {
        const url = getAudioUrl(reciterFolder, surahId, v);
        batch.push(
          (async () => {
            try {
              // Skip if already cached
              if (audioCache) {
                const existing = await audioCache.match(url);
                if (existing) {
                  const blob = await existing.clone().blob();
                  return blob.size;
                }
              }
              const res = await fetch(url);
              if (!res.ok) return 0;
              if (audioCache) await audioCache.put(url, res.clone());
              const blob = await res.clone().blob();
              return blob.size;
            } catch {
              return 0;
            }
          })(),
        );
      }
      const sizes = await Promise.all(batch);
      totalBytes += sizes.reduce((a, b) => a + b, 0);
      const done = Math.min(start + BATCH - 1, verseCount);
      onProgress?.({ surahId, current: done, total: verseCount, phase: 'audio' });
    }

    // 3) Save metadata
    const meta = readMeta();
    meta[metaKey(surahId, reciterId)] = {
      id: surahId,
      reciter: reciterId,
      downloadedAt: new Date().toISOString(),
      verseCount,
      sizeEstimateMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
    };
    writeMeta(meta);
    onProgress?.({ surahId, current: verseCount, total: verseCount, phase: 'done' });

    try {
      window.dispatchEvent(new CustomEvent('hafiz:surah-downloaded', { detail: { surahId, reciter: reciterId } }));
    } catch {}
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Download failed' };
  }
};

export const removeDownloadedSurah = async (surahId: number, reciterFolder: string, reciterId: string): Promise<void> => {
  const verseCount = VERSE_COUNTS[surahId - 1];
  if (!verseCount) return;

  if ('caches' in window) {
    const audioCache = await caches.open(AUDIO_CACHE_NAME);
    for (let v = 1; v <= verseCount; v++) {
      try {
        await audioCache.delete(getAudioUrl(reciterFolder, surahId, v));
      } catch {}
    }
    // Don't delete text cache (other reciters may share it)
  }

  const meta = readMeta();
  delete meta[metaKey(surahId, reciterId)];
  writeMeta(meta);

  try {
    window.dispatchEvent(new CustomEvent('hafiz:surah-removed', { detail: { surahId, reciter: reciterId } }));
  } catch {}
};

export const getTotalDownloadedSize = (): number => {
  return Object.values(readMeta()).reduce((sum, m) => sum + (m.sizeEstimateMB || 0), 0);
};
