import {
  useId,
  useState,
  useEffect,
  type ReactNode,
  type PropsWithChildren,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import {
  Select as RSelect,
  DropdownMenu as RMenu,
  Tooltip as RTooltip,
  Dialog as RDialog,
  Tabs as RTabs,
  Checkbox as RCheckbox,
  Switch as RSwitch,
  Toast as RToast,
} from "radix-ui";
import {
  Check,
  ChevronDown,
  X,
  LoaderCircle,
  AlertCircle,
  Info,
  MoreHorizontal,
  Search,
  RefreshCw,
} from "lucide-react";
export type Tone = "neutral" | "success" | "warning" | "danger" | "accent";
export function Button({
  primary,
  variant = "secondary",
  busy = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  busy?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`cobalt-button ${primary || variant === "primary" ? "cobalt-button--primary" : ""} button-${variant} ${className}`}
    >
      {busy ? <LoaderCircle size={16} className="spin" /> : icon}
      {children}
    </button>
  );
}
export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <RTooltip.Provider delayDuration={350}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content className="ui-tooltip" sideOffset={7}>
            {label}
            <RTooltip.Arrow className="tooltip-arrow" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: Omit<Parameters<typeof Button>[0], "children"> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <Button
        {...props}
        aria-label={label}
        className={`icon-button ${props.className || ""}`}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
export type Option = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
};
export function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder = "Choose…",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <RSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
      <RSelect.Trigger aria-label={label} className="ui-select">
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown size={14} />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          className="ui-popup"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <RSelect.Viewport>
            {options.map((option) => (
              <RSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="ui-option"
              >
                <span className="option-check">
                  <RSelect.ItemIndicator>
                    <Check size={14} />
                  </RSelect.ItemIndicator>
                </span>
                {option.icon}
                <RSelect.ItemText>{option.label}</RSelect.ItemText>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
export type MenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};
export function Menu({
  label = "Actions",
  items,
}: {
  label?: string;
  items: MenuItem[];
}) {
  return (
    <RMenu.Root>
      <RMenu.Trigger asChild>
        <Button aria-label={label} className="icon-button">
          <MoreHorizontal size={17} />
        </Button>
      </RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content
          className="ui-popup"
          sideOffset={6}
          align="end"
          collisionPadding={12}
        >
          {items.map((item) => (
            <RMenu.Item
              key={item.id}
              className={`ui-option ${item.danger ? "tone-danger" : ""}`}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              {item.icon}
              <span>{item.label}</span>
            </RMenu.Item>
          ))}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}
export function Field({
  label,
  hint,
  error,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}) {
  const id = useId();
  return (
    <label className="ui-field" htmlFor={id}>
      <span>
        {label}
        {props.required && <span className="muted"> · Required</span>}
      </span>
      <span className={`field-control ${icon ? "with-icon" : ""}`}>
        {icon}
        <input
          {...props}
          id={id}
          aria-invalid={!!error}
          aria-describedby={hint || error ? id + "-hint" : undefined}
        />
      </span>
      {(hint || error) && (
        <small id={id + "-hint"} className={error ? "tone-danger" : "muted"}>
          {error || hint}
        </small>
      )}
    </label>
  );
}
export function TextArea({
  label,
  value,
  onChange,
  hint,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  readOnly?: boolean;
}) {
  const id = useId();
  return (
    <label className="ui-field" htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        value={value}
        readOnly={readOnly}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}
export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="check-label" htmlFor={id}>
      <RCheckbox.Root
        id={id}
        className="ui-checkbox"
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
      >
        <RCheckbox.Indicator>
          <Check size={14} />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      {label}
    </label>
  );
}
export function Switch({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="switch-label" htmlFor={id}>
      <span>
        {label}
        {hint && <small className="muted">{hint}</small>}
      </span>
      <RSwitch.Root
        id={id}
        className="ui-switch"
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      >
        <RSwitch.Thumb className="switch-thumb" />
      </RSwitch.Root>
    </label>
  );
}
export function Tabs({
  label,
  value,
  onChange,
  tabs,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  tabs: { id: string; label: string; icon?: ReactNode; content: ReactNode }[];
}) {
  return (
    <RTabs.Root value={value} onValueChange={onChange}>
      <RTabs.List aria-label={label} className="ui-tabs">
        {tabs.map((tab) => (
          <RTabs.Trigger key={tab.id} value={tab.id}>
            {tab.icon}
            {tab.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {tabs.map((tab) => (
        <RTabs.Content key={tab.id} value={tab.id} className="tab-content">
          {tab.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
export function Dialog({
  title,
  description,
  open,
  onOpenChange,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const descriptionId = useId();
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="ui-overlay" />
        <RDialog.Content
          className={`ui-dialog ${wide ? "dialog-wide" : ""}`}
          aria-describedby={description ? descriptionId : undefined}
        >
          <header>
            <div>
              <RDialog.Title>{title}</RDialog.Title>
              {description && (
                <RDialog.Description id={descriptionId}>
                  {description}
                </RDialog.Description>
              )}
            </div>
            <RDialog.Close asChild>
              <IconButton label="Close">
                <X size={17} />
              </IconButton>
            </RDialog.Close>
          </header>
          <div className="dialog-body">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
export function Notice({
  tone = "neutral",
  children,
  action,
}: {
  tone?: Tone;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`notice tone-${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {tone === "danger" ? (
        <AlertCircle size={17} />
      ) : tone === "success" ? (
        <Check size={17} />
      ) : (
        <Info size={17} />
      )}
      <div>{children}</div>
      {action}
    </div>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <RToast.Provider duration={3500}>
      <RToast.Root
        className="ui-toast"
        open={!!message}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Check size={16} />
        <RToast.Description>{message}</RToast.Description>
        <RToast.Close asChild>
          <IconButton label="Dismiss notification">
            <X size={14} />
          </IconButton>
        </RToast.Close>
      </RToast.Root>
      <RToast.Viewport className="toast-viewport" />
    </RToast.Provider>
  );
}
export function ConfirmAction({
  label,
  description,
  onConfirm,
  danger = false,
  disabled = false,
}: {
  label: string;
  description: string;
  onConfirm: () => Promise<void>;
  danger?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Button
        disabled={disabled}
        variant={danger ? "danger" : "secondary"}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        title={label}
        description={description}
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="toolbar">
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            busy={busy}
            variant={danger ? "danger" : "primary"}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onConfirm();
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <IconButton
          label="Clear search"
          variant="quiet"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </IconButton>
      )}
    </label>
  );
}
export function Refresh({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button busy={loading} icon={<RefreshCw size={15} />} onClick={onClick}>
      Refresh
    </Button>
  );
}
export function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      update = () => setReduce(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduce;
}
