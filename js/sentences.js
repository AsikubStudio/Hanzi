// Zdania przykładowe: [chiński, pinyin, polski]. Każde zdanie obsługuje wszystkie znaki z bazy, które zawiera.
// Do znaku wybieramy zdanie, w którym jest jak najmniej JESZCZE NIEZNANYCH znaków z bazy (patrz bestSentence).
// Znaki spoza bazy (np. 是, 的, 很) traktujemy neutralnie, dopóki nie trafią do js/data.js.
import { BY_HANZI } from './data.js';
import { isKnown } from './store.js';

export const SENTENCES = [
  ['我爱你。', 'Wǒ ài nǐ.', 'Kocham cię.'],
  ['他是我的朋友。', 'Tā shì wǒ de péngyou.', 'On jest moim przyjacielem.'],
  ['你好吗？', 'Nǐ hǎo ma?', 'Jak się masz?'],
  ['我很好。', 'Wǒ hěn hǎo.', 'Mam się bardzo dobrze.'],
  ['他家很大。', 'Tā jiā hěn dà.', 'Jego dom jest bardzo duży.'],
  ['我家很小。', 'Wǒ jiā hěn xiǎo.', 'Mój dom jest bardzo mały.'],
  ['他有一个小马。', 'Tā yǒu yí gè xiǎo mǎ.', 'Ma małego konia.'],
  ['我想喝水。', 'Wǒ xiǎng hē shuǐ.', 'Chcę się napić wody.'],
  ['他在喝茶。', 'Tā zài hē chá.', 'On pije herbatę.'],
  ['我爱吃水果。', 'Wǒ ài chī shuǐguǒ.', 'Uwielbiam jeść owoce.'],
  ['你想吃什么？', 'Nǐ xiǎng chī shénme?', 'Co chcesz zjeść?'],
  ['妈妈在家。', 'Māma zài jiā.', 'Mama jest w domu.'],
  ['妈妈说你好。', 'Māma shuō nǐ hǎo.', 'Mama mówi ci cześć.'],
  ['他会说中国话。', 'Tā huì shuō Zhōngguó huà.', 'On umie mówić po chińsku.'],
  ['我在学中文。', 'Wǒ zài xué Zhōngwén.', 'Uczę się chińskiego.'],
  ['我是中国人。', 'Wǒ shì Zhōngguó rén.', 'Jestem Chińczykiem (Chinką).'],
  ['这座山很大。', 'Zhè zuò shān hěn dà.', 'Ta góra jest bardzo duża.'],
  ['山上有很多人。', 'Shān shàng yǒu hěn duō rén.', 'Na górze jest bardzo dużo ludzi.'],
  ['今天是几月几日？', 'Jīntiān shì jǐ yuè jǐ rì?', 'Jaka jest dzisiaj data?'],
  ['月亮很大。', 'Yuèliang hěn dà.', 'Księżyc jest bardzo duży.'],
  ['我每天看书。', 'Wǒ měitiān kàn shū.', 'Codziennie czytam książki.'],
  ['我想看电影。', 'Wǒ xiǎng kàn diànyǐng.', 'Chcę obejrzeć film.'],
  ['你在听什么？', 'Nǐ zài tīng shénme?', 'Czego słuchasz?'],
  ['我爱听音乐。', 'Wǒ ài tīng yīnyuè.', 'Uwielbiam słuchać muzyki.'],
  ['火很大，小心！', 'Huǒ hěn dà, xiǎoxīn!', 'Ogień jest duży, uważaj!'],
  ['我坐火车去北京。', 'Wǒ zuò huǒchē qù Běijīng.', 'Jadę pociągiem do Pekinu.'],
  ['她喜欢花。', 'Tā xǐhuan huā.', 'Ona lubi kwiaty.'],
  ['这朵花很大。', 'Zhè duǒ huā hěn dà.', 'Ten kwiat jest bardzo duży.'],
  ['他花了很多钱。', 'Tā huā le hěn duō qián.', 'Wydał dużo pieniędzy.'],
  ['你要吃药吗？', 'Nǐ yào chī yào ma?', 'Czy chcesz wziąć lekarstwo?'],
  ['他病了，要吃药。', 'Tā bìng le, yào chī yào.', 'Zachorował, musi wziąć lekarstwo.'],
  ['我妈妈病了。', 'Wǒ māma bìng le.', 'Moja mama zachorowała.'],
  ['这条路很新。', 'Zhè tiáo lù hěn xīn.', 'Ta droga jest nowa.'],
  ['路上人很多。', 'Lù shàng rén hěn duō.', 'Na drodze jest dużo ludzi.'],
  ['我有新朋友。', 'Wǒ yǒu xīn péngyou.', 'Mam nowego przyjaciela.'],
  ['他笑了。', 'Tā xiào le.', 'Uśmiechnął się.'],
  ['你笑得很好看。', 'Nǐ xiào de hěn hǎokàn.', 'Ładnie się uśmiechasz.'],
  ['他跑得很快。', 'Tā pǎo de hěn kuài.', 'Biega bardzo szybko.'],
  ['我想去山上跑步。', 'Wǒ xiǎng qù shān shàng pǎobù.', 'Chcę pobiegać po górach.'],
  ['他的眼睛很大。', 'Tā de yǎnjing hěn dà.', 'Jego oczy są bardzo duże.'],
  ['她的眼睛很小。', 'Tā de yǎnjing hěn xiǎo.', 'Jej oczy są bardzo małe.'],
  ['我刚到家。', 'Wǒ gāng dào jiā.', 'Dopiero co wróciłem do domu.'],
  ['他刚吃了药。', 'Tā gāng chī le yào.', 'Dopiero co wziął lekarstwo.'],
  ['我们必须学中文。', 'Wǒmen bìxū xué Zhōngwén.', 'Musimy uczyć się chińskiego.'],
  ['你必须喝水。', 'Nǐ bìxū hē shuǐ.', 'Musisz pić wodę.'],
  ['她的脸很小。', 'Tā de liǎn hěn xiǎo.', 'Jej twarz jest bardzo mała.'],
  ['他的脸红了。', 'Tā de liǎn hóng le.', 'Zarumienił się.'],
  ['山很绿。', 'Shān hěn lǜ.', 'Góry są bardzo zielone.'],
  ['她喜欢绿茶。', 'Tā xǐhuan lǜchá.', 'Ona lubi zieloną herbatę.'],
  ['我想画一座山。', 'Wǒ xiǎng huà yí zuò shān.', 'Chcę namalować górę.'],
  ['这幅画很大。', 'Zhè fú huà hěn dà.', 'Ten obraz jest bardzo duży.'],
  ['房间很乱。', 'Fángjiān hěn luàn.', 'W pokoju jest bałagan.'],
  ['我家很乱。', 'Wǒ jiā hěn luàn.', 'W moim domu jest bałagan.'],
  ['这个人好极了。', 'Zhè ge rén hǎo jí le.', 'Ten człowiek jest wspaniały.'],
  ['他跑得快极了。', 'Tā pǎo de kuài jí le.', 'Biega niezwykle szybko.'],
  ['山上有一片树林。', 'Shān shàng yǒu yí piàn shùlín.', 'Na górze jest zagajnik.'],
  ['我们去树林里看看。', 'Wǒmen qù shùlín lǐ kànkan.', 'Idziemy zobaczyć las.'],
  ['森林很大。', 'Sēnlín hěn dà.', 'Las jest bardzo duży.'],
  ['山上有一片森林。', 'Shān shàng yǒu yí piàn sēnlín.', 'Na górze jest las.'],
  ['妈妈骂我了。', 'Māma mà wǒ le.', 'Mama na mnie nakrzyczała.'],
  ['别骂人。', 'Bié mà rén.', 'Nie wyzywaj ludzi.'],
  ['我的脚麻了。', 'Wǒ de jiǎo má le.', 'Zdrętwiała mi stopa.'],
  ['麻烦你了。', 'Máfan nǐ le.', 'Przepraszam za kłopot.'],
  ['山上有一只鹿。', 'Shān shàng yǒu yì zhī lù.', 'Na górze jest jeleń.'],
  ['森林里有很多鹿。', 'Sēnlín lǐ yǒu hěn duō lù.', 'W lesie jest dużo jeleni.'],
  ['鹿跑得很快。', 'Lù pǎo de hěn kuài.', 'Jeleń biega bardzo szybko.'],
  ['你说什么？', 'Nǐ shuō shénme?', 'Co mówisz?'],
  ['他是学生。', 'Tā shì xuésheng.', 'On jest uczniem.'],
  ['你是哪国人？', 'Nǐ shì nǎ guó rén?', 'Z jakiego kraju jesteś?'],
  ['今天是我的生日。', 'Jīntiān shì wǒ de shēngrì.', 'Dziś są moje urodziny.'],
  ['他爱马。', 'Tā ài mǎ.', 'On kocha konie.'],
  ['我家有一匹马。', 'Wǒ jiā yǒu yì pǐ mǎ.', 'W moim domu jest koń.'],
  // HSK 1: zdania z kompletu 150 słów
  ['不客气。', 'Bú kèqi.', 'Nie ma za co.'],
  ['对不起，没关系。', 'Duìbuqǐ, méi guānxi.', 'Przepraszam. Nic nie szkodzi.'],
  ['谢谢你，再见！', 'Xièxie nǐ, zàijiàn!', 'Dziękuję, do widzenia!'],
  ['你叫什么名字？', 'Nǐ jiào shénme míngzi?', 'Jak masz na imię?'],
  ['我叫小明。', 'Wǒ jiào Xiǎo Míng.', 'Nazywam się Xiao Ming.'],
  ['很高兴认识你。', 'Hěn gāoxìng rènshi nǐ.', 'Miło cię poznać.'],
  ['请坐，请喝茶。', 'Qǐng zuò, qǐng hē chá.', 'Proszę usiąść, proszę napić się herbaty.'],
  ['你是哪国人？', 'Nǐ shì nǎ guó rén?', 'Z jakiego kraju jesteś?'],
  ['那是什么？', 'Nà shì shénme?', 'Co to jest tamto?'],
  ['这是我的书。', 'Zhè shì wǒ de shū.', 'To jest moja książka.'],
  ['这本书很好。', 'Zhè běn shū hěn hǎo.', 'Ta książka jest bardzo dobra.'],
  ['他们都是学生。', 'Tāmen dōu shì xuésheng.', 'Oni wszyscy są uczniami.'],
  ['现在几点？', 'Xiànzài jǐ diǎn?', 'Która jest godzina?'],
  ['现在三点。', 'Xiànzài sān diǎn.', 'Jest trzecia.'],
  ['今天星期几？', 'Jīntiān xīngqī jǐ?', 'Jaki dziś dzień tygodnia?'],
  ['昨天我去了商店。', 'Zuótiān wǒ qù le shāngdiàn.', 'Wczoraj poszedłem do sklepu.'],
  ['明天我们去学校。', 'Míngtiān wǒmen qù xuéxiào.', 'Jutro idziemy do szkoły.'],
  ['下午我在家。', 'Xiàwǔ wǒ zài jiā.', 'Po południu jestem w domu.'],
  ['上午老师来了。', 'Shàngwǔ lǎoshī lái le.', 'Przed południem przyszedł nauczyciel.'],
  ['我爸爸是医生。', 'Wǒ bàba shì yīshēng.', 'Mój tata jest lekarzem.'],
  ['妈妈在医院工作。', 'Māma zài yīyuàn gōngzuò.', 'Mama pracuje w szpitalu.'],
  ['我有一个儿子，一个女儿。', 'Wǒ yǒu yí gè érzi, yí gè nǚ\'ér.', 'Mam syna i córkę.'],
  ['我想买苹果。', 'Wǒ xiǎng mǎi píngguǒ.', 'Chcę kupić jabłka.'],
  ['苹果多少钱？', 'Píngguǒ duōshao qián?', 'Ile kosztują jabłka?'],
  ['三块五。', 'Sān kuài wǔ.', 'Trzy i pół juana.'],
  ['我家有猫和狗。', 'Wǒ jiā yǒu māo hé gǒu.', 'W moim domu są kot i pies.'],
  ['米饭很好吃。', 'Mǐfàn hěn hǎochī.', 'Ryż jest bardzo smaczny.'],
  ['我们去饭馆吃菜。', 'Wǒmen qù fànguǎn chī cài.', 'Idziemy do restauracji coś zjeść.'],
  ['一杯水，一杯茶。', 'Yì bēi shuǐ, yì bēi chá.', 'Szklanka wody i filiżanka herbaty.'],
  ['桌子上有一个杯子。', 'Zhuōzi shàng yǒu yí gè bēizi.', 'Na stole stoi kubek.'],
  ['椅子在桌子前面。', 'Yǐzi zài zhuōzi qiánmiàn.', 'Krzesło stoi przed stołem.'],
  ['商店在学校后面。', 'Shāngdiàn zài xuéxiào hòumiàn.', 'Sklep jest za szkołą.'],
  ['我的衣服在里面。', 'Wǒ de yīfu zài lǐmiàn.', 'Moje ubrania są w środku.'],
  ['今天很冷，昨天很热。', 'Jīntiān hěn lěng, zuótiān hěn rè.', 'Dziś jest bardzo zimno, wczoraj było gorąco.'],
  ['今天天气很好。', 'Jīntiān tiānqì hěn hǎo.', 'Dziś jest ładna pogoda.'],
  ['下雨了，我不去。', 'Xià yǔ le, wǒ bú qù.', 'Pada deszcz, nie idę.'],
  ['你会说汉语吗？', 'Nǐ huì shuō Hànyǔ ma?', 'Czy mówisz po chińsku?'],
  ['我能读，也能写。', 'Wǒ néng dú, yě néng xiě.', 'Umiem czytać i pisać.'],
  ['这个字怎么读？', 'Zhège zì zěnme dú?', 'Jak się czyta ten znak?'],
  ['他在学习汉语。', 'Tā zài xuéxí Hànyǔ.', 'On uczy się chińskiego.'],
  ['我睡觉了。', 'Wǒ shuìjiào le.', 'Idę spać.'],
  ['我想看电视。', 'Wǒ xiǎng kàn diànshì.', 'Chcę oglądać telewizję.'],
  ['我们看电影。', 'Wǒmen kàn diànyǐng.', 'Oglądamy film.'],
  ['我没有电脑。', 'Wǒ méiyǒu diànnǎo.', 'Nie mam komputera.'],
  ['他在打电话。', 'Tā zài dǎ diànhuà.', 'On rozmawia przez telefon.'],
  ['喂，你好吗？', 'Wèi, nǐ hǎo ma?', 'Halo, jak się masz?'],
  ['我坐飞机去北京。', 'Wǒ zuò fēijī qù Běijīng.', 'Jadę do Pekinu samolotem.'],
  ['我们坐出租车去火车站。', 'Wǒmen zuò chūzūchē qù huǒchēzhàn.', 'Jedziemy taksówką na dworzec kolejowy.'],
  ['这个东西很漂亮。', 'Zhège dōngxi hěn piàoliang.', 'Ta rzecz jest bardzo ładna.'],
  ['我六岁，他七岁。', 'Wǒ liù suì, tā qī suì.', 'Mam sześć lat, on ma siedem.'],
  ['我八点来，他九点来。', 'Wǒ bā diǎn lái, tā jiǔ diǎn lái.', 'Przyjdę o ósmej, a on o dziewiątej.'],
  ['他的电话是一二三四五六七八九零。', 'Tā de diànhuà shì yī èr sān sì wǔ liù qī bā jiǔ líng.', 'Jego numer telefonu to 1234567890.'],
  ['我在中国住了三年。', 'Wǒ zài Zhōngguó zhù le sān nián.', 'Mieszkałem w Chinach trzy lata.'],
  ['先生，请坐。', 'Xiānsheng, qǐng zuò.', 'Proszę usiąść, proszę pana.'],
  ['小姐，你好。', 'Xiǎojiě, nǐ hǎo.', 'Dzień dobry, proszę pani.'],
  ['这些书都是我的。', 'Zhèxiē shū dōu shì wǒ de.', 'Te wszystkie książki są moje.'],
  ['我的同学很少。', 'Wǒ de tóngxué hěn shǎo.', 'Mam mało kolegów z klasy.'],
  ['我下午回家。', 'Wǒ xiàwǔ huí jiā.', 'Wracam do domu po południu.'],
  ['你什么时候来？', 'Nǐ shénme shíhou lái?', 'Kiedy przyjdziesz?'],
  ['你认识他吗？', 'Nǐ rènshi tā ma?', 'Znasz go?'],
  ['谁在说话？', 'Shéi zài shuōhuà?', 'Kto mówi?'],
  ['你会开车吗？', 'Nǐ huì kāi chē ma?', 'Czy umiesz prowadzić samochód?'],
  ['他很高，她不高。', 'Tā hěn gāo, tā bù gāo.', 'On jest wysoki, a ona nie.'],
  ['我先做工作。', 'Wǒ xiān zuò gōngzuò.', 'Najpierw zrobię swoją pracę.'],
  ['我学习三十分钟。', 'Wǒ xuéxí sānshí fēnzhōng.', 'Uczę się trzydzieści minut.'],
  ['再喝一杯茶。', 'Zài hē yì bēi chá.', 'Napij się jeszcze herbaty.'],
  ['我很好，你呢？', 'Wǒ hěn hǎo, nǐ ne?', 'Dobrze, a ty?'],
  ['今天怎么样？', 'Jīntiān zěnmeyàng?', 'Jak dzisiaj?'],
  ['太好了！', 'Tài hǎo le!', 'Świetnie!'],
  ['我有很多朋友。', 'Wǒ yǒu hěn duō péngyou.', 'Mam wielu przyjaciół.'],
];

// hanzi → indeksy zdań, w których występuje (tylko znaki z bazy)
const INDEX = new Map();
SENTENCES.forEach(([zh], i) => {
  for (const ch of new Set(zh)) {
    if (!BY_HANZI.has(ch)) continue;
    if (!INDEX.has(ch)) INDEX.set(ch, []);
    INDEX.get(ch).push(i);
  }
});

// Wybiera zdanie z najmniejszą liczbą nieznanych znaków z bazy (poza samym znakiem), potem z największą
// liczbą znanych, potem najkrótsze. Zwraca null, gdy znak nie ma zdań.
export function bestSentence(hanzi) {
  const ids = INDEX.get(hanzi);
  if (!ids) return null;
  let best = null;
  for (const i of ids) {
    const [zh] = SENTENCES[i];
    const others = [...new Set(zh)].filter((ch) => ch !== hanzi && BY_HANZI.has(ch));
    const unknown = others.filter((ch) => !isKnown(ch)).length;
    const key = [unknown, -(others.length - unknown), zh.length, i];
    if (!best || lexLess(key, best.key)) best = { key, i };
  }
  const [zh, py, pl] = SENTENCES[best.i];
  return { zh, py, pl };
}

function lexLess(a, b) {
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] < b[k];
  return false;
}
