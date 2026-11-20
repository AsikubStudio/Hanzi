// Baza znaków.
// Schemat rekordu: { hanzi, pinyin (z tonami), hsk (1–6, 7 = „6+”), en, pl }
// Znaczenia oddzielaj średnikiem. Poniżej zestaw startowy do testów interfejsu —
// pełna lista HSK 1–6 (ok. 2500 znaków) trafi tu w kolejnym kroku.
// Uwaga: przypisanie poziomów HSK w zestawie startowym wymaga weryfikacji z oficjalną listą.

export const LEVELS = [
  { n: 1, label: 'HSK 1', name: 'Ściółka' },
  { n: 2, label: 'HSK 2', name: 'Podszycie' },
  { n: 3, label: 'HSK 3', name: 'Młodnik' },
  { n: 4, label: 'HSK 4', name: 'Drzewostan' },
  { n: 5, label: 'HSK 5', name: 'Puszcza' },
  { n: 6, label: 'HSK 6', name: 'Szczyt' },
  { n: 7, label: 'HSK 6+', name: 'Ostoja jelenia' },
];

const RAW = [
  // HSK 1
  ['我', 'wǒ', 1, 'I; me', 'ja'],
  ['你', 'nǐ', 1, 'you', 'ty'],
  ['他', 'tā', 1, 'he; him', 'on'],
  ['好', 'hǎo', 1, 'good; well', 'dobry; dobrze'],
  ['爱', 'ài', 1, 'to love; love', 'kochać; miłość'],
  ['人', 'rén', 1, 'person; people', 'człowiek; ludzie'],
  ['大', 'dà', 1, 'big; large', 'duży; wielki'],
  ['小', 'xiǎo', 1, 'small; little', 'mały'],
  ['水', 'shuǐ', 1, 'water', 'woda'],
  ['火', 'huǒ', 1, 'fire', 'ogień'],
  ['山', 'shān', 1, 'mountain; hill', 'góra'],
  ['日', 'rì', 1, 'sun; day', 'słońce; dzień'],
  ['月', 'yuè', 1, 'moon; month', 'księżyc; miesiąc'],
  ['中', 'zhōng', 1, 'middle; centre', 'środek; wewnątrz'],
  ['国', 'guó', 1, 'country; nation', 'kraj; państwo'],
  ['学', 'xué', 1, 'to study; to learn', 'uczyć się; nauka'],
  ['吗', 'ma', 1, 'question particle', 'partykuła pytająca'],
  ['妈', 'mā', 1, 'mom; mother', 'mama'],
  ['马', 'mǎ', 1, 'horse', 'koń'],
  ['家', 'jiā', 1, 'home; family', 'dom; rodzina'],
  ['吃', 'chī', 1, 'to eat', 'jeść'],
  ['喝', 'hē', 1, 'to drink', 'pić'],
  ['说', 'shuō', 1, 'to speak; to say', 'mówić'],
  ['看', 'kàn', 1, 'to look; to watch', 'patrzeć; oglądać'],
  ['听', 'tīng', 1, 'to listen', 'słuchać'],
  // HSK 2
  ['茶', 'chá', 2, 'tea', 'herbata'],
  ['花', 'huā', 2, 'flower; to spend', 'kwiat; wydawać'],
  ['药', 'yào', 2, 'medicine', 'lekarstwo'],
  ['病', 'bìng', 2, 'illness; sick', 'choroba; chory'],
  ['路', 'lù', 2, 'road; path', 'droga; ścieżka'],
  ['新', 'xīn', 2, 'new', 'nowy'],
  ['笑', 'xiào', 2, 'to laugh; to smile', 'śmiać się; uśmiechać się'],
  ['跑', 'pǎo', 2, 'to run', 'biegać'],
  ['眼', 'yǎn', 2, 'eye', 'oko'],
  // HSK 3
  ['刚', 'gāng', 3, 'just now; only just', 'przed chwilą; dopiero co'],
  ['须', 'xū', 3, 'must; have to', 'musieć'],
  ['脸', 'liǎn', 3, 'face', 'twarz'],
  ['绿', 'lǜ', 3, 'green', 'zielony'],
  ['画', 'huà', 3, 'to draw; painting', 'rysować; obraz'],
  // HSK 4
  ['乱', 'luàn', 4, 'messy; chaotic', 'chaotyczny; bałagan'],
  ['极', 'jí', 4, 'extremely; pole', 'bardzo; ekstremalnie; biegun'],
  // HSK 5
  ['林', 'lín', 5, 'woods; grove', 'las; zagajnik'],
  ['森', 'sēn', 5, 'dense forest', 'gęsty las'],
  ['骂', 'mà', 5, 'to scold; to curse', 'ganić; przeklinać'],
  // HSK 6
  ['麻', 'má', 6, 'hemp; numb', 'konopie; zdrętwiały'],
  // HSK 6+
  ['鹿', 'lù', 7, 'deer', 'jeleń; sarna'],
];

export const CHARS = RAW.map(([hanzi, pinyin, hsk, en, pl]) => ({ hanzi, pinyin, hsk, en, pl }));
export const BY_HANZI = new Map(CHARS.map((c) => [c.hanzi, c]));
