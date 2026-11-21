// Wymowa: wbudowana synteza mowy przeglądarki (Web Speech API), bez plików audio. Jakość zależy od głosów w telefonie.
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

const zhVoice = () => {
  const vs = speechSynthesis.getVoices();
  return {
    loaded: vs.length > 0,
    voice: vs.find((v) => /^zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null,
  };
};

// Niektóre przeglądarki ładują listę głosów dopiero po chwili.
if (canSpeak) speechSynthesis.getVoices();

// Zwraca 'ok', 'novoice' (telefon ma głosy, ale żadnego chińskiego) albo 'unsupported'.
export function speak(text, rate = 0.8) {
  if (!canSpeak) return 'unsupported';
  const { loaded, voice } = zhVoice();
  if (loaded && !voice) return 'novoice';
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'zh-CN';
  if (voice) u.voice = voice;
  u.rate = rate;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return 'ok';
}
