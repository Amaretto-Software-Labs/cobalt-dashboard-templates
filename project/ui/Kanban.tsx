import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X, Trash2, ExternalLink } from "lucide-react";
import {
  bridge,
  safeUrl,
  useDataset,
  type Item,
  type StoredRecord,
} from "../sdk";
import {
  Badge,
  Button,
  Card,
  Dashboard,
  Refresh,
  SearchField,
  State,
} from "./index";
export default function Kanban() {
  const { data, error, loading, refresh } = useDataset();
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [selected, setSelected] = useState<Item>();
  const [draft, setDraft] = useState<Item>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const local = data?.configured && data.mode === "records";
  const configuredColumns = data?.columns ?? ["To do", "In progress", "Done"];
  const loadRecords = useCallback(async () => {
    try {
      setRecords((await bridge().getRecords("cards")).items);
    } catch (e) {
      setFailure(String(e));
    }
  }, []);
  useEffect(() => {
    if (local) void loadRecords();
  }, [local, loadRecords]);
  useEffect(() => {
    if (draft) {
      dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    }
  }, [draft?.id]);
  const items: Item[] = local
    ? records.map((record) => ({ ...record.values, id: record.recordId }))
    : (data?.items ?? []);
  const columns = [
    ...new Set([...configuredColumns, ...items.map((item) => item.status)]),
  ];
  const visible = items.filter(
    (item) =>
      (!priority || item.priority === priority) &&
      `${item.title} ${item.id} ${item.assignee ?? ""} ${item.project ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function open(item: Item) {
    setSelected(item);
    setDraft({ ...item });
    setDeleting(false);
    setFailure(undefined);
  }
  async function save(item: Item, remove = false) {
    setBusy(true);
    setFailure(undefined);
    try {
      const record = records.find((record) => record.recordId === item.id);
      await bridge().requestAction(remove ? "delete-card" : "save-card", {
        recordId: record?.recordId ?? crypto.randomUUID(),
        expectedVersion: record?.version ?? 0,
        values: item,
      });
      await loadRecords();
      setDraft(undefined);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dashboard
      title="Work board"
      description="A shared view of priorities, ownership and progress."
      actions={
        <>
          <Refresh
            loading={loading}
            onClick={() => {
              void refresh();
              if (local) void loadRecords();
            }}
          />
          {local && (
            <Button
              primary
              onClick={() =>
                open({
                  id: "",
                  title: "",
                  status: columns[0],
                  priority: "Medium",
                })
              }
            >
              <Plus size={16} />
              New card
            </Button>
          )}
        </>
      }
    >
      <State
        loading={loading && !data}
        error={error}
        configured={data?.configured}
        retry={refresh}
      />
      {failure && !draft && (
        <p role="alert" className="error">
          {failure}
        </p>
      )}
      {data?.configured && (
        <>
          <div className="toolbar">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search cards, people or projects"
            />
            <select
              aria-label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All priorities</option>
              {["High", "Medium", "Low"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <span className="muted">
              {visible.length} of {items.length} cards
            </span>
          </div>
          <div className="board">
            {columns.map((column) => (
              <section
                className="column"
                key={column}
                aria-label={column}
                onDragOver={(e) => {
                  if (local) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const item = items.find(
                    (item) => item.id === e.dataTransfer.getData("text/plain"),
                  );
                  if (item && local && !busy)
                    void save({ ...item, status: column });
                }}
              >
                <header className="column-heading">
                  <h2>{column}</h2>
                  <Badge>
                    {visible.filter((item) => item.status === column).length}
                  </Badge>
                </header>
                {visible
                  .filter((item) => item.status === column)
                  .map((item) => (
                    <Card key={item.id} className="work-card">
                      <div
                        draggable={!!local && !busy}
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", item.id)
                        }
                      >
                        <div className="card-meta">
                          <span className="muted">{item.id.slice(0, 12)}</span>
                          <Badge>{item.priority ?? "Normal"}</Badge>
                        </div>
                        <button
                          className="card-title"
                          onClick={() => open(item)}
                        >
                          {item.title}
                        </button>
                      </div>
                      <div className="card-meta">
                        <span>{item.assignee || "Unassigned"}</span>
                        <span className="muted">{item.project}</span>
                      </div>
                      {item.due && (
                        <span className="muted">Due {item.due}</span>
                      )}
                      {local && (
                        <select
                          aria-label={`Status for ${item.title}`}
                          value={item.status}
                          disabled={busy}
                          onChange={(e) =>
                            void save({ ...item, status: e.target.value })
                          }
                        >
                          {columns.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      )}
                    </Card>
                  ))}
                {!visible.some((item) => item.status === column) && (
                  <div className="empty-column">
                    {search || priority ? "No matching cards" : "No cards yet"}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
      {draft && (
        <div
          className="drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setDraft(undefined);
          }}
        >
          <div
            ref={dialog}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={draft.id ? "Card details" : "New card"}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setDraft(undefined);
              if (e.key === "Tab") {
                const nodes = dialog.current?.querySelectorAll<HTMLElement>(
                  "button:not(:disabled),input,select,textarea,a[href]",
                );
                if (nodes?.length) {
                  const first = nodes[0],
                    last = nodes[nodes.length - 1];
                  if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                  } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                  }
                }
              }
            }}
          >
            <header>
              <h2>{draft.id ? "Card details" : "New card"}</h2>
              <Button
                aria-label="Close"
                disabled={busy}
                onClick={() => setDraft(undefined)}
              >
                <X size={16} />
              </Button>
            </header>
            <label>
              Title
              <input
                readOnly={!local}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                rows={5}
                readOnly={!local}
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </label>
            {(
              ["status", "priority", "assignee", "project", "due"] as const
            ).map((field) => (
              <label key={field}>
                {field[0].toUpperCase() + field.slice(1)}
                {field === "status" || field === "priority" ? (
                  <select
                    disabled={!local}
                    value={draft[field] ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, [field]: e.target.value })
                    }
                  >
                    {(field === "status"
                      ? columns
                      : ["High", "Medium", "Low"]
                    ).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field === "due" ? "date" : "text"}
                    readOnly={!local}
                    value={draft[field] ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, [field]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            {safeUrl(draft.url) && (
              <a href={safeUrl(draft.url)} target="_blank" rel="noreferrer">
                Open source <ExternalLink size={14} />
              </a>
            )}
            {failure && (
              <p role="alert" className="error">
                {failure}
              </p>
            )}
            {local && (
              <>
                <Button
                  primary
                  disabled={busy || !draft.title.trim()}
                  onClick={() => void save(draft)}
                >
                  {busy ? "Saving…" : "Save card"}
                </Button>
                {selected?.id && (
                  <Button
                    className="cobalt-button--danger"
                    disabled={busy}
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 size={15} />
                    Delete card
                  </Button>
                )}
                {deleting && (
                  <div role="alert">
                    <p>Delete this card permanently?</p>
                    <div className="toolbar">
                      <Button
                        disabled={busy}
                        onClick={() => setDeleting(false)}
                      >
                        Keep card
                      </Button>
                      <Button
                        className="cobalt-button--danger"
                        disabled={busy}
                        onClick={() => void save(draft, true)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Dashboard>
  );
}
