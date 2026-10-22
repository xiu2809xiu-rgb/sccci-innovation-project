/**
 * Name pools for the synthetic workforce. Common placeholder-like combinations
 * (for example 张伟) are avoided, and no surname and given name together spell a
 * well-known person's name, or a homophone of one: names.spec.ts checks every
 * combination the pools can make.
 */

export interface PersonName {
  familyName: string;
  givenName: string;
  fullNameLatin: string;
  nameZh: string | null;
}

interface ChineseSurname {
  /** Romanisation used in the person's records (dialect forms in Singapore, pinyin in China). */
  latin: string;
  zh: string;
}

interface ChineseGiven {
  /** Singapore style: two capitalised syllables, e.g. "Mei Ling". */
  sg: string;
  /** Mainland pinyin, e.g. "Meiling". */
  pinyin: string;
  zh: string;
}

/** Singapore Chinese surnames with their dialect romanisations. */
const SG_CHINESE_SURNAMES: readonly ChineseSurname[] = [
  { latin: 'Tan', zh: '陈' },
  { latin: 'Lim', zh: '林' },
  { latin: 'Lee', zh: '李' },
  { latin: 'Wong', zh: '黄' },
  { latin: 'Teo', zh: '张' },
  { latin: 'Koh', zh: '许' },
  { latin: 'Chua', zh: '蔡' },
  { latin: 'Ong', zh: '王' },
  { latin: 'Yeo', zh: '杨' },
  { latin: 'Ang', zh: '洪' },
  { latin: 'Low', zh: '刘' },
  { latin: 'Toh', zh: '卓' },
  { latin: 'Sim', zh: '沈' },
  { latin: 'Chong', zh: '钟' },
  { latin: 'Quek', zh: '郭' },
  { latin: 'Seah', zh: '佘' },
  { latin: 'Foo', zh: '符' },
];

const MAINLAND_SURNAMES: readonly ChineseSurname[] = [
  { latin: 'Wang', zh: '王' },
  { latin: 'Liu', zh: '刘' },
  { latin: 'Chen', zh: '陈' },
  { latin: 'Yang', zh: '杨' },
  { latin: 'Huang', zh: '黄' },
  { latin: 'Zhao', zh: '赵' },
  { latin: 'Xu', zh: '徐' },
  { latin: 'Sun', zh: '孙' },
  { latin: 'Ma', zh: '马' },
  { latin: 'Zhu', zh: '朱' },
  { latin: 'Hu', zh: '胡' },
  { latin: 'Guo', zh: '郭' },
  { latin: 'He', zh: '何' },
  { latin: 'Luo', zh: '罗' },
  { latin: 'Gao', zh: '高' },
  { latin: 'Liang', zh: '梁' },
  { latin: 'Zheng', zh: '郑' },
  { latin: 'Xie', zh: '谢' },
  { latin: 'Song', zh: '宋' },
  { latin: 'Tang', zh: '唐' },
  { latin: 'Han', zh: '韩' },
  { latin: 'Feng', zh: '冯' },
  { latin: 'Deng', zh: '邓' },
  { latin: 'Cao', zh: '曹' },
  { latin: 'Peng', zh: '彭' },
  { latin: 'Zeng', zh: '曾' },
  { latin: 'Xiao', zh: '肖' },
  { latin: 'Tian', zh: '田' },
  { latin: 'Dong', zh: '董' },
  { latin: 'Pan', zh: '潘' },
  { latin: 'Yuan', zh: '袁' },
  { latin: 'Cai', zh: '蔡' },
  { latin: 'Jiang', zh: '蒋' },
  { latin: 'Du', zh: '杜' },
  { latin: 'Ye', zh: '叶' },
  { latin: 'Cheng', zh: '程' },
  { latin: 'Wei', zh: '魏' },
  { latin: 'Su', zh: '苏' },
  { latin: 'Ding', zh: '丁' },
  { latin: 'Shen', zh: '沈' },
  { latin: 'Yao', zh: '姚' },
  { latin: 'Fu', zh: '傅' },
  { latin: 'Zhong', zh: '钟' },
  { latin: 'Cui', zh: '崔' },
  { latin: 'Lu', zh: '陆' },
  { latin: 'Fan', zh: '范' },
  { latin: 'Jin', zh: '金' },
  { latin: 'Liao', zh: '廖' },
  { latin: 'Xia', zh: '夏' },
  { latin: 'Fang', zh: '方' },
  { latin: 'Qin', zh: '秦' },
  { latin: 'Xue', zh: '薛' },
  { latin: 'Gu', zh: '顾' },
  { latin: 'Shao', zh: '邵' },
  { latin: 'Qian', zh: '钱' },
  { latin: 'Dai', zh: '戴' },
  { latin: 'Kong', zh: '孔' },
  { latin: 'Tao', zh: '陶' },
];

