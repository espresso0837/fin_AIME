export type Evidence = {
  id: string;
  year: number;
  metric: string;
  label: string;
  value: number | null;
  unit: string;
  originalValue?: string;
  originalUnit?: string;
  page: number;
  pdfPage: number;
  scope: string;
  note: string;
  sourceUrl: string;
  publishedAt: string;
};
export const REPORTS = {
  2023: {
    title: "宁德时代 2023 年年度报告",
    url: "https://www.catl.com/uploads/1/file/public/202403/20240321205248_hda9h48qci.pdf",
    publishedAt: "2024-03-21",
  },
  2024: {
    title: "宁德时代 2024 年年度报告",
    url: "https://www.catl.com/uploads/1/file/public/202503/20250317094543_6ig9e0mwng.pdf",
    publishedAt: "2025-03-17",
  },
};
export const METRICS = ["revenue", "volume", "margin", "overseas"] as const;
function e(
  year: 2023 | 2024,
  metric: string,
  label: string,
  value: number | null,
  unit: string,
  page: number,
  pdfPage: number,
  scope: string,
  note: string,
  originalValue?: string,
  originalUnit?: string,
): Evidence {
  return {
    id: `E${year}-${metric}`,
    year,
    metric,
    label,
    value,
    unit,
    page,
    pdfPage,
    scope,
    note,
    originalValue,
    originalUnit,
    sourceUrl: REPORTS[year].url,
    publishedAt: REPORTS[year].publishedAt,
  };
}
export const EVIDENCE: Evidence[] = [
  e(
    2023,
    "revenue",
    "储能电池系统收入",
    599.005219,
    "亿元",
    17,
    18,
    "全球储能电池系统",
    "同比增长 33.17%；收入增长并不等同于未来增长承诺。",
    "5,990,052.19",
    "万元",
  ),
  e(
    2023,
    "volume",
    "储能电池系统销量",
    69,
    "GWh",
    14,
    15,
    "全球储能电池系统",
    "年报披露同比增长 46.81%；销量为四舍五入后的披露值。",
    "69",
    "GWh",
  ),
  e(
    2023,
    "margin",
    "储能电池系统毛利率",
    23.79,
    "%",
    17,
    18,
    "全球储能电池系统",
    "毛利率改善支持当期盈利质量，不能单独证明长期持续性。",
    "23.79",
    "%",
  ),
  e(
    2023,
    "overseas",
    "境外收入（全公司）",
    1309.921499,
    "亿元",
    17,
    18,
    "公司全部境外业务",
    "包含动力等业务，不能作为海外储能业务收入。",
    "13,099,214.99",
    "万元",
  ),
  e(
    2023,
    "cross",
    "海外储能收入",
    null,
    "亿元",
    16,
    17,
    "海外 × 储能",
    "分产品与分地区分别披露，本案例所核对表格未提供交叉收入，不能相乘估算。",
  ),
  e(
    2024,
    "revenue",
    "储能电池系统收入",
    572.9046,
    "亿元",
    20,
    20,
    "全球储能电池系统",
    "年报披露同比下降 4.36%；收入变化与销量变化方向不同。",
    "57,290,460",
    "千元",
  ),
  e(
    2024,
    "volume",
    "储能电池系统销量",
    93,
    "GWh",
    17,
    17,
    "全球储能电池系统",
    "年报披露同比增长 34.32%；与 69 GWh 的计算增幅略有差异，来自披露值取整。",
    "93",
    "GWh",
  ),
  e(
    2024,
    "margin",
    "储能电池系统毛利率",
    26.84,
    "%",
    20,
    20,
    "全球储能电池系统",
    "两期披露水平相减为 +3.05 个百分点。2024 表格另列变动 8.19%，与两期水平不一致，保留冲突，不混用。",
    "26.84",
    "%",
  ),
  e(
    2024,
    "overseas",
    "境外收入（全公司）",
    1103.35509,
    "亿元",
    20,
    20,
    "公司全部境外业务",
    "年报披露同比下降 15.77%；不能归因到海外储能单一业务。",
    "110,335,509",
    "千元",
  ),
  e(
    2024,
    "cross",
    "海外储能收入",
    null,
    "亿元",
    19,
    19,
    "海外 × 储能",
    "本案例所核对表格未提供交叉收入，海外储能的贡献仍待验证。",
  ),
];
export function getEvidence(year: number, metrics?: string[]) {
  return EVIDENCE.filter(
    (x) =>
      x.year === year &&
      (!metrics?.length || metrics.includes(x.metric) || x.metric === "cross"),
  );
}
export function compareEvidence(metrics: string[] = [...METRICS]) {
  return metrics.map((metric) => {
    const previous = EVIDENCE.find(
      (x) => x.year === 2023 && x.metric === metric,
    );
    const current = EVIDENCE.find(
      (x) => x.year === 2024 && x.metric === metric,
    );
    if (
      !previous ||
      !current ||
      previous.value === null ||
      current.value === null
    )
      return { metric, status: "missing" };
    const delta = current.value - previous.value;
    return {
      metric,
      label: current.label,
      previous: previous.value,
      current: current.value,
      unit: current.unit,
      delta: +delta.toFixed(6),
      percentage:
        previous.value === 0
          ? null
          : +((delta / previous.value) * 100).toFixed(2),
      evidenceIds: [previous.id, current.id],
      note: current.note,
    };
  });
}
export const DEFAULT_QUESTION =
  "宁德时代储能业务的增长能否持续？海外业务能提供哪些支持证据？";
export const DEFAULT_HYPOTHESES = [
  {
    id: "H1",
    text: "储能业务的需求增长，能够持续转化为收入增长",
    metricIds: ["revenue", "volume"],
    rationale: "同时看收入与销量，区分需求增长和价格变化。",
  },
  {
    id: "H2",
    text: "储能业务增长伴随盈利质量改善",
    metricIds: ["margin"],
    rationale: "收入规模之外，还需要验证毛利率是否改善。",
  },
  {
    id: "H3",
    text: "海外业务能够为储能增长提供支撑",
    metricIds: ["overseas", "cross"],
    rationale: "境外收入只能作为背景，海外储能贡献需要交叉披露。",
  },
];
