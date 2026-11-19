import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreIcon } from "./Icons";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

const MENU_WIDTH = 168;
const ITEM_HEIGHT = 36;

/** "⋮" actions menu. Rendered in a portal with fixed positioning so scroll containers can't clip it. */
function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const open = pos !== null;

  const close = (refocus = true) => {
    setPos(null);
    if (refocus) buttonRef.current?.focus();
  };

  const toggle = () => {
    if (open) return close();
    const rect = buttonRef.current!.getBoundingClientRect();
    const height = items.length * ITEM_HEIGHT + 10;
    const below = rect.bottom + 4 + height < window.innerHeight;
    setPos({
      top: below ? rect.bottom + 4 : rect.top - height - 4,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();

    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setPos(null);
    };
    const onScroll = () => setPos(null);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const entries = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`icon-btn kebab ${open ? "is-open" : ""}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        <MoreIcon size={18} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            className="menu"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={item.danger ? "is-danger" : ""}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}

export default RowMenu;
