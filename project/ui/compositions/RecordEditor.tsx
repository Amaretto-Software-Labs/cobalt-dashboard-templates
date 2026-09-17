import { useEffect, useState } from "react";
import type { Item } from "@cobalt-code/dashboard";
import {
  Dialog,
  Field,
  TextArea,
  Select,
  Button,
  ConfirmAction,
  Notice,
} from "../Controls";
import { SourceLink } from "../Layout";
export function RecordEditor({
  record,
  onClose,
  lanes,
  onSave,
  onDelete,
}: {
  record?: Item;
  onClose: () => void;
  lanes: string[];
  onSave?: (record: Item) => Promise<void>;
  onDelete?: (record: Item) => Promise<void>;
}) {
  const [draft, setDraft] = useState(record),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setDraft(record);
    setError("");
  }, [record]);
  return (
    <Dialog
      title={record?.id ? "Card details" : "New card"}
      open={!!record}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      {draft && (
        <form
          className="form-grid"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!onSave) return;
            if (!draft.title.trim()) {
              setError("Enter a title.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              await onSave({ ...draft, title: draft.title.trim() });
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="Title"
            value={draft.title}
            readOnly={!onSave}
            required
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <TextArea
            label="Description"
            value={draft.description || ""}
            readOnly={!onSave}
            onChange={(description) => setDraft({ ...draft, description })}
          />
          <label className="ui-field">
            <span>Status</span>
            <Select
              label="Card status"
              value={draft.status}
              disabled={!onSave || busy}
              onChange={(status) => setDraft({ ...draft, status })}
              options={lanes.map((value) => ({ value, label: value }))}
            />
          </label>
          <Field
            label="Owner"
            value={draft.assignee || ""}
            readOnly={!onSave}
            onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
          />
          <Field
            label="Scope"
            value={draft.project || ""}
            readOnly={!onSave}
            onChange={(e) => setDraft({ ...draft, project: e.target.value })}
          />
          <SourceLink url={draft.url} />
          {error && <Notice tone="danger">{error}</Notice>}
          {onSave && (
            <Button type="submit" primary busy={busy}>
              Save card
            </Button>
          )}
          {onDelete && draft.id && (
            <ConfirmAction
              label="Delete card"
              danger
              description={`Delete “${draft.title}”? This cannot be undone.`}
              disabled={busy}
              onConfirm={async () => {
                await onDelete(draft);
                onClose();
              }}
            />
          )}
        </form>
      )}
    </Dialog>
  );
}
