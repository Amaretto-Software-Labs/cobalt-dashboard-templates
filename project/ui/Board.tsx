import { useEffect, useRef, useState, type ReactNode } from "react";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { Feedback } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { GripVertical, Undo2 } from "lucide-react";
import { Button, Notice, Select, Tooltip } from "./Controls";
import { Badge } from "./Layout";
export type BoardItem = {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  priority?: string;
  project?: string;
  position?: number;
};
export type BoardMove = { id: string; status: string; beforeId?: string };
export function applyBoardMove<T extends BoardItem>(
  items: T[],
  change: BoardMove,
): T[] {
  const card = items.find((i) => i.id === change.id);
  if (!card) return items;
  const rest = items.filter((i) => i.id !== card.id);
  const index = change.beforeId
    ? rest.findIndex((i) => i.id === change.beforeId)
    : -1;
  const updated = { ...card, status: change.status };
  rest.splice(index < 0 ? rest.length : index, 0, updated);
  return rest;
}
function Lane({
  id,
  children,
  count,
  disabled,
}: {
  id: string;
  children: ReactNode;
  count: number;
  disabled: boolean;
}) {
  const { ref, isDropTarget } = useDroppable({
    id,
    accept: "card",
    disabled,
    collisionPriority: 0,
  });
  return (
    <section
      ref={ref}
      className={`column ${isDropTarget ? "drop-target" : ""}`}
      aria-label={id}
    >
      <header className="column-heading">
        <h2>{id}</h2>
        <Badge>{count}</Badge>
      </header>
      {children}
      {!count && (
        <div className="empty-column">
          {disabled ? "No cards" : "Drop a card here"}
        </div>
      )}
    </section>
  );
}
function BoardCard({
  item,
  index,
  lane,
  lanes,
  disabled,
  onOpen,
  onMove,
}: {
  item: BoardItem;
  index: number;
  lane: string;
  lanes: string[];
  disabled: boolean;
  onOpen: (item: BoardItem) => void;
  onMove: (change: BoardMove) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: item.id,
    index,
    group: lane,
    type: "card",
    accept: "card",
    disabled,
    // React owns cross-column reparenting; keep the drag feedback in a clone.
    plugins: [
      SortableKeyboardPlugin,
      Feedback.configure({ feedback: "clone" }),
    ],
  });
  return (
    <article
      ref={ref}
      className={`work-card ${isDragging ? "dragging" : ""}`}
      data-card-id={item.id}
    >
      <div className="card-meta">
        <small className="muted">{item.id}</small>
        {!disabled && (
          <Tooltip label="Drag to move or reorder. Space then arrow keys for keyboard movement.">
            <button
              type="button"
              ref={handleRef}
              className="drag-handle"
              aria-label={`Move ${item.title}`}
            >
              <GripVertical size={17} />
            </button>
          </Tooltip>
        )}
      </div>
      <button type="button" className="card-title" onClick={() => onOpen(item)}>
        {item.title}
      </button>
      <div className="card-meta">
        <span>{item.assignee || "Unassigned"}</span>
        {item.priority && (
          <Badge tone={item.priority === "High" ? "warning" : "neutral"}>
            {item.priority}
          </Badge>
        )}
      </div>
      {item.project && <small className="muted">{item.project}</small>}
      {!disabled && (
        <Select
          label={`Status for ${item.title}`}
          value={item.status}
          onChange={(status) => onMove({ id: item.id, status })}
          options={lanes.map((value) => ({ value, label: value }))}
        />
      )}
    </article>
  );
}
export function WorkBoard({
  items,
  lanes,
  onSelect,
  onMove,
}: {
  items: BoardItem[];
  lanes: string[];
  onSelect: (item: BoardItem) => void;
  onMove?: (change: BoardMove) => Promise<void>;
}) {
  const groups = () =>
    Object.fromEntries(
      lanes.map((lane) => [
        lane,
        items.filter((i) => i.status === lane).map((i) => i.id),
      ]),
    );
  const [draft, setDraft] = useState(groups),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [undo, setUndo] = useState<BoardMove>(),
    [message, setMessage] = useState("");
  const dragging = useRef(false);
  useEffect(() => {
    if (!dragging.current) setDraft(groups());
  }, [items, lanes]);
  async function commit(change: BoardMove, undoing = false) {
    if (!onMove || busy) return;
    const card = items.find((i) => i.id === change.id);
    if (!card) return;
    const siblings = items.filter((i) => i.status === card.status),
      next = siblings[siblings.findIndex((i) => i.id === card.id) + 1];
    setBusy(true);
    setError("");
    try {
      await onMove(change);
      setUndo(
        undoing
          ? undefined
          : { id: card.id, status: card.status, beforeId: next?.id },
      );
      setMessage(`${card.title} moved to ${change.status}.`);
    } catch (e) {
      setDraft(groups());
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="board-container">
      {onMove && (
        <div className="board-instructions">
          <small className="muted">
            Drag a grip to move or reorder. Space and arrow keys also move
            cards.
          </small>
          <Button
            disabled={!undo || busy}
            icon={<Undo2 size={14} />}
            onClick={() => undo && void commit(undo, true)}
          >
            Undo
          </Button>
        </div>
      )}
      {error && (
        <Notice tone="danger">
          {error} · The original order has been restored.
        </Notice>
      )}
      <div className="sr-only" role="status">
        {message}
      </div>
      <DragDropProvider
        onDragStart={() => {
          dragging.current = true;
        }}
        onDragEnd={(event) => {
          dragging.current = false;
          if (event.canceled) {
            setDraft(groups());
            return;
          }
          const next = move(draft, event);
          setDraft(next);
          const id = String(event.operation.source?.id || ""),
            group = Object.entries(next).find(([, ids]) => ids.includes(id));
          if (group) {
            const [status, ids] = group;
            void commit({ id, status, beforeId: ids[ids.indexOf(id) + 1] });
          }
        }}
      >
        <div
          className="board"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, lanes.length)},minmax(220px,1fr))`,
          }}
        >
          {lanes.map((lane) => (
            <Lane
              key={lane}
              id={lane}
              count={draft[lane]?.length || 0}
              disabled={!onMove || busy}
            >
              {(draft[lane] || []).map((id, index) => {
                const item = items.find((i) => i.id === id);
                return item ? (
                  <BoardCard
                    key={id}
                    item={item}
                    index={index}
                    lane={lane}
                    lanes={lanes}
                    disabled={!onMove || busy}
                    onOpen={onSelect}
                    onMove={(change) => void commit(change)}
                  />
                ) : null;
              })}
            </Lane>
          ))}
        </div>
      </DragDropProvider>
    </div>
  );
}
