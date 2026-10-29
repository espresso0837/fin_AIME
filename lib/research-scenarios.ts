import { EVIDENCE, REPORTS, DEFAULT_QUESTION, type Evidence } from './research-data';
export type Scenario = {
  id: string; company: string; ticker: string; aliases: string[]; title: string;
  question: string; focus: string; boundary: string; metrics: Record<string,string>;
  reports: Record<number,{title:string;url:string;publishedAt:string}>; evidence: Evidence[];
};
const xiaomiReports = {
  2023: { title: '小米集团 2023 年度业绩公告', url: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2024/0319/2024031900546.pdf', publishedAt: '2024-03-19' },
  2024: { title: '小米集团 2024 年度业绩公告', url: 'https://ir.mi.com/system/files-encrypted/nasdaq_kms/assets/2025/03/18/5-38-56/%E8%8B%B1%E6%96%87%E5%85%AC%E5%91%8A.pdf', publishedAt: '2025-03-18' }
};
const bydReports = {
  2023: { title: '比亚迪 2023 年年度报告', url: 'https://www.hkexnews.hk/listedco/listconews/sehk/2024/0326/2024032602559.pdf', publishedAt: '2024-03-26' },
  2024: { title: '比亚迪 2024 年年度报告', url: 'https://www.hkexnews.hk/listedco/listconews/sehk/2025/0324/2025032401238.pdf', publishedAt: '2025-03-24' }
};
function item(company:string,reports:Scenario['reports'],year:number,metric:string,label:string,value:number|null,unit:string,page:number,scope:string,note:string,originalValue?:string,originalUnit?:string,pdfPage=page):Evidence {
  return {id:`${company}-E${year}-${metric}`,year,metric,label,value,unit,page,pdfPage,scope,note,originalValue,originalUnit,sourceUrl:reports[year].url,publishedAt:reports[year].publishedAt};
}
const x = (year:number,metric:string,label:string,value:number|null,unit:string,page:number,scope:string,note:string,originalValue?:string,originalUnit?:string) => item('xiaomi',xiaomiReports,year,metric,label,value,unit,page,scope,note,originalValue,originalUnit);
const b = (year:number,metric:string,label:string,value:number|null,unit:string,page:number,note:string,originalValue?:string,originalUnit?:string,pdfPage=page) => item('byd',bydReports,year,metric,label,value,unit,page,'比亚迪集团合并口径',note,originalValue,originalUnit,pdfPage);
export const SCENARIOS: Scenario[] = [
  {id:'catl',company:'宁德时代',ticker:'300750.SZ',aliases:['宁德','CATL','300750'],title:'储能增长的持续性',question:DEFAULT_QUESTION,focus:'需求 · 收入 · 盈利质量',boundary:'境外收入覆盖全公司，不能推算海外储能收入。毛利率两期水平差与变动栏有冲突；销量同比存在取整差异。',metrics:{revenue:'储能收入',volume:'储能销量',margin:'储能毛利率',overseas:'全公司境外收入',cross:'海外储能交叉披露'},reports:REPORTS,evidence:EVIDENCE},
  {id:'xiaomi',company:'小米集团',ticker:'1810.HK',aliases:['小米','XIAOMI','1810'],title:'新业务能否改善盈利',question:'小米的收入增长能否伴随盈利质量改善？汽车业务会带来哪些变化？',focus:'收入增长 · 毛利率 · 汽车投入',boundary:'经调整净利润属于非 IFRS 指标，不能与法定净利润混用。汽车新业务缺少可比基期，不计算跨期增速；集团盈利不能证明汽车已盈利。',metrics:{revenue:'集团收入',profit:'经调整净利润',margin:'集团毛利率',evRevenue:'汽车及创新业务收入',evLoss:'汽车及创新业务调整净亏损'},reports:xiaomiReports,evidence:[
    x(2023,'revenue','集团收入',2709.701,'亿元',2,'小米集团合并口径','披露同比下降3.2%。','270,970.1','百万元'),
    x(2023,'profit','经调整净利润',192.728,'亿元',2,'集团非 IFRS 口径','非IFRS经调整净利润，同比增长126.3%，不同于法定净利润。','19,272.8','百万元'),
    x(2023,'margin','集团毛利率',21.2,'%',4,'小米集团合并口径','披露同比增加4.2个百分点。','21.2','%'),
    x(2023,'evRevenue','汽车及创新业务收入',null,'亿元',4,'汽车及创新业务','公告说明SU7待发布；未形成可比的汽车业务收入披露。缺失不等于零。'),
    x(2023,'evLoss','汽车及创新业务调整净亏损',null,'亿元',4,'汽车及创新业务非IFRS口径','本资料集未提取可比净亏损，不以集团利润替代。'),
    x(2024,'revenue','集团收入',3659.064,'亿元',2,'小米集团合并口径','披露同比增长35.0%。','365,906.4','百万元'),
    x(2024,'profit','经调整净利润',272.345,'亿元',2,'集团非 IFRS 口径','非IFRS经调整净利润，同比增长41.3%。','27,234.5','百万元'),
    x(2024,'margin','集团毛利率',20.9,'%',4,'小米集团合并口径','与2023年的21.2%相比下降0.3个百分点。','20.9','%'),
    x(2024,'evRevenue','汽车及创新业务收入',327.536,'亿元',10,'汽车及其他创新业务合计','分部包含汽车及其他相关创新业务，不能把合计全部当作汽车收入；2023缺少可比基期。','32,753.6','百万元'),
    x(2024,'evLoss','汽车及创新业务调整净亏损',62,'亿元',7,'汽车及创新业务非IFRS口径','披露约62亿元调整净亏损；正数表示亏损规模。集团利润增长不等于汽车已盈利。','6.2','十亿元'),
  ]},
  {id:'byd',company:'比亚迪',ticker:'002594.SZ / 1211.HK',aliases:['比亚迪','BYD','002594','1211'],title:'增长能否转化为现金',question:'比亚迪的收入和利润增长，能否持续转化为经营现金流？',focus:'收入 · 归母利润 · 经营现金流',boundary:'使用集团合并口径，包含汽车与电子业务，不能归因于单一车型。经营现金流不等于自由现金流。毛利率跨报告存在列报变化，原始基期与后续重述值不可直接相减。',metrics:{revenue:'集团收入',profit:'归母净利润',margin:'集团毛利率',cashflow:'经营现金流'},reports:bydReports,evidence:[
    b(2023,'revenue','集团收入',6023.15354,'亿元',2,'披露同比增长42.04%。','602,315,354','千元',4),
    b(2023,'profit','归母净利润',300.40811,'亿元',2,'归属于母公司股东的利润，不等于整个集团净利润。','30,040,811','千元',4),
    {...b(2023,'margin','集团毛利率',20.21,'%',44,'2023年原始报告披露20.21%。该时期仅使用当时披露，不能提前使用后续重述值。','20.21','%',43),scope:'2023年原始列报口径'},
    b(2023,'cashflow','经营现金流',1697.25,'亿元',44,'管理层讨论披露约169725百万元，保留原披露精度；不等于自由现金流。','169,725','百万元',43),
    b(2024,'revenue','集团收入',7771.02455,'亿元',2,'披露同比增长29.02%。','777,102,455','千元',4),
    b(2024,'profit','归母净利润',402.54346,'亿元',2,'归母利润同比增长约34%。','40,254,346','千元',4),
    {...b(2024,'margin','集团毛利率',19.44,'%',47,'2024报告将2023比较值列为18.58%，与2023原始报告20.21%不同。同一新列报口径为18.58%→19.44%，增加0.86个百分点；不可直接与旧值相减。','19.44','%',44),scope:'2024年列报及重述比较口径'},
    b(2024,'cashflow','经营现金流',1334.54,'亿元',47,'管理层讨论披露约133454百万元。公司解释购买商品和接受服务的现金支付增加；不能单凭现金流下降断言盈利失真。','133,454','百万元',44),
  ]},
];
export function scenarioById(id?:string) { return SCENARIOS.find(s=>s.id===id) || SCENARIOS[0]; }
export function resolveScenario(question:string) { return SCENARIOS.find(s=>s.aliases.some(a=>question.toLowerCase().includes(a.toLowerCase()))); }
export function scenarioMatches(question:string) { return SCENARIOS.filter(s=>s.aliases.some(a=>question.toLowerCase().includes(a.toLowerCase()))); }
export function readEvidence(s:Scenario,year:number,metrics?:string[]) { return s.evidence.filter(e=>e.year===year&&(!metrics?.length||metrics.includes(e.metric))); }
export function compareScenario(s:Scenario,metrics=Object.keys(s.metrics)) { return metrics.map(metric=>{
  const a=s.evidence.find(e=>e.year===2023&&e.metric===metric), b=s.evidence.find(e=>e.year===2024&&e.metric===metric);
  const refs=[a?.id,b?.id].filter(Boolean);
  if(!a||!b||a.value===null||b.value===null||a.unit!==b.unit||a.scope!==b.scope) return {metric,label:b?.label||a?.label,previous:a?.value??null,current:b?.value??null,unit:b?.unit||a?.unit,status:'missing',delta:null,percentage:null,evidenceIds:refs,note:a&&b&&a.scope!==b.scope?'跨期口径发生变化，不直接计算变化。':'缺少同口径基期，不计算变化。'};
  const delta=b.value-a.value;
  return {metric,label:b.label,previous:a.value,current:b.value,unit:b.unit,status:'comparable',delta:+delta.toFixed(6),percentage:a.value===0?null:+(delta/Math.abs(a.value)*100).toFixed(2),evidenceIds:refs,note:b.note};
}); }
export const ALL_EVIDENCE=SCENARIOS.flatMap(s=>s.evidence);
export const ALL_REPORTS=SCENARIOS.flatMap(s=>Object.entries(s.reports).map(([year,r])=>({...r,year:Number(year),company:s.company})));