const CHINESE_GIVEN: readonly ChineseGiven[] = [
  { sg: 'Wei Ming', pinyin: 'Weiming', zh: '伟明' },
  { sg: 'Jia Hui', pinyin: 'Jiahui', zh: '佳慧' },
  { sg: 'Kai Wen', pinyin: 'Kaiwen', zh: '凯文' },
  { sg: 'Hui Min', pinyin: 'Huimin', zh: '慧敏' },
  { sg: 'Zhi Hao', pinyin: 'Zhihao', zh: '志豪' },
  { sg: 'Xin Yi', pinyin: 'Xinyi', zh: '心怡' },
  { sg: 'Jun Wei', pinyin: 'Junwei', zh: '俊伟' },
  { sg: 'Shu Ting', pinyin: 'Shuting', zh: '舒婷' },
  { sg: 'Yong Kang', pinyin: 'Yongkang', zh: '永康' },
  { sg: 'Li Ting', pinyin: 'Liting', zh: '丽婷' },
  { sg: 'Ming Zhe', pinyin: 'Mingzhe', zh: '明哲' },
  { sg: 'Wan Qing', pinyin: 'Wanqing', zh: '婉清' },
  { sg: 'Cheng Ze', pinyin: 'Chengze', zh: '承泽' },
  { sg: 'Ya Qin', pinyin: 'Yaqin', zh: '雅琴' },
  { sg: 'Hao Ran', pinyin: 'Haoran', zh: '浩然' },
  { sg: 'Shi Han', pinyin: 'Shihan', zh: '诗涵' },
  { sg: 'Jia Le', pinyin: 'Jiale', zh: '嘉乐' },
  { sg: 'Ruo Xi', pinyin: 'Ruoxi', zh: '若曦' },
  { sg: 'Tian You', pinyin: 'Tianyou', zh: '天佑' },
  { sg: 'Meng Qi', pinyin: 'Mengqi', zh: '梦琪' },
  { sg: 'Zhen Yu', pinyin: 'Zhenyu', zh: '振宇' },
  { sg: 'Xiao Wen', pinyin: 'Xiaowen', zh: '晓雯' },
  { sg: 'Si Yuan', pinyin: 'Siyuan', zh: '思远' },
  { sg: 'Jing Yi', pinyin: 'Jingyi', zh: '静怡' },
  { sg: 'Guo Dong', pinyin: 'Guodong', zh: '国栋' },
  { sg: 'Yu Tong', pinyin: 'Yutong', zh: '雨桐' },
  { sg: 'Peng Fei', pinyin: 'Pengfei', zh: '鹏飞' },
  { sg: 'Pei Shan', pinyin: 'Peishan', zh: '佩珊' },
  { sg: 'Hai Tao', pinyin: 'Haitao', zh: '海涛' },
  { sg: 'Shu Yao', pinyin: 'Shuyao', zh: '书瑶' },
  { sg: 'Bo Wen', pinyin: 'Bowen', zh: '博文' },
  { sg: 'Zi Han', pinyin: 'Zihan', zh: '梓涵' },
  { sg: 'Yi Hang', pinyin: 'Yihang', zh: '一航' },
  { sg: 'Xue Ying', pinyin: 'Xueying', zh: '雪莹' },
  { sg: 'Rui Lin', pinyin: 'Ruilin', zh: '瑞麟' },
  { sg: 'An Qi', pinyin: 'Anqi', zh: '安琪' },
  { sg: 'Hao Tian', pinyin: 'Haotian', zh: '昊天' },
  { sg: 'Wen Jing', pinyin: 'Wenjing', zh: '文静' },
  { sg: 'Zhi Yuan', pinyin: 'Zhiyuan', zh: '志远' },
  { sg: 'Ke Xin', pinyin: 'Kexin', zh: '可欣' },
  { sg: 'Jing Xing', pinyin: 'Jingxing', zh: '景行' },
  { sg: 'Zhi Ruo', pinyin: 'Zhiruo', zh: '芷若' },
  { sg: 'Xiao Dong', pinyin: 'Xiaodong', zh: '晓东' },
  { sg: 'Yu Yan', pinyin: 'Yuyan', zh: '语嫣' },
  { sg: 'Chen Yang', pinyin: 'Chenyang', zh: '晨阳' },
  { sg: 'Li Xin', pinyin: 'Lixin', zh: '立新' },
  { sg: 'Wen Tao', pinyin: 'Wentao', zh: '文涛' },
  { sg: 'Shu Fen', pinyin: 'Shufen', zh: '淑芬' },
];

