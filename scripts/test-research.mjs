import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";
const dir = new URL("../work/test-build/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const name of ["research-data", "research-scenarios", "research-engine"]) {
  const src = readFileSync(
    new URL("../lib/" + name + ".ts", import.meta.url),
    "utf8",
  );
  let js = ts
    .transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace(/(["'])\.\/(research-data|research-scenarios)\1/g, '"./$2.mjs"');
  writeFileSync(new URL(name + ".mjs", dir), js);
}
const { getEvidence, compareEvidence, DEFAULT_QUESTION } = await import(
  new URL("research-data.mjs", dir)
);
const { runResearch } = await import(new URL("research-engine.mjs", dir));
const config = { key: "test-only-placeholder" };
const results = [];
async function test(name, fn) {
  await fn();
  results.push({ name, result: "PASS" });
  console.log("PASS " + name);
}
function completion(message, status = 200) {
  return new Response(
    JSON.stringify({
      choices: [{ message }],
      model: "test-model",
      usage: { total_tokens: 25 },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}
function tool(name, args, id = "t1") {
  return {
    role: "assistant",
    content: null,
    tool_calls: [
      {
        id,
        type: "function",
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  };
}
function answer(refs = ["E2023-revenue"]) {
  return {
    role: "assistant",
    content: JSON.stringify({
      title: "测试研究",
      summary: "有依据的研究结论",
      hypotheses: [
        {
          id: "H1",
          text: "验证收入增长",
          status: "supported",
          metricIds: ["revenue"],
          conclusion: "测试结论",
          evidenceIds: refs,
        },
      ],
      limitations: ["历史数据"],
    }),
  };
}
await test("2023基线只包含当期披露", () =>
  assert.ok(getEvidence(2023).every((e) => e.year === 2023)));
await test("收入原单位万元和千元正确归一", () => {
  assert.equal(getEvidence(2023, ["revenue"])[0].value, 599.005219);
  assert.equal(getEvidence(2024, ["revenue"])[0].value, 572.9046);
});
await test("毛利率比较为3.05个百分点", () =>
  assert.equal(compareEvidence(["margin"])[0].delta, 3.05));
await test("缺失交叉披露不补造数值", () =>
  assert.equal(getEvidence(2024, ["cross"])[0].value, null));
await test("真实工具输出后才接受研究", async () => {
  let n = 0;
  const out = await runResearch(
    { question: DEFAULT_QUESTION },
    config,
    async () =>
      completion(
        n++ === 0 ? tool("get_disclosure_evidence", { year: 2023 }) : answer(),
      ),
  );
  assert.equal(out.trace.length, 1);
  assert.equal(out.year, 2023);
});
await test("基线请求未来年份被拒绝", async () =>
  assert.rejects(
    () =>
      runResearch({ question: DEFAULT_QUESTION }, config, async () =>
        completion(tool("get_disclosure_evidence", { year: 2024 })),
      ),
    /时间范围/,
  ));
await test("伪造证据ID被拒绝", async () => {
  let n = 0;
  await assert.rejects(
    () =>
      runResearch({ question: DEFAULT_QUESTION }, config, async () =>
        completion(
          n++ === 0
            ? tool("get_disclosure_evidence", { year: 2023 })
            : answer(["invented"]),
        ),
      ),
    /未读取的证据/,
  );
});
await test("未调用工具的结果被拒绝", async () =>
  assert.rejects(
    () =>
      runResearch({ question: DEFAULT_QUESTION }, config, async () =>
        completion(answer()),
      ),
    /没有读取证据/,
  ));
await test("模型接口失败返回可理解状态", async () =>
  assert.rejects(
    () =>
      runResearch(
        { question: DEFAULT_QUESTION },
        config,
        async () => new Response("{}", { status: 401 }),
      ),
    /凭据无效/,
  ));
await test("接口超时返回重试与保留提示", async () =>
  assert.rejects(
    () =>
      runResearch({ question: DEFAULT_QUESTION }, config, async () => {
        throw Error("timeout");
      }),
    /超时.*原研究/,
  ));
await test("输出非JSON拒绝保存", async () => {
  let n = 0;
  await assert.rejects(
    () =>
      runResearch({ question: DEFAULT_QUESTION }, config, async () =>
        completion(
          n++ === 0
            ? tool("get_disclosure_evidence", { year: 2023 })
            : { role: "assistant", content: "bad json" },
        ),
      ),
    /格式不完整/,
  );
});
await test("不支持的研究对象被明确拒绝", async () =>
  assert.rejects(
    () => runResearch({ question: "我想研究贵州茅台的增长空间" }, config),
    /宁德时代、小米或比亚迪/,
  ));
await test("反馈与编辑假设进入下一次模型输入", async () => {
  let n = 0,
    seen;
  const feedback = [
    { hypothesisId: "H1", type: "weak", note: "请优先验证收入质量" },
  ];
  await runResearch(
    {
      question: DEFAULT_QUESTION,
      feedback,
      hypotheses: [
        { id: "H1", text: "我修改的研究目标", metricIds: ["revenue"] },
      ],
    },
    config,
    async (url, o) => {
      seen = JSON.parse(o.body);
      return completion(
        n++ === 0 ? tool("get_disclosure_evidence", { year: 2023 }) : answer(),
      );
    },
  );
  const content = JSON.parse(seen.messages[1].content);
  assert.equal(content.feedback[0].note, feedback[0].note);
  assert.equal(content.hypotheses[0].text, "我修改的研究目标");
});
await test("更新保留原假设ID且确定性比较完成", async () => {
  let n = 0;
  const out = await runResearch(
    {
      action: "check",
      question: DEFAULT_QUESTION,
      hypotheses: [{ id: "H1", text: "原假设", metricIds: ["revenue"] }],
    },
    config,
    async () =>
      completion(
        n++ === 0
          ? tool("get_disclosure_evidence", { year: 2023 })
          : n === 2
            ? tool("get_disclosure_evidence", { year: 2024 }, "t2")
            : answer(["E2024-revenue"]),
      ),
  );
  assert.equal(out.hypotheses[0].text, "原假设");
  assert.ok(out.trace.some((x) => x.tool === "compare_periods"));
});
const { SCENARIOS, resolveScenario, readEvidence, compareScenario } = await import(new URL("research-scenarios.mjs", dir));
await test("公司名称与代码路由到独立资料集", () => {
 assert.equal(resolveScenario("研究1810.HK盈利")?.id,"xiaomi");
 assert.equal(resolveScenario("研究比亚迪现金流")?.id,"byd");
 assert.equal(resolveScenario("研究CATL增长")?.id,"catl");
 assert.equal(resolveScenario("研究茅台"),undefined);
});
await test("所有证据ID唯一且每期只读取本公司数据", () => {
 const ids=SCENARIOS.flatMap(s=>s.evidence.map(e=>e.id));
 assert.equal(ids.length,new Set(ids).size);
 for(const s of SCENARIOS) assert.ok(readEvidence(s,2023).every(e=>e.year===2023&&s.reports[2023].url===e.sourceUrl));
});
await test("小米毛利率下降0.3个百分点，新业务不造同比", () => {
 const c=compareScenario(SCENARIOS[1]);
 assert.equal(c.find(x=>x.metric==="margin").delta,-0.3);
 assert.equal(c.find(x=>x.metric==="evRevenue").percentage,null);
 assert.equal(c.find(x=>x.metric==="evRevenue").previous,null);
});
await test("比亚迪现金流下降且毛利率口径变更禁止直接相减", () => {
 const c=compareScenario(SCENARIOS[2]);
 assert.ok(c.find(x=>x.metric==="cashflow").percentage<0);
 assert.equal(c.find(x=>x.metric==="margin").status,"missing");
 assert.equal(c.find(x=>x.metric==="margin").delta,null);
});
await test("跨公司证据引用被拒绝", async () => {
 let n=0;
 await assert.rejects(()=>runResearch({question:SCENARIOS[1].question},config,async()=>completion(n++===0?tool("get_disclosure_evidence",{year:2023}):answer(["E2023-revenue"]))),/未读取的证据/);
});
await test("新增公司实际走同一工具循环并保留场景", async () => {
 for(const s of SCENARIOS.slice(1)) {
 let n=0;
 const out=await runResearch({question:s.question},config,async()=>completion(n++===0?tool("get_disclosure_evidence",{year:2023}):answer([`${s.id}-E2023-revenue`])));
 assert.equal(out.scenarioId,s.id);assert.equal(out.asOf,s.reports[2023].publishedAt);
 }
});
await test("混合公司问题与任务对象错配被拒绝", async () => {
 await assert.rejects(()=>runResearch({question:"小米和比亚迪谁更好"},config),/一家/);
 await assert.rejects(()=>runResearch({question:SCENARIOS[1].question,scenarioId:"byd"},config),/不一致/);
});
writeFileSync(
  new URL("../work/unit-test-results.json", import.meta.url),
  JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2),
);
console.log(`${results.length} tests passed`);
