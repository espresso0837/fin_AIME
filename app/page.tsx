"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  PanelLeftOpen,
  BookOpen,
  Layers3,
  Inbox,
  Activity,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  Pause,
  Play,
  ExternalLink,
  FileText,
  SlidersHorizontal,
  Download,
  Clock3,
  CheckCheck,
  AlertCircle,
  Bookmark,
  Pencil,
  MessageSquare,
  Trash2,
  Leaf,
  Loader2,
  Database,
  Info,
} from "lucide-react";
import {
  DEFAULT_QUESTION,
  DEFAULT_HYPOTHESES,

} from "@/lib/research-data";
import { SCENARIOS, ALL_EVIDENCE as EVIDENCE, ALL_REPORTS, scenarioById, resolveScenario, compareScenario } from "@/lib/research-scenarios";
type H = {
  id: string;
  text: string;
  rationale: string;
  metricIds: string[];
  status: string;
  conclusion: string;
  evidenceIds: string[];
  nextStep: string;
  previous?: string;
  changeReason?: string;
};
type S = {
  scenarioId?: string;
  asOf?: string;
  title: string;
  summary: string;
  hypotheses: H[];
  limitations: string[];
  trace: any[];
  year: number;
  generatedAt: string;
  model?: string;
  usage?: number;
  mode?: string;
};
type T = {
  id: string;
  question: string;
  title: string;
  status: "active" | "paused";
  current: S;
  pending?: S;
  history: any[];
  feedback: any[];
  createdAt: string;
  lastChecked?: string;
  example?: boolean;
};
const STORE = "aime.research.v1";
const statuses: any = {
  supported: "证据支持",
  weakened: "支持减弱",
  mixed: "需要修正",
  uncertain: "待验证",
};
const baseline: S = {
  scenarioId: "catl",
  asOf: "2024-03-21",
  title: "宁德时代：储能增长的下一段",
  summary:
    "2023 年储能收入与销量同步增长，盈利能力改善。海外业务值得继续研究，但现有披露尚不能量化海外储能的贡献。",
  year: 2023,
  generatedAt: "2024-03-21T12:00:00+08:00",
  mode: "verified_example",
  limitations: [
    "仅使用 2023 年年报，不能证明未来增长持续。",
    "分产品与分地区的收入不能组合推算海外储能收入。",
  ],
  trace: [],
  hypotheses: DEFAULT_HYPOTHESES.map((h, i) => ({
    ...h,
    status: i === 2 ? "uncertain" : "supported",
    conclusion: [
      "2023 年储能收入 599.01 亿元，同比增长 33.17%；销量 69 GWh。收入与销量同向增长，为当期需求提供支持。",
      "2023 年储能毛利率 23.79%，支持当期盈利质量，仍需验证跨期持续性。",
      "全公司境外收入 1,309.92 亿元，但缺少海外储能交叉收入，暂不能验证该业务的独立贡献。",
    ][i],
    evidenceIds: [
      ["E2023-revenue", "E2023-volume"],
      ["E2023-margin"],
      ["E2023-overseas", "E2023-cross"],
    ][i],
    nextStep: [
      "下一期收入与销量是否继续同向增长？",
      "盈利改善能否跨期持续？",
      "是否新增海外储能的单独披露？",
    ][i],
  })),
};
const now = () => new Date().toISOString();
function initial(): T {
  return {
    id: "catl-example",
    question: DEFAULT_QUESTION,
    title: baseline.title,
    status: "active",
    current: baseline,
    history: [
      { type: "created", at: now(), note: "载入原文核对的 2023 年示例基线。" },
    ],
    feedback: [],
    createdAt: now(),
    example: true,
  };
}
function date(x?: string) {
  return x
    ? new Date(x).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Shanghai",
      })
    : "尚未检查";
}
function val(x: number | null, u = "") {
  return x === null
    ? "暂无数据"
    : x.toLocaleString("en-US", {
        maximumFractionDigits: u === "GWh" ? 0 : 2,
        minimumFractionDigits: u === "GWh" ? 0 : 2,
      });
}
function Mark() {
  return (
    <svg width="31" height="31" viewBox="0 0 32 32" fill="none">
      <path
        d="M8 25C8 17 10 6 20 6c7 0 6 10-1 10H8m10 0c5 0 6 4 6 9M18 16l-5 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export default function App() {
  const [tasks, setTasks] = useState<T[]>([]),
    [ready, setReady] = useState(false),
    [view, setView] = useState("home"),
    [selected, setSelected] = useState("catl-example"),
    [tab, setTab] = useState("overview"),
    [question, setQuestion] = useState(""),
    [draft, setDraft] = useState<S | null>(null),
    [chosen, setChosen] = useState<string[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [evidenceId, setEvidenceId] = useState<string | null>(null),
    [modal, setModal] = useState<any>(null),
    [note, setNote] = useState(""),
    [feedbackType, setFeedbackType] = useState("weak"),
    [editTexts, setEditTexts] = useState<string[]>([]),
    [editMetrics, setEditMetrics] = useState<string[][]>([]),
    [filter, setFilter] = useState("active"),
    [find, setFind] = useState(""),
    [nav, setNav] = useState(false),
    [health, setHealth] = useState<any>(null),
    [sources, setSources] = useState<any>(null),
    [accepted, setAccepted] = useState<string[]>([]),
    [storageError, setStorageError] = useState("");
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, selected]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("home");
        setDraft(null);
        setTimeout(
          () => document.getElementById("research-question")?.focus(),
          0,
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const latestTasks = useRef(tasks);
  useEffect(() => {
    latestTasks.current = tasks;
  }, [tasks]);
  const task = tasks.find((t) => t.id === selected),
    ev = EVIDENCE.find((e) => e.id === evidenceId),
    inbox = tasks.filter((t) => t.pending);
  const activeScenario = scenarioById(task?.current.scenarioId);
  const names = activeScenario.metrics;
  const taskEvidence = activeScenario.evidence;
  const inputScenario = resolveScenario(question);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const p = JSON.parse(raw);
        if (
          !Array.isArray(p) ||
          p.some(
            (t: any) =>
              !t.id ||
              !Array.isArray(t.current?.hypotheses) ||
              !Array.isArray(t.history) ||
              !Array.isArray(t.feedback),
          )
        )
          throw Error();
        setTasks(p);
      } else setTasks([initial()]);
    } catch {
      setTasks([initial()]);
      setStorageError("本地存档无法读取。原存档未覆盖，请导出备份后重置。");
    }
    setReady(true);
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ modelConfigured: false }));
  }, []);
  useEffect(() => {
    if (ready && !storageError)
      try {
        localStorage.setItem(STORE, JSON.stringify(tasks));
      } catch {
        setStorageError("浏览器存储不足，请导出研究备份。");
      }
  }, [tasks, ready, storageError]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function update(id: string, fn: (t: T) => T) {
    setTasks((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  }
  function home() {
    setView("home");
    setDraft(null);
    setError("");
    setNav(false);
  }
  function open(t: T, v = "detail") {
    setSelected(t.id);
    setView(v);
    setTab("overview");
    setError("");
    setNav(false);
    setAccepted(t.pending?.hypotheses.map((h) => h.id) || []);
  }
  async function generate() {
    if (busy) return;
    setError("");
    setBusy("create");
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", question }),
      });
      const j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      setDraft(j);
      setChosen(j.hypotheses.map((h: H) => h.id));
      setView("draft");
    } catch (e: any) {
      setError(e.message || "连接失败，请重试。");
    } finally {
      setBusy("");
    }
  }
  function saveDraft() {
    if (!draft || !chosen.length) return;
    const s = {
      ...draft,
      hypotheses: draft.hypotheses.filter((h) => chosen.includes(h.id)),
    };
    const t: T = {
      id: crypto.randomUUID(),
      title: s.title,
      question,
      status: "active",
      current: s,
      feedback: [],
      history: [
        {
          type: "created",
          at: now(),
          snapshot: s,
          note: "真实模型读取证据后创建研究。",
        },
      ],
      createdAt: now(),
    };
    setTasks((ts) => [t, ...ts]);
    open(t);
    setDraft(null);
    setToast("研究已保存，可以随时继续。");
  }
  async function check(t: T) {
    if (busy || t.status === "paused") return;
    setBusy(t.id);
    setError("");
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          question: t.question,
          scenarioId: t.current.scenarioId || "catl",
          hypotheses: t.current.hypotheses,
          feedback: t.feedback,
          previousSummary: t.current.summary,
        }),
      });
      const j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      const latest = latestTasks.current.find((x) => x.id === t.id);
      if (
        !latest ||
        latest.current !== t.current ||
        latest.feedback !== t.feedback ||
        latest.status !== t.status
      ) {
        if (latest)
          update(t.id, (o) => ({
            ...o,
            history: [
              ...o.history,
              {
                type: "checked",
                at: now(),
                note: "检查期间研究条件或状态改变，本次分析作废，未覆盖已有判断。",
              },
            ],
          }));
        setToast("研究条件已改变，本次结果作废，请重新检查。");
        return;
      }
      const at = now();
      if (t.current.year === 2024) {
        update(t.id, (o) => ({
          ...o,
          lastChecked: at,
          history: [
            ...o.history,
            {
              type: "checked",
              at,
              note: "同一历史资料集，无新增披露；已按最新反馈重新分析。",
              snapshot: j,
            },
          ],
          pending: j,
        }));
        setToast("资料集无新增披露，已按当前条件重新分析。");
      } else
        update(t.id, (o) => ({
          ...o,
          pending: j,
          lastChecked: at,
          history: [
            ...o.history,
            {
              type: "review",
              at,
              note: "引入 2024 年年报，形成待审阅更新。",
              snapshot: j,
            },
          ],
        }));
      setAccepted(j.hypotheses.map((h: H) => h.id));
      setSelected(t.id);
      setView("update");
    } catch (e: any) {
      update(t.id, (o) => ({
        ...o,
        lastChecked: now(),
        history: [
          ...o.history,
          {
            type: "failed",
            at: now(),
            note: e.message || "接口连接失败，原研究保留。",
          },
        ],
      }));
      setError(e.message || "连接失败，原研究保留。");
    } finally {
      setBusy("");
    }
  }
  function accept() {
    if (!task?.pending) return;
    const p = task.pending,
      kept = task.current.hypotheses.filter((h) => !accepted.includes(h.id));
    update(task.id, (t) => ({
      ...t,
      current: {
        ...p,
        hypotheses: t.current.hypotheses.map((h) =>
          accepted.includes(h.id)
            ? p.hypotheses.find((n) => n.id === h.id) || h
            : h,
        ),
        summary: kept.length
          ? `本次采用 ${accepted.length} 项更新，保留 ${kept.length} 项原判断；保留项需继续验证，详见各假设。`
          : p.summary,
      },
      pending: undefined,
      history: [
        ...t.history,
        {
          type: "accepted",
          at: now(),
          snapshot: t.current,
          note: `采用 ${accepted.length} 项更新，保留 ${kept.length} 项原判断。附录为更新前版本。`,
        },
      ],
      feedback: [
        ...t.feedback,
        ...kept.map((h) => ({
          hypothesisId: h.id,
          type: "retain",
          note: "用户审阅后保留原判断，下轮需再次验证。",
          at: now(),
        })),
      ],
    }));
    setView("detail");
    setTab("overview");
    setToast("审阅已保存，旧判断保留在研究历史。");
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { product: "AIME", exportedAt: now(), tasks },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "aime-research.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("研究与执行记录已导出。");
  }
  function feedback(h: H) {
    if (busy) {
      setToast("本次检查完成后，可以补充反馈。");
      return;
    }
    setNote("");
    setFeedbackType("weak");
    setModal({ type: "feedback", id: task?.id, hid: h.id });
  }
  function saveFeedback() {
    update(modal.id, (t) => ({
      ...t,
      pending: undefined,
      feedback: [
        ...t.feedback,
        {
          hypothesisId: modal.hid,
          type: feedbackType,
          note:
            note.trim() ||
            (
              {
                weak: "证据与假设关联较弱",
                agree: "认可依据",
                focus: "下次重点验证",
              } as any
            )[feedbackType],
          at: now(),
        },
      ],
      history: [
        ...t.history,
        {
          type: "feedback",
          at: now(),
          note: `对 ${modal.hid} 补充反馈：${note || feedbackType}。未审阅更新失效，需重新检查。`,
        },
      ],
    }));
    setModal(null);
    setToast("反馈已保存，下一次检查会使用。");
  }
  function edit() {
    if (!task) return;
    if (busy) {
      setToast("本次检查完成后，可以调整研究条件。");
      return;
    }
    setEditTexts(task.current.hypotheses.map((h) => h.text));
    setEditMetrics(task.current.hypotheses.map((h) => [...h.metricIds]));
    setModal({ type: "edit", id: task.id });
  }
  function saveEdit() {
    if (editTexts.some((x) => !x.trim()) || editMetrics.some((x) => !x.length))
      return;
    update(modal.id, (t) => ({
      ...t,
      pending: undefined,
      current: {
        ...t.current,
        summary: "研究条件已修改，请重新检查证据。",
        hypotheses: t.current.hypotheses.map((h, i) => ({
          ...h,
          text: editTexts[i].trim(),
          metricIds: editMetrics[i],
          status: "uncertain",
          conclusion: "假设已修改，等待重新检查。",
        })),
      },
      history: [
        ...t.history,
        {
          type: "edited",
          at: now(),
          snapshot: t.current,
          note: "修改研究假设及跟踪指标。原判断归档，待审阅更新失效。",
        },
      ],
    }));
    setModal(null);
    setToast("研究条件已更新。");
  }
  async function verifySources() {
    setBusy("source");
    try {
      const r = await fetch("/api/source-check", { method: "POST" });
      const j: any = await r.json();
      if (!r.ok) throw Error();
      setSources(j);
    } catch {
      setSources({ error: "原文连接失败，已保留核对过的历史摘录。" });
    } finally {
      setBusy("");
    }
  }
  function refs(ids: string[]) {
    return (
      <div className="refs">
        {ids.map((id) => {
          const e = EVIDENCE.find((x) => x.id === id);
          return e ? (
            <button key={id} onClick={() => setEvidenceId(id)}>
              <FileText size={11} />
              {e.year} · {e.label}
              <ArrowUpRight size={10} />
            </button>
          ) : null;
        })}
      </div>
    );
  }
  function list() {
    const ts = tasks.filter(
      (t) =>
        (filter === "all" || t.status === filter) &&
        (!find || t.title.includes(find) || t.question.includes(find)),
    );
    return (
      <>
        <div className="list-toolbar">
          <div className="filters">
            {[
              ["active", "进行中"],
              ["all", "全部研究"],
              ["paused", "已暂停"],
            ].map(([id, l]) => (
              <button
                key={id}
                className={filter === id ? "on" : ""}
                onClick={() => setFilter(id)}
              >
                {l}
                {id === "active" && (
                  <span>
                    {tasks.filter((t) => t.status === "active").length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={13} />
            <input
              aria-label="搜索研究"
              placeholder="搜索研究"
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
          </label>
        </div>
        {ts.length ? (
          ts.map((t) => (
            <button className="task-row" key={t.id} onClick={() => open(t)}>
              <span className="task-icon">
                <Leaf size={21} strokeWidth={1.4} />
              </span>
              <span className="task-info">
                <strong>{t.title}</strong>
                <small>
                  {t.current.hypotheses.length} 个研究假设<span>·</span>
                  {t.example
                    ? `示例研究 · ${t.current.year} 年披露`
                    : `${t.current.year} 年披露`}
                  <span>·</span>
                  {t.status === "paused" ? "已暂停" : "手动检查"}
                </small>
              </span>
              {t.pending ? (
                <span className="pill amber">有更新待审阅</span>
              ) : (
                <span className="task-meta">
                  {t.lastChecked
                    ? date(t.lastChecked) + " 检查"
                    : "等待下一期验证"}
                </span>
              )}
              <ChevronRight size={15} />
            </button>
          ))
        ) : (
          <div className="empty">
            <BookOpen size={26} />
            <h3>这里还没有研究任务</h3>
            <p>保存一个值得持续验证的判断。</p>
          </div>
        )}
      </>
    );
  }
  return (
    <div className="app">
      {nav && <div className="nav-mask" onClick={() => setNav(false)} />}
      <aside className={"sidebar " + (nav ? "open" : "")}>
        <div className="brand">
          <Mark />
          <span>
            aime<span>.</span>
          </span>
        </div>
        <div className="workspace">
          <span className="avatar">W</span>
          <div>
            <strong>我的研究空间</strong>
            <small>Personal workspace</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <button
          className="new"
          onClick={() => {
            home();
            setQuestion("");
          }}
        >
          <Plus size={17} />
          建立研究<span>⌘ K</span>
        </button>
        <nav>
          {[
            ["home", "工作台", Layers3],
            ["tasks", "我的研究", BookOpen],
            ["inbox", "更新收件箱", Inbox],
          ].map(([id, label, I]: any) => (
            <button
              key={id}
              className={
                view === id ||
                (id === "inbox" && view === "update") ||
                (id === "home" && view === "draft")
                  ? "active"
                  : ""
              }
              onClick={() => {
                id === "home" ? home() : setView(id);
                setNav(false);
              }}
            >
              <I size={17} />
              {label}
              {id === "tasks" && <span>{tasks.length}</span>}
              {id === "inbox" && inbox.length > 0 && (
                <span className="badge">{inbox.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="side-label">
          研究笔记<span>{tasks.length.toString().padStart(2, "0")}</span>
        </div>
        <div className="side-tasks">
          {tasks.map((t) => (
            <button
              key={t.id}
              className={
                selected === t.id && ["detail", "update"].includes(view)
                  ? "active"
                  : ""
              }
              onClick={() => open(t)}
            >
              <i className={"dot " + (t.status === "paused" ? "paused" : "")} />
              <span>{t.title}</span>
              {t.pending && <i className="unread" />}
            </button>
          ))}
        </div>
        <div className="side-bottom">
          <button
            onClick={() => {
              setView("system");
              setNav(false);
            }}
          >
            <Activity size={16} />
            资料与运行
            <ArrowUpRight size={12} />
          </button>
          <button onClick={() => setModal({ type: "guide" })}>
            <Info size={16} />
            使用指南
          </button>
          <div className="profile">
            <span className="avatar">W</span>
            <div>
              <strong>个人研究者</strong>
              <small>保留自己的判断</small>
            </div>
            <i className="dot" />
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <div>
            <button
              className="icon mobile"
              aria-label="打开侧栏"
              onClick={() => setNav(true)}
            >
              <PanelLeftOpen size={18} />
            </button>
            <span className="desktop">个人空间</span>
            <ChevronRight size={12} />
            <span>
              {
                (
                  {
                    home: "工作台",
                    tasks: "我的研究",
                    draft: "建立研究",
                    detail: "研究笔记",
                    update: "审阅更新",
                    inbox: "更新收件箱",
                    system: "资料与运行",
                  } as any
                )[view]
              }
            </span>
          </div>
          <div>
            <span className="save">
              <i className="dot" />
              {storageError ? "存档需处理" : "此浏览器保存"}
            </span>
            <button
              className="icon"
              aria-label="导出研究记录"
              title="导出研究记录"
              onClick={backup}
            >
              <Download size={16} />
            </button>
          </div>
        </header>
        <main className={view === "home" ? "home-content" : "content"}>
          {storageError && (
            <div className="error">
              <AlertCircle size={16} />
              <span>{storageError}</span>
              <button onClick={backup}>导出备份</button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button aria-label="关闭错误" onClick={() => setError("")}>
                <X size={14} />
              </button>
            </div>
          )}
          {view === "home" && (
            <>
              <div className="intro">
                <div className="eyebrow">
                  <span className="star">✳</span>A LITTLE CLARITY, EVERY DAY
                </div>
                <h1>
                  每个判断，
                  <br />
                  都值得继续追问<span>。</span>
                </h1>
                <p>把值得跟踪的问题留下，让新的证据找到旧的判断。</p>
              </div>
              <div className="composer">
                <textarea
                  id="research-question"
                  aria-label="研究问题"
                  placeholder="你想持续验证什么判断？"
                  value={question}
                  maxLength={600}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                      generate();
                  }}
                />
                <div>
                  <span>
                    <i className="dot" />
                    {inputScenario ? `${inputScenario.company} · 已匹配披露资料` : "写下公司与判断，或选择下方场景"}
                  </span>
                  <button
                    aria-label="开始研究"
                    disabled={!!busy || question.trim().length < 8}
                    onClick={generate}
                  >
                    {busy === "create" ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <ArrowUp size={21} />
                    )}
                  </button>
                </div>
                {busy === "create" && (
                  <p className="running">
                    <Loader2 size={12} className="spin" />
                    正在读取披露证据并形成研究假设，通常需要数十秒…
                  </p>
                )}
              </div>
              <div className="scenario-grid">
                {SCENARIOS.map((s,i) => <button key={s.id} className={"scenario-card " + (inputScenario?.id === s.id ? "selected" : "")} onClick={() => {setQuestion(s.question);setError("");document.getElementById("research-question")?.focus();}}>
                  <div><span className="scenario-number">0{i+1}</span><ArrowUpRight size={14}/></div>
                  <strong>{s.company}</strong><span>{s.title}</span><small>{s.focus}</small>
                </button>)}
              </div>
              <div className="scope">三个场景，同一套研究流程<span>·</span>2023 → 2024 真实披露回放</div>
              <section className="recent">
                <div className="section-head">
                  <h2>继续你的研究</h2>
                  <span>判断有来处，研究有下文</span>
                </div>
                {list()}
              </section>
              <div className="quiet">
                <i />
                <p>研究的价值，在于知道什么变了，以及什么还没有答案。</p>
                <i />
              </div>
            </>
          )}
          {view === "tasks" && (
            <>
              <div className="heading">
                <div className="eyebrow">YOUR RESEARCH</div>
                <h1>我的研究</h1>
                <p>保存依据，也保留每一次判断的变化。</p>
              </div>
              {list()}
              <button className="text-button mt" onClick={home}>
                <Plus size={14} />
                建立新的研究
              </button>
            </>
          )}
          {view === "draft" && draft && (
            <>
              <button className="back" onClick={home}>
                <ArrowLeft size={13} />
                返回研究问题
              </button>
              <div className="heading">
                <div className="eyebrow">A QUESTION, READY TO BE VERIFIED</div>
                <h1>先把判断，变成可验证的假设</h1>
                <p>{question}</p>
              </div>
              <div className="notice">
                <CheckCheck size={16} />
                <span>
                  已通过真实模型读取 2023
                  年证据。编辑或取消假设，决定接下来关注什么。
                </span>
              </div>
              <div className="draft-summary">
                <span className="label">初步研究 · {scenarioById(draft.scenarioId).company} · 截至 {draft.asOf || "2024-03-21"}</span>
                <p>{draft.summary}</p>
              </div>
              {draft.hypotheses.map((h, i) => (
                <article
                  className={
                    "draft-card " + (!chosen.includes(h.id) ? "dim" : "")
                  }
                  key={h.id}
                >
                  <div className="draft-check">
                    <input
                      type="checkbox"
                      aria-label={"跟踪假设 " + (i + 1)}
                      checked={chosen.includes(h.id)}
                      onChange={() =>
                        setChosen((s) =>
                          s.includes(h.id)
                            ? s.filter((x) => x !== h.id)
                            : [...s, h.id],
                        )
                      }
                    />
                    <span>假设 {String(i + 1).padStart(2, "0")}</span>
                    <span className={"pill " + h.status}>
                      {statuses[h.status]}
                    </span>
                  </div>
                  <textarea
                    aria-label={"编辑假设 " + (i + 1)}
                    value={h.text}
                    maxLength={180}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              hypotheses: d.hypotheses.map((x) =>
                                x.id === h.id
                                  ? {
                                      ...x,
                                      text: e.target.value,
                                      status: "uncertain",
                                      conclusion:
                                        "假设已编辑，保存后请重新检查。",
                                    }
                                  : x,
                              ),
                            }
                          : d,
                      )
                    }
                  />
                  <p>{h.conclusion}</p>
                  {refs(h.evidenceIds)}
                  <div className="why">
                    <Bookmark size={12} />
                    {h.rationale}
                  </div>
                </article>
              ))}
              <div className="action-bar">
                <span>{chosen.length} 个假设保存在此浏览器</span>
                <button
                  className="button primary"
                  disabled={
                    !chosen.length ||
                    draft.hypotheses.some(
                      (h) => chosen.includes(h.id) && !h.text.trim(),
                    )
                  }
                  onClick={saveDraft}
                >
                  保存研究任务
                  <ArrowRight size={14} />
                </button>
              </div>
              <Trace snapshot={draft} />
            </>
          )}
          {view === "detail" && task && (
            <>
              <div className="preheader">
                <button className="back" onClick={() => setView("tasks")}>
                  <ArrowLeft size={13} />
                  我的研究
                </button>
                <div>
                  <button
                    className="icon"
                    aria-label="调整研究条件"
                    title="调整研究条件"
                    onClick={edit}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon"
                    aria-label="导出此研究"
                    onClick={backup}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    className="icon"
                    aria-label="删除研究"
                    onClick={() => setModal({ type: "delete", id: task.id })}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="heading">
                <div className="eyebrow">
                  <Leaf size={14} />
                  {activeScenario.company}<span className="ticker">{activeScenario.ticker}</span>
                </div>
                <h1>{task.title}</h1>
                <p>{task.question}</p>
                <div className="task-status">
                  <span
                    className={
                      "pill " + (task.status === "active" ? "green" : "neutral")
                    }
                  >
                    <i className="dot" />
                    {task.status === "active" ? "研究进行中" : "已暂停"}
                  </span>
                  <span>最近检查：{date(task.lastChecked)}</span>
                  <span>手动触发</span>
                </div>
              </div>
              <div className="replay">
                <Clock3 size={15} />
                <div>
                  <strong>历史披露回放</strong>
                  <span>
                    当前基线 {task.current.year} 年报 · 资料日期{" "}
                    {task.current.asOf || activeScenario.reports[task.current.year].publishedAt}
                  </span>
                </div>
                <button onClick={() => setModal({ type: "guide" })}>
                  了解回放
                  <ArrowUpRight size={11} />
                </button>
              </div>
              {task.pending && (
                <button
                  className="pending"
                  onClick={() => open(task, "update")}
                >
                  <Inbox size={21} />
                  <div>
                    <strong>新的判断已准备好，等你审阅</strong>
                    <small>原判断尚未覆盖，选择需要采用的变化。</small>
                  </div>
                  <ArrowRight size={17} />
                </button>
              )}
              <div className="tabs">
                <div>
                  {[
                    ["overview", "研究概览"],
                    ["evidence", "证据资料"],
                    ["history", "研究历史"],
                  ].map(([id, l]) => (
                    <button
                      className={tab === id ? "on" : ""}
                      key={id}
                      onClick={() => setTab(id)}
                    >
                      {l}
                      {id === "history" && <small>{task.history.length}</small>}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    update(task.id, (t) => ({
                      ...t,
                      status: t.status === "active" ? "paused" : "active",
                      history: [
                        ...t.history,
                        {
                          type: "state",
                          at: now(),
                          note:
                            t.status === "active"
                              ? "暂停研究，停止执行检查。"
                              : "恢复研究，可以手动检查。",
                        },
                      ],
                    }))
                  }
                >
                  {task.status === "active" ? (
                    <Pause size={11} />
                  ) : (
                    <Play size={11} />
                  )}{" "}
                  {task.status === "active" ? "暂停" : "恢复"}
                </button>
              </div>
              {tab === "overview" && (
                <>
                  <section className="conclusion">
                    <div>
                      <span className="label">当前研究判断</span>
                      <span>
                        {task.current.mode === "verified_example"
                          ? "原文核对示例"
                          : "真实模型分析 · 研究记录"}
                      </span>
                    </div>
                    <h2>{task.current.summary}</h2>
                    <footer>
                      <span>○ 结论基于已披露事实，仍需持续验证</span>
                      <span>
                        v
                        {task.history
                          .filter((h) =>
                            ["created", "accepted", "edited"].includes(h.type),
                          )
                          .length.toString()
                          .padStart(2, "0")}
                      </span>
                    </footer>
                  </section>
                  <div className="metrics">
                    {taskEvidence.filter(
                      (e) =>
                        e.year === task.current.year &&
                        Object.keys(names).slice(0, 3).includes(e.metric),
                    ).map((e) => (
                      <button key={e.id} onClick={() => setEvidenceId(e.id)}>
                        <span>
                          {e.label}
                          <ArrowUpRight size={11} />
                        </span>
                        <strong>
                          {val(e.value, e.unit)}
                          <small>{e.unit}</small>
                        </strong>
                        <span>{e.year} 年 · {e.scope}</span>
                      </button>
                    ))}
                  </div>
                  <div className="section-head">
                    <h2>
                      正在验证的假设{" "}
                      <small>
                        {task.current.hypotheses.length
                          .toString()
                          .padStart(2, "0")}
                      </small>
                    </h2>
                    <button className="text-button" onClick={edit}>
                      <SlidersHorizontal size={13} />
                      调整研究
                    </button>
                  </div>
                  {task.current.hypotheses.map((h, i) => (
                    <article className="hypothesis" key={h.id}>
                      <span className="number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="hypothesis-title">
                          <h3>{h.text}</h3>
                          <span className={"pill " + h.status}>
                            {statuses[h.status]}
                          </span>
                        </div>
                        <p>{h.conclusion}</p>
                        {refs(h.evidenceIds)}
                        <div className="next">
                          <span>下一步</span>
                          {h.nextStep}
                        </div>
                        {task.feedback
                          .filter((f) => f.hypothesisId === h.id)
                          .slice(-1)
                          .map((f, i) => (
                            <div className="saved-feedback" key={i}>
                              <MessageSquare size={11} />
                              你的反馈：{f.note}
                            </div>
                          ))}
                        <button
                          className="feedback"
                          onClick={() => feedback(h)}
                        >
                          <MessageSquare size={12} />
                          补充你的判断
                        </button>
                      </div>
                    </article>
                  ))}
                  <div className="check-panel">
                    <div>
                      <strong>下一份证据，会改变什么？</strong>
                      <p>
                        {task.current.year === 2023
                          ? "引入 2024 年真实披露，检查这些假设是否仍然成立。"
                          : "重新分析当前资料集；本演示未接入后续年份披露。"}
                      </p>
                    </div>
                    <button
                      className="button primary"
                      disabled={!!busy || task.status === "paused"}
                      onClick={() => check(task)}
                    >
                      {busy === task.id ? (
                        <Loader2 className="spin" size={14} />
                      ) : (
                        <RefreshCw size={14} />
                      )}{" "}
                      {busy === task.id
                        ? "正在检查证据…"
                        : task.current.year === 2023
                          ? "检查新证据"
                          : "重新检查判断"}
                    </button>
                  </div>
                  <div className="limitations">
                    <Info size={13} />
                    <p>{task.current.limitations.join(" ")}</p>
                  </div>
                </>
              )}
              {tab === "evidence" && (
                <>
                  <div className="subheading">
                    <h2>每条判断，都能找到来处</h2>
                    <p>
                      原文核对的公司年报摘录。点击查看原值、单位、页码和口径。
                    </p>
                  </div>
                  <div className="evidence-table">
                    <div>
                      <span>证据 / 指标</span>
                      <span>披露值</span>
                      <span>期间</span>
                      <span />
                    </div>
                    {taskEvidence.filter((e) => e.year <= task.current.year).map(
                      (e) => (
                        <button key={e.id} onClick={() => setEvidenceId(e.id)}>
                          <span>
                            <FileText size={15} />
                            <span>
                              <strong>{e.label}</strong>
                              <small>{e.scope}</small>
                            </span>
                          </span>
                          <strong>
                            {val(e.value, e.unit)} {e.value !== null && e.unit}
                          </strong>
                          <span>{e.year}</span>
                          <ArrowUpRight size={13} />
                        </button>
                      ),
                    )}
                  </div>
                  <div className="notice mt">
                    <Info size={14} />
                    <span>
                      {activeScenario.boundary}
                    </span>
                  </div>
                </>
              )}
              {tab === "history" && (
                <>
                  <div className="subheading">
                    <h2>判断的来路</h2>
                    <p>每次检查、调整和反馈都有记录。</p>
                  </div>
                  <div className="timeline">
                    {[...task.history].reverse().map((h, i) => (
                      <article key={i}>
                        <i
                          className={
                            "timeline-dot " +
                            (h.type === "failed" ? "failed" : "")
                          }
                        />
                        <div>
                          <div>
                            <strong>
                              {(
                                {
                                  created: "建立研究",
                                  review: "新判断待审阅",
                                  accepted: "保存判断更新",
                                  feedback: "补充研究反馈",
                                  edited: "调整研究条件",
                                  checked: "再次检查",
                                  failed: "检查未完成",
                                  state: "修改任务状态",
                                } as any
                              )[h.type] || "研究记录"}
                            </strong>
                            <time>{date(h.at)}</time>
                          </div>
                          <p>{h.note}</p>
                          {h.snapshot && (
                            <details>
                              <summary>
                                查看当时的判断
                                <ChevronDown size={12} />
                              </summary>
                              <p>{h.snapshot.summary}</p>
                              {h.snapshot.hypotheses?.map((x: H) => (
                                <div className="history-hypothesis" key={x.id}>
                                  <strong>{x.text}</strong>
                                  <p>{x.conclusion}</p>
                                </div>
                              ))}
                            </details>
                          )}
                          {h.snapshot?.trace?.length > 0 && (
                            <Trace snapshot={h.snapshot} />
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {view === "inbox" && (
            <>
              <div className="heading">
                <div className="eyebrow">MAKE ROOM FOR NEW EVIDENCE</div>
                <h1>更新收件箱</h1>
                <p>新证据带来的变化，由你决定是否写入研究。</p>
              </div>
              {inbox.length ? (
                inbox.map((t) => (
                  <button
                    className="inbox-row"
                    key={t.id}
                    onClick={() => open(t, "update")}
                  >
                    <span className="task-icon">
                      <Inbox size={22} />
                    </span>
                    <div>
                      <span className="label">2024 年披露 · 待审阅</span>
                      <h3>{t.title}</h3>
                      <p>{t.pending?.summary}</p>
                    </div>
                    <ArrowRight size={17} />
                  </button>
                ))
              ) : (
                <div className="empty large">
                  <Inbox size={34} strokeWidth={1.2} />
                  <h2>每一项变化，都等你看过</h2>
                  <p>在研究任务里检查新证据，相关变化会出现在这里。</p>
                  <button
                    className="button secondary"
                    onClick={() => setView("tasks")}
                  >
                    查看研究任务
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
          {view === "update" && task?.pending && (
            <>
              <button className="back" onClick={() => setView("detail")}>
                <ArrowLeft size={13} />
                返回研究笔记
              </button>
              <div className="heading update-heading">
                <div className="eyebrow">
                  <i className="unread" />A CHANGE WORTH YOUR ATTENTION
                </div>
                <h1>
                  新的证据，
                  <br />
                  让原来的判断更具体。
                </h1>
                <p>
                  {task.title}
                  <span className="middot">·</span>2023 → 2024 年披露比较
                </p>
              </div>
              <div className="update-summary">
                <span className="label">
                  <RefreshCw size={12} />
                  本次变化
                </span>
                <p>{task.pending.summary}</p>
                <small>原判断尚未覆盖 · 选择需要采用的更新</small>
              </div>
              <div className="comparison">
                <div>
                  <span>核心指标</span>
                  <span>2023 年</span>
                  <span>2024 年</span>
                  <span>变化</span>
                </div>
                {compareScenario(activeScenario).map((c: any) => (
                  <button
                    key={c.metric}
                    onClick={() => setEvidenceId(c.evidenceIds[c.evidenceIds.length-1])}
                  >
                    <span>
                      {names[c.metric]}
                      {c.metric === "overseas" && <small>全公司口径</small>}
                    </span>
                    <span>
                      {val(c.previous, c.unit)}
                      <small>{c.unit}</small>
                    </span>
                    <span>
                      {val(c.current, c.unit)}
                      <small>{c.unit}</small>
                    </span>
                    <span className={c.status === "missing" ? "" : c.delta >= 0 ? "positive" : "negative"}>
                      {c.status === "missing" ? "暂无可比值" : c.unit === "%"
                        ? `${c.delta > 0 ? "+" : ""}${c.delta.toFixed(2)} pp`
                        : c.percentage === null ? "基期为零" : `${c.percentage > 0 ? "+" : ""}${c.percentage.toFixed(2)}%`}
                      <ArrowUpRight size={11} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="comparison-note">
                {activeScenario.boundary} 百分比指标比较使用百分点；缺少基期时不计算增速。
              </p>
              <div className="section-head mt">
                <h2>这些假设受到了影响</h2>
                <span>逐条审阅</span>
              </div>
              {task.pending.hypotheses.map((h, i) => {
                const old = task.current.hypotheses.find((x) => x.id === h.id),
                  on = accepted.includes(h.id);
                return (
                  <article
                    className={"update-card " + (!on ? "retained" : "")}
                    key={h.id}
                  >
                    <div className="update-card-title">
                      <span className="number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{h.text}</h3>
                      <span className={"pill " + h.status}>
                        {statuses[h.status]}
                      </span>
                    </div>
                    <div className="before-after">
                      <div>
                        <span className="label">原来的判断</span>
                        <p>{old?.conclusion}</p>
                      </div>
                      <div>
                        <span className="label">更新后的判断</span>
                        <p>{h.conclusion}</p>
                      </div>
                    </div>
                    <div className="reason">
                      <span>为什么变化</span>
                      <p>{h.changeReason || h.nextStep}</p>
                    </div>
                    {refs(h.evidenceIds)}
                    <div className="update-card-bottom">
                      <button onClick={() => feedback(h)}>
                        <MessageSquare size={12} />
                        证据关联弱？补充理由
                      </button>
                      <button
                        className={"adopt " + (on ? "on" : "")}
                        onClick={() =>
                          setAccepted((s) =>
                            s.includes(h.id)
                              ? s.filter((x) => x !== h.id)
                              : [...s, h.id],
                          )
                        }
                      >
                        {on ? <Check size={12} /> : <Bookmark size={12} />}{" "}
                        {on ? "采用这项更新" : "保留原判断"}
                      </button>
                    </div>
                  </article>
                );
              })}
              <div className="action-bar sticky">
                <span>
                  采用 {accepted.length} 项更新 · 保留{" "}
                  {task.pending.hypotheses.length - accepted.length} 项原判断
                </span>
                <button className="button primary" onClick={accept}>
                  保存这次审阅
                  <Check size={14} />
                </button>
              </div>
              <Trace snapshot={task.pending} />
            </>
          )}
          {view === "update" && task && !task.pending && (
            <div className="empty large">
              <CheckCheck size={32} />
              <h2>这次审阅已处理</h2>
              <p>可以返回研究，查看历史或重新检查。</p>
              <button
                className="button secondary"
                onClick={() => setView("detail")}
              >
                返回研究笔记
              </button>
            </div>
          )}
          {view === "system" && (
            <>
              <div className="heading">
                <div className="eyebrow">SOURCES & EXECUTION</div>
                <h1>让过程也有据可查</h1>
                <p>使用真实模型与公司原始披露的历史研究案例。</p>
              </div>
              <div className="system-grid">
                {[
                  [
                    Activity,
                    "模型服务",
                    health?.modelConfigured ? "服务端已配置" : "尚未配置",
                    "DeepSeek 真实工具调用与分析。每次是否成功，以实际执行记录为准。",
                  ],
                  [
                    Database,
                    "数据范围",
                    "3 家公司 · 2023 / 2024",
                    "来自公司官网与交易所的年度披露摘录。金融 API 未接入，不含实时行情和新闻。",
                  ],
                  [
                    Clock3,
                    "执行方式",
                    "手动触发",
                    "没有后台定时监控。任务与反馈保存在此浏览器，可以导出备份。",
                  ],
                ].map(([I, h, p, t]: any) => (
                  <section key={h}>
                    <span className="system-icon">
                      <I size={21} />
                    </span>
                    <h3>{h}</h3>
                    <span className="pill neutral">{p}</span>
                    <p>{t}</p>
                  </section>
                ))}
              </div>
              <div className="section-head mt">
                <h2>案例原始资料</h2>
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={verifySources}
                >
                  {busy === "source" ? (
                    <Loader2 className="spin" size={12} />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  检查原文连接
                </button>
              </div>
              <div className="source-docs">
                {ALL_REPORTS.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noreferrer">
                    <FileText size={21} />
                    <div>
                      <strong>{r.title}</strong>
                      <small>公司 / 交易所 · 资料日期 {r.publishedAt}</small>
                    </div>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
              {sources && (
                <div className="source-results">
                  {sources.error ? (
                    <p>{sources.error}</p>
                  ) : (
                    <>
                      {sources.results.map((s: any) => (
                        <p key={s.url}>
                          {s.status === "reachable" ? (
                            <Check size={12} />
                          ) : (
                            <AlertCircle size={12} />
                          )}{" "}
                          {s.company} {s.year} 年披露：
                          {s.status === "reachable"
                            ? "原文连接可达"
                            : "连接失败，历史摘录保留"}
                          <span>{date(s.checkedAt)}</span>
                        </p>
                      ))}
                      <small>{sources.note}</small>
                    </>
                  )}
                </div>
              )}
              <div className="boundaries">
                <h3>必须保留的三条边界</h3>
                <p>
                  <span>01</span>研究对象、期间与口径分别校验，不会把一家公司的证据套到另一家。
                </p>
                <p>
                  <span>02</span>缺失数据保留为空，指标变化由程序计算，冲突和不可比情况单独说明。
                </p>
                <p>
                  <span>03</span>
                  历史回放不代表发现最新市场变化，研究结果不构成买卖建议。
                </p>
              </div>
              <div className="export">
                <div>
                  <strong>把研究带走</strong>
                  <p>导出任务、版本历史、实际调用记录和用户反馈。</p>
                </div>
                <button className="button secondary" onClick={backup}>
                  <Download size={13} />
                  导出研究记录
                </button>
              </div>
            </>
          )}
          {!ready && (
            <div className="loading">
              <Loader2 className="spin" size={22} />
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>aime · 研究留有依据</span>
          <span>历史披露研究工具，不构成投资建议</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
      {ev && (
        <>
          <div className="drawer-mask" onClick={() => setEvidenceId(null)} />
          <aside className="drawer">
            <div className="drawer-top">
              <span>
                <FileText size={15} />
                证据详情
              </span>
              <button
                className="icon"
                aria-label="关闭证据"
                onClick={() => setEvidenceId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-content">
              <div className="eyebrow">{ev.id}</div>
              <h2>{ev.label}</h2>
              <div className="evidence-value">
                {val(ev.value, ev.unit)}
                <small>{ev.value !== null ? ev.unit : ""}</small>
              </div>
              <span
                className={"pill " + (ev.value === null ? "amber" : "green")}
              >
                {ev.value === null ? "证据缺口" : "已核对披露事实"}
              </span>
              <dl>
                {[
                  ["报告期间", `${ev.year}-01-01 至 ${ev.year}-12-31`],
                  ["统计口径", ev.scope],
                  ["资料日期", ev.publishedAt],
                  [
                    "原始单位 / 原值",
                    ev.originalValue
                      ? ev.originalValue + " " + ev.originalUnit
                      : "所核对表格未单独披露",
                  ],
                  [
                    "原始位置",
                    `原文第 ${ev.page} 页 · PDF 第 ${ev.pdfPage} 页`,
                  ],
                  ["获取方式", "原始披露核对后结构化入库"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="evidence-note">
                <Info size={16} />
                <div>
                  <strong>阅读这条证据时</strong>
                  <p>{ev.note}</p>
                </div>
              </div>
              <a
                className="button primary full"
                href={ev.sourceUrl + "#page=" + ev.pdfPage}
                target="_blank"
                rel="noreferrer"
              >
                打开原始披露文件
                <ArrowUpRight size={14} />
              </a>
              <p className="drawer-footnote">
                可访问原文，不代表已实时重新解析全部报告。
              </p>
            </div>
          </aside>
        </>
      )}
      {modal && (
        <div className="modal-mask" onClick={() => setModal(null)}>
          <section
            className={"modal " + (modal.type === "edit" ? "wide" : "")}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal.type === "feedback"
                ? "补充研究反馈"
                : modal.type === "edit"
                  ? "调整研究条件"
                  : modal.type === "delete"
                    ? "删除研究"
                    : "使用指南"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon modal-close"
              aria-label="关闭弹窗"
              onClick={() => setModal(null)}
            >
              <X size={18} />
            </button>
            {modal.type === "feedback" && (
              <>
                <div className="eyebrow">YOUR JUDGMENT MATTERS</div>
                <h2>留下你的判断</h2>
                <p>反馈会进入下一次研究。事实保留，相关性可以重新审视。</p>
                <div className="feedback-types">
                  {[
                    ["weak", "关联较弱"],
                    ["agree", "认可依据"],
                    ["focus", "重点跟踪"],
                  ].map(([id, l]) => (
                    <button
                      className={feedbackType === id ? "on" : ""}
                      key={id}
                      onClick={() => setFeedbackType(id)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={250}
                  placeholder="例如：境外收入包含动力电池，不能直接验证海外储能贡献。"
                />
                <small>提交后未审阅更新失效，重新检查再审阅。</small>
                <button className="button primary full" onClick={saveFeedback}>
                  保存反馈
                  <Check size={14} />
                </button>
              </>
            )}
            {modal.type === "edit" && (
              <>
                <div className="eyebrow">REFINE YOUR RESEARCH</div>
                <h2>调整研究条件</h2>
                <p>修改后原判断归档，下一次检查使用新条件。</p>
                <div className="edit-fields">
                  {editTexts.map((s, i) => (
                    <div key={i}>
                      <label>假设 {String(i + 1).padStart(2, "0")}</label>
                      <textarea
                        value={s}
                        maxLength={180}
                        onChange={(e) =>
                          setEditTexts((a) =>
                            a.map((x, j) => (i === j ? e.target.value : x)),
                          )
                        }
                      />
                      <div className="metric-options">
                        {Object.entries(names).map(([id, l]: any) => (
                          <label key={id}>
                            <input
                              type="checkbox"
                              checked={editMetrics[i]?.includes(id) || false}
                              onChange={() =>
                                setEditMetrics((a) =>
                                  a.map((x, j) =>
                                    j === i
                                      ? x.includes(id)
                                        ? x.filter((v) => v !== id)
                                        : [...x, id]
                                      : x,
                                  ),
                                )
                              }
                            />
                            {l}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="button primary full"
                  disabled={
                    editTexts.some((s) => !s.trim()) ||
                    editMetrics.some((x) => !x.length)
                  }
                  onClick={saveEdit}
                >
                  保存研究条件
                  <Check size={14} />
                </button>
              </>
            )}
            {modal.type === "delete" && (
              <>
                <div className="system-icon">
                  <Trash2 size={22} />
                </div>
                <h2>删除这个研究任务？</h2>
                <p>任务、历史和反馈会从此浏览器删除。可以先导出备份。</p>
                <div className="modal-actions">
                  <button className="button secondary" onClick={backup}>
                    先导出备份
                  </button>
                  <button
                    className="button danger"
                    onClick={() => {
                      setTasks((ts) => ts.filter((t) => t.id !== modal.id));
                      setModal(null);
                      home();
                      setToast("研究任务已删除。");
                    }}
                  >
                    删除任务
                  </button>
                </div>
              </>
            )}
            {modal.type === "guide" && (
              <>
                <div className="eyebrow">A SMALL GUIDE</div>
                <h2>让研究，接着往下走</h2>
                <ol className="guide">
                  {[
                    [
                      "留下一个值得验证的问题",
                      "选择宁德时代、小米或比亚迪，也可以围绕这些公司输入自己的问题。模型读取2023年证据，形成可编辑假设。",
                    ],
                    [
                      "用新证据检查旧判断",
                      "点击“检查新证据”，模型比较 2024 年资料，逐条解释影响。",
                    ],
                    [
                      "判断，仍由你保留",
                      "接受更新、保留原判断或补充理由。下一次检查会带上这些反馈。",
                    ],
                  ].map(([h, p], i) => (
                    <li key={h}>
                      <span>0{i + 1}</span>
                      <div>
                        <strong>{h}</strong>
                        <p>{p}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="notice">
                  <Clock3 size={14} />
                  <span>
                    这是历史回放，非实时监控。任务保存在当前浏览器，建议导出备份。
                  </span>
                </div>
                <button
                  className="button primary full"
                  onClick={() => {
                    setModal(null);
                    const t = tasks.find((t) => t.id === "catl-example");
                    t ? open(t) : home();
                  }}
                >
                  开始体验
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Trace({ snapshot: s }: { snapshot: S }) {
  return (
    <details className="trace">
      <summary>
        查看实际执行记录<span>{s.trace?.length || 0} 次工具调用</span>
      </summary>
      {s.trace?.map((t: any, i: number) => (
        <div key={i}>
          <Check size={11} />
          <code>{t.tool}</code>
          <span>{JSON.stringify(t.args)}</span>
          <small>{t.count} 条返回</small>
        </div>
      ))}
      <p>
        模型：{s.model || "原文核对示例"} · 时间：{date(s.generatedAt)}
        {s.usage ? " · " + s.usage + " tokens" : ""}
      </p>
    </details>
  );
}
