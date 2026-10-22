import { describe, expect, it } from 'vitest';

import { mainlandChineseName, POOL_SIZES, singaporeChineseName, type PersonName } from './names.js';

/**
 * Well-known people a surname and a two-character given name could spell: business leaders,
 * politicians, entertainers and others a Singapore or China audience would recognise. Each comes
 * with its given name's pinyin, so that a homophone such as 李嘉成 for 李嘉诚 is caught as well.
 */
const PUBLIC_FIGURES: readonly (readonly [surname: string, given: string, pinyin: string])[] = [
  ['李', '嘉诚', 'jiacheng'],
  ['李', '嘉欣', 'jiaxin'],
  ['张', '一鸣', 'yiming'],
  ['马', '化腾', 'huateng'],
  ['李', '彦宏', 'yanhong'],
  ['任', '正非', 'zhengfei'],
  ['刘', '强东', 'qiangdong'],
  ['王', '健林', 'jianlin'],
  ['王', '传福', 'chuanfu'],
  ['曹', '德旺', 'dewang'],
  ['许', '家印', 'jiayin'],
  ['郭', '台铭', 'taiming'],
  ['李', '开复', 'kaifu'],
  ['张', '朝阳', 'chaoyang'],
  ['李', '显龙', 'xianlong'],
  ['李', '光耀', 'guangyao'],
  ['黄', '循财', 'xuncai'],
  ['吴', '作栋', 'zuodong'],
  ['习', '近平', 'jinping'],
  ['毛', '泽东', 'zedong'],
  ['邓', '小平', 'xiaoping'],
  ['周', '恩来', 'enlai'],
  ['孙', '中山', 'zhongshan'],
  ['马', '英九', 'yingjiu'],
  ['蔡', '英文', 'yingwen'],
  ['李', '世民', 'shimin'],
  ['林', '俊杰', 'junjie'],
  ['周', '杰伦', 'jielun'],
  ['孙', '燕姿', 'yanzi'],
  ['陈', '奕迅', 'yixun'],
  ['刘', '德华', 'dehua'],
  ['梁', '朝伟', 'chaowei'],
  ['张', '学友', 'xueyou'],
  ['张', '国荣', 'guorong'],
  ['邓', '丽君', 'lijun'],
  ['王', '力宏', 'lihong'],
  ['蔡', '依林', 'yilin'],
  ['林', '志玲', 'zhiling'],
  ['章', '子怡', 'ziyi'],
  ['范', '冰冰', 'bingbing'],
  ['赵', '丽颖', 'liying'],
  ['黄', '晓明', 'xiaoming'],
  ['王', '一博', 'yibo'],
  ['吴', '亦凡', 'yifan'],
  ['张', '艺谋', 'yimou'],
  ['李', '连杰', 'lianjie'],
  ['李', '小龙', 'xiaolong'],
  ['杨', '紫琼', 'ziqiong'],
  ['刘', '慈欣', 'cixin'],
  ['杨', '振宁', 'zhenning'],
  ['屠', '呦呦', 'youyou'],
  ['钟', '南山', 'nanshan'],
  ['袁', '隆平', 'longping'],
];

/** Every Chinese name the pools can make, Singapore and mainland style. */
function everyChineseName(): PersonName[] {
  const names: PersonName[] = [];
  for (let given = 0; given < POOL_SIZES.chineseGiven; given += 1) {
    for (let surname = 0; surname < POOL_SIZES.sgChineseSurnames; surname += 1) {
      names.push(singaporeChineseName(surname, given));
    }
    for (let surname = 0; surname < POOL_SIZES.mainlandSurnames; surname += 1) {
      names.push(mainlandChineseName(surname, given));
    }
  }
  return names;
}

describe('Chinese name pools', () => {
  it("spell no well-known person's name, nor a homophone of one", () => {
    const clashes = everyChineseName().filter((name) => {
      const surname = name.nameZh?.slice(0, 1);
      const given = name.nameZh?.slice(1);
      // The pool's Singapore form splits the pinyin into syllables ("Jia Le" for "Jiale").
      const sound = name.givenName.toLowerCase().replace(/\s+/g, '');
      return PUBLIC_FIGURES.some(
        ([figureSurname, figureGiven, pinyin]) =>
          figureSurname === surname && (figureGiven === given || pinyin === sound),
      );
    });
    expect(clashes.map((name) => `${name.fullNameLatin} ${String(name.nameZh)}`)).toEqual([]);
  });

  it('checks every combination, in both styles', () => {
    expect(everyChineseName()).toHaveLength(
      POOL_SIZES.chineseGiven * (POOL_SIZES.sgChineseSurnames + POOL_SIZES.mainlandSurnames),
    );
  });
});
