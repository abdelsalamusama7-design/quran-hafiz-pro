export interface Surah {
  id: number;
  name: string;
  nameEn: string;
  nameTranslation: string;
  versesCount: number;
  revelationType: 'meccan' | 'medinan';
  juz: number[];
}

export const surahs: Surah[] = [
  { id: 1, name: 'الفاتحة', nameEn: 'Al-Fatiha', nameTranslation: 'The Opening', versesCount: 7, revelationType: 'meccan', juz: [1] },
  { id: 2, name: 'البقرة', nameEn: 'Al-Baqarah', nameTranslation: 'The Cow', versesCount: 286, revelationType: 'medinan', juz: [1,2,3] },
  { id: 3, name: 'آل عمران', nameEn: 'Ali Imran', nameTranslation: 'Family of Imran', versesCount: 200, revelationType: 'medinan', juz: [3,4] },
  { id: 4, name: 'النساء', nameEn: 'An-Nisa', nameTranslation: 'The Women', versesCount: 176, revelationType: 'medinan', juz: [4,5,6] },
  { id: 5, name: 'المائدة', nameEn: 'Al-Ma\'idah', nameTranslation: 'The Table', versesCount: 120, revelationType: 'medinan', juz: [6,7] },
  { id: 6, name: 'الأنعام', nameEn: 'Al-An\'am', nameTranslation: 'The Cattle', versesCount: 165, revelationType: 'meccan', juz: [7,8] },
  { id: 7, name: 'الأعراف', nameEn: 'Al-A\'raf', nameTranslation: 'The Heights', versesCount: 206, revelationType: 'meccan', juz: [8,9] },
  { id: 8, name: 'الأنفال', nameEn: 'Al-Anfal', nameTranslation: 'The Spoils of War', versesCount: 75, revelationType: 'medinan', juz: [9,10] },
  { id: 9, name: 'التوبة', nameEn: 'At-Tawbah', nameTranslation: 'The Repentance', versesCount: 129, revelationType: 'medinan', juz: [10,11] },
  { id: 10, name: 'يونس', nameEn: 'Yunus', nameTranslation: 'Jonah', versesCount: 109, revelationType: 'meccan', juz: [11] },
  { id: 11, name: 'هود', nameEn: 'Hud', nameTranslation: 'Hud', versesCount: 123, revelationType: 'meccan', juz: [11,12] },
  { id: 12, name: 'يوسف', nameEn: 'Yusuf', nameTranslation: 'Joseph', versesCount: 111, revelationType: 'meccan', juz: [12,13] },
  { id: 13, name: 'الرعد', nameEn: 'Ar-Ra\'d', nameTranslation: 'The Thunder', versesCount: 43, revelationType: 'medinan', juz: [13] },
  { id: 14, name: 'إبراهيم', nameEn: 'Ibrahim', nameTranslation: 'Abraham', versesCount: 52, revelationType: 'meccan', juz: [13] },
  { id: 15, name: 'الحجر', nameEn: 'Al-Hijr', nameTranslation: 'The Rocky Tract', versesCount: 99, revelationType: 'meccan', juz: [14] },
  { id: 16, name: 'النحل', nameEn: 'An-Nahl', nameTranslation: 'The Bee', versesCount: 128, revelationType: 'meccan', juz: [14] },
  { id: 17, name: 'الإسراء', nameEn: 'Al-Isra', nameTranslation: 'The Night Journey', versesCount: 111, revelationType: 'meccan', juz: [15] },
  { id: 18, name: 'الكهف', nameEn: 'Al-Kahf', nameTranslation: 'The Cave', versesCount: 110, revelationType: 'meccan', juz: [15,16] },
  { id: 19, name: 'مريم', nameEn: 'Maryam', nameTranslation: 'Mary', versesCount: 98, revelationType: 'meccan', juz: [16] },
  { id: 20, name: 'طه', nameEn: 'Ta-Ha', nameTranslation: 'Ta-Ha', versesCount: 135, revelationType: 'meccan', juz: [16] },
  { id: 36, name: 'يس', nameEn: 'Ya-Sin', nameTranslation: 'Ya-Sin', versesCount: 83, revelationType: 'meccan', juz: [22,23] },
  { id: 55, name: 'الرحمن', nameEn: 'Ar-Rahman', nameTranslation: 'The Most Gracious', versesCount: 78, revelationType: 'medinan', juz: [27] },
  { id: 56, name: 'الواقعة', nameEn: 'Al-Waqi\'ah', nameTranslation: 'The Event', versesCount: 96, revelationType: 'meccan', juz: [27] },
  { id: 67, name: 'الملك', nameEn: 'Al-Mulk', nameTranslation: 'The Sovereignty', versesCount: 30, revelationType: 'meccan', juz: [29] },
  { id: 78, name: 'النبأ', nameEn: 'An-Naba', nameTranslation: 'The Great News', versesCount: 40, revelationType: 'meccan', juz: [30] },
  { id: 87, name: 'الأعلى', nameEn: 'Al-A\'la', nameTranslation: 'The Most High', versesCount: 19, revelationType: 'meccan', juz: [30] },
  { id: 93, name: 'الضحى', nameEn: 'Ad-Duha', nameTranslation: 'The Morning Hours', versesCount: 11, revelationType: 'meccan', juz: [30] },
  { id: 94, name: 'الشرح', nameEn: 'Ash-Sharh', nameTranslation: 'The Opening Forth', versesCount: 8, revelationType: 'meccan', juz: [30] },
  { id: 95, name: 'التين', nameEn: 'At-Tin', nameTranslation: 'The Fig', versesCount: 8, revelationType: 'meccan', juz: [30] },
  { id: 96, name: 'العلق', nameEn: 'Al-Alaq', nameTranslation: 'The Clot', versesCount: 19, revelationType: 'meccan', juz: [30] },
  { id: 97, name: 'القدر', nameEn: 'Al-Qadr', nameTranslation: 'The Power', versesCount: 5, revelationType: 'meccan', juz: [30] },
  { id: 98, name: 'البينة', nameEn: 'Al-Bayyinah', nameTranslation: 'The Clear Evidence', versesCount: 8, revelationType: 'medinan', juz: [30] },
  { id: 99, name: 'الزلزلة', nameEn: 'Az-Zalzalah', nameTranslation: 'The Earthquake', versesCount: 8, revelationType: 'medinan', juz: [30] },
  { id: 100, name: 'العاديات', nameEn: 'Al-Adiyat', nameTranslation: 'The Chargers', versesCount: 11, revelationType: 'meccan', juz: [30] },
  { id: 101, name: 'القارعة', nameEn: 'Al-Qari\'ah', nameTranslation: 'The Calamity', versesCount: 11, revelationType: 'meccan', juz: [30] },
  { id: 102, name: 'التكاثر', nameEn: 'At-Takathur', nameTranslation: 'The Rivalry', versesCount: 8, revelationType: 'meccan', juz: [30] },
  { id: 103, name: 'العصر', nameEn: 'Al-Asr', nameTranslation: 'The Time', versesCount: 3, revelationType: 'meccan', juz: [30] },
  { id: 104, name: 'الهمزة', nameEn: 'Al-Humazah', nameTranslation: 'The Slanderer', versesCount: 9, revelationType: 'meccan', juz: [30] },
  { id: 105, name: 'الفيل', nameEn: 'Al-Fil', nameTranslation: 'The Elephant', versesCount: 5, revelationType: 'meccan', juz: [30] },
  { id: 106, name: 'قريش', nameEn: 'Quraysh', nameTranslation: 'Quraysh', versesCount: 4, revelationType: 'meccan', juz: [30] },
  { id: 107, name: 'الماعون', nameEn: 'Al-Ma\'un', nameTranslation: 'The Small Kindnesses', versesCount: 7, revelationType: 'meccan', juz: [30] },
  { id: 108, name: 'الكوثر', nameEn: 'Al-Kawthar', nameTranslation: 'The Abundance', versesCount: 3, revelationType: 'meccan', juz: [30] },
  { id: 109, name: 'الكافرون', nameEn: 'Al-Kafirun', nameTranslation: 'The Disbelievers', versesCount: 6, revelationType: 'meccan', juz: [30] },
  { id: 110, name: 'النصر', nameEn: 'An-Nasr', nameTranslation: 'The Help', versesCount: 3, revelationType: 'medinan', juz: [30] },
  { id: 111, name: 'المسد', nameEn: 'Al-Masad', nameTranslation: 'The Palm Fiber', versesCount: 5, revelationType: 'meccan', juz: [30] },
  { id: 112, name: 'الإخلاص', nameEn: 'Al-Ikhlas', nameTranslation: 'The Sincerity', versesCount: 4, revelationType: 'meccan', juz: [30] },
  { id: 113, name: 'الفلق', nameEn: 'Al-Falaq', nameTranslation: 'The Daybreak', versesCount: 5, revelationType: 'meccan', juz: [30] },
  { id: 114, name: 'الناس', nameEn: 'An-Nas', nameTranslation: 'Mankind', versesCount: 6, revelationType: 'meccan', juz: [30] },
];