/** Malay names: personal name and patronymic, written given-first. */
const MALAY_NAMES: readonly { given: string; family: string }[] = [
  { given: 'Hafiz', family: 'Rahman' },
  { given: 'Nurul Huda', family: 'Salleh' },
  { given: 'Amir', family: 'Hamzah' },
  { given: 'Faridah', family: 'Osman' },
  { given: 'Zulkifli', family: 'Ahmad' },
  { given: 'Haslinda', family: 'Yusof' },
  { given: 'Rizwan', family: 'Abdullah' },
  { given: 'Liyana', family: 'Kamal' },
  { given: 'Syafiq', family: 'Jamil' },
];

/** Indian names, written given-first. */
const INDIAN_NAMES: readonly { given: string; family: string }[] = [
  { given: 'Priya', family: 'Nair' },
  { given: 'Rajesh', family: 'Kumar' },
  { given: 'Kavitha', family: 'Subramaniam' },
  { given: 'Vikram', family: 'Pillai' },
  { given: 'Deepa', family: 'Krishnan' },
  { given: 'Ananya', family: 'Iyer' },
  { given: 'Harish', family: 'Chandran' },
  { given: 'Meena', family: 'Rajan' },
  { given: 'Karthik', family: 'Sundaram' },
];

/** Singapore Chinese name: dialect surname, two-syllable given name, written family-first. */
export function singaporeChineseName(surnameIndex: number, givenIndex: number): PersonName {
  const surname = SG_CHINESE_SURNAMES[surnameIndex % SG_CHINESE_SURNAMES.length] as ChineseSurname;
  const given = CHINESE_GIVEN[givenIndex % CHINESE_GIVEN.length] as ChineseGiven;
  return {
    familyName: surname.latin,
    givenName: given.sg,
    fullNameLatin: `${surname.latin} ${given.sg}`,
    nameZh: `${surname.zh}${given.zh}`,
  };
}

/** Mainland Chinese name in pinyin, written family-first. */
export function mainlandChineseName(surnameIndex: number, givenIndex: number): PersonName {
  const surname = MAINLAND_SURNAMES[surnameIndex % MAINLAND_SURNAMES.length] as ChineseSurname;
  const given = CHINESE_GIVEN[givenIndex % CHINESE_GIVEN.length] as ChineseGiven;
  return {
    familyName: surname.latin,
    givenName: given.pinyin,
    fullNameLatin: `${surname.latin} ${given.pinyin}`,
    nameZh: `${surname.zh}${given.zh}`,
  };
}

/** Malay name, written given-first, without Chinese characters. */
export function malayName(index: number): PersonName {
  const name = MALAY_NAMES[index % MALAY_NAMES.length] as { given: string; family: string };
  return {
    familyName: name.family,
    givenName: name.given,
    fullNameLatin: `${name.given} ${name.family}`,
    nameZh: null,
  };
}

/** Indian name, written given-first, without Chinese characters. */
export function indianName(index: number): PersonName {
  const name = INDIAN_NAMES[index % INDIAN_NAMES.length] as { given: string; family: string };
  return {
    familyName: name.family,
    givenName: name.given,
    fullNameLatin: `${name.given} ${name.family}`,
    nameZh: null,
  };
}

export const POOL_SIZES = {
  sgChineseSurnames: SG_CHINESE_SURNAMES.length,
  mainlandSurnames: MAINLAND_SURNAMES.length,
  chineseGiven: CHINESE_GIVEN.length,
  malay: MALAY_NAMES.length,
  indian: INDIAN_NAMES.length,
} as const;
