import { useMemo, useState } from "react";
import type { Person } from "../types";
import Avatar from "./Avatar";
import Highlight from "./Highlight";
import { ChevronRightIcon, SearchIcon } from "./Icons";

interface Props {
  people: Person[];
  onOpen: (id: number) => void;
}

interface Tree {
  roots: Person[];
  children: Map<number, Person[]>;
  parent: Map<number, number>;
}

function buildTree(people: Person[]): Tree {
  const ids = new Set(people.map((p) => p.id));
  const children = new Map<number, Person[]>();
  const parent = new Map<number, number>();
  const roots: Person[] = [];

  for (const p of people) {
    if (p.managerId !== null && ids.has(p.managerId)) {
      if (!children.has(p.managerId)) children.set(p.managerId, []);
      children.get(p.managerId)!.push(p);
      parent.set(p.id, p.managerId);
    } else {
      roots.push(p); // no manager (or manager outside the list) — show at the top level
    }
  }

  // managers before individual contributors, then alphabetical
  const order = (a: Person, b: Person) => b.reportCount - a.reportCount || a.name.localeCompare(b.name);
  roots.sort(order);
  for (const list of children.values()) list.sort(order);
  return { roots, children, parent };
}

function OrgChart({ people, onOpen }: Props) {
  const tree = useMemo(() => buildTree(people), [people]);
  const [query, setQuery] = useState("");

  // Start with the top two levels open — enough to see how the company is shaped.
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const open = new Set<number>();
    for (const root of tree.roots) {
      open.add(root.id);
      for (const child of tree.children.get(root.id) ?? []) open.add(child.id);
    }
    return open;
  });

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return new Set<number>();
    return new Set(
      people.filter((p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)).map((p) => p.id)
    );
  }, [people, q]);

  // While searching, open every branch that leads to a match.
  const visibleExpanded = useMemo(() => {
    if (!q) return expanded;
    const open = new Set<number>();
    for (const id of matches) {
      let current = tree.parent.get(id);
      while (current !== undefined) {
        open.add(current);
        current = tree.parent.get(current);
      }
    }
    return open;
  }, [q, matches, expanded, tree]);

  // Toggling while searching keeps what's currently open and ends the search.
  const toggle = (id: number) => {
    const next = new Set(visibleExpanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
    setQuery("");
  };

  const expandAll = () => {
    setQuery("");
    setExpanded(new Set(tree.children.keys()));
  };
  const collapseAll = () => {
    setQuery("");
    setExpanded(new Set());
  };

  const renderNode = (person: Person) => {
    const kids = tree.children.get(person.id) ?? [];
    const isOpen = visibleExpanded.has(person.id);
    const isMatch = matches.has(person.id);
    return (
      <li key={person.id} role="treeitem" aria-expanded={kids.length ? isOpen : undefined} aria-selected={false}>
        <div className={`org-node ${isMatch ? "is-match" : ""} ${q && !isMatch ? "is-dim" : ""}`}>
          {kids.length > 0 ? (
            <button
              type="button"
              className={`org-toggle ${isOpen ? "is-open" : ""}`}
              onClick={() => toggle(person.id)}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${person.name}'s team`}
            >
              <ChevronRightIcon size={15} />
            </button>
          ) : (
            <span className="org-toggle-spacer" />
          )}
          <button type="button" className="org-person" onClick={() => onOpen(person.id)}>
            <Avatar name={person.name} size="sm" status={person.status} />
            <span className="org-text">
              <span className="org-name">
                <Highlight text={person.name} query={query} />
              </span>
              <span className="org-role">
                <Highlight text={person.role} query={query} /> · {person.department}
              </span>
            </span>
          </button>
          {kids.length > 0 && (
            <span className="org-count" title={`${kids.length} direct reports`}>
              {kids.length}
            </span>
          )}
        </div>
        {kids.length > 0 && isOpen && (
          <ul role="group" className="org-children">
            {kids.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="org">
      <div className="org-toolbar">
        <label className="mini-search org-search">
          <SearchIcon size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone in the chart"
            aria-label="Find someone in the org chart"
          />
        </label>
        {q && (
          <span className="muted small">
            {matches.size === 0 ? "No one by that name" : `${matches.size} found`}
          </span>
        )}
        <div className="org-actions">
          <button type="button" className="link-btn" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" className="link-btn" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>
      <p className="org-note">
        The full reporting structure — {people.length} people. Filters don't apply here; click anyone to open their
        profile.
      </p>
      <ul role="tree" aria-label="Organisation chart" className="org-tree">
        {tree.roots.map(renderNode)}
      </ul>
    </div>
  );
}

export default OrgChart;
