import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEmployee,
  bulkDeleteEmployees,
  deleteEmployee,
  exportEmployeesCsv,
  getEmployees,
  getErrorMessage,
  getFacets,
  getFieldErrors,
  isCancel,
  updateEmployee,
} from "./api/employees";
import ActiveFilters from "./components/ActiveFilters";
import ConfirmDialog, { type ConfirmOptions } from "./components/ConfirmDialog";
import Dashboard from "./components/Dashboard";
import Drawer from "./components/Drawer";
import EmployeeForm, { type SubmitResult } from "./components/EmployeeForm";
import EmployeeGrid from "./components/EmployeeGrid";
import EmployeeProfile from "./components/EmployeeProfile";
import EmployeeTable from "./components/EmployeeTable";
import FeedbackDialog from "./components/FeedbackDialog";
import FilterPanel from "./components/FilterPanel";
import { PlusIcon, TrashIcon, UsersIcon } from "./components/Icons";
import OrgChart from "./components/OrgChart";
import Pagination from "./components/Pagination";
import Sidebar from "./components/Sidebar";
import Toasts, { type Toast } from "./components/Toasts";
import Toolbar from "./components/Toolbar";
import type { useTheme } from "./hooks/useTheme";
import type { Admin } from "./api/auth";
import type { Employee, EmployeeInput, EmployeeListResponse, Facets, Filters, QueryState, Screen, SortKey, Tab } from "./types";
import { pluralize } from "./utils/format";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  hasAnyFilter,
  parseQuery,
  toApiParams,
  toUrlParams,
} from "./utils/query";
import "./App.css";

type FormState = { mode: "create" } | { mode: "edit"; employee: Employee } | null;

const FORM_ID = "employee-form";
const SEARCH_DEBOUNCE_MS = 300;
const SIDEBAR_KEY = "employee-directory-sidebar";

const TABS: { id: Tab; label: string }[] = [
  { id: "list", label: "Employee List" },
  { id: "directory", label: "Directory" },
  { id: "org", label: "Org Chart" },
];

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    return false;
  }
}

interface Props {
  admin: Admin;
  onSignOut: () => void;
  themeState: ReturnType<typeof useTheme>;
}

function App({ admin, onSignOut, themeState }: Props) {
  const { theme, toggle: toggleTheme } = themeState;

  // Filters, sort, page and tab all live in the URL, so any view can be bookmarked or shared.
  const [query, setQuery] = useState<QueryState>(() => parseQuery(window.location.search));
  const [searchInput, setSearchInput] = useState(query.filters.search);

  const [list, setList] = useState<EmployeeListResponse | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [formSaving, setFormSaving] = useState(false);
  const formDirty = useRef(false);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exporting, setExporting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const apiKey = toApiParams(query).toString();
  const requestKey = `${apiKey}#${reloadKey}`;
  const loading = settledKey !== requestKey;

  // A selection belongs to the result set it was made on; changing the query clears it.
  const [selection, setSelection] = useState<{ key: string; ids: Set<number> }>({ key: apiKey, ids: new Set() });
  const selected = selection.key === apiKey ? selection.ids : new Set<number>();

  const refresh = () => setReloadKey((k) => k + 1);

  const notify = useCallback((type: Toast["type"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const updateFilters = (patch: Partial<Filters>) => {
    if (patch.search !== undefined) setSearchInput(patch.search);
    setQuery((q) => ({ ...q, page: 1, filters: { ...q.filters, ...patch } }));
  };
  const replaceFilters = (filters: Filters) => {
    setSearchInput(filters.search);
    setQuery((q) => ({ ...q, page: 1, filters }));
  };
  const clearFilters = () => replaceFilters(DEFAULT_FILTERS);

  const navigate = (screen: Screen, tab?: Tab) => {
    setQuery((q) => ({ ...q, screen, tab: tab ?? q.tab }));
    window.scrollTo({ top: 0 });
  };

  // From the dashboard or a profile: jump to the employee list with a fresh filter.
  const showEmployees = (patch: Partial<Filters>) => {
    setProfileId(null);
    setSearchInput(patch.search ?? "");
    setQuery((q) => ({
      ...q,
      screen: "employees",
      tab: q.tab === "org" ? "directory" : q.tab,
      page: 1,
      filters: { ...DEFAULT_FILTERS, ...patch },
    }));
  };

  const sortBy = (key: SortKey) =>
    setQuery((q) => ({
      ...q,
      page: 1,
      sortBy: key,
      // clicking the active column flips it; a new column starts in its most useful direction
      sortOrder:
        q.sortBy === key
          ? q.sortOrder === "asc"
            ? "desc"
            : "asc"
          : key === "joiningDate"
            ? "desc"
            : "asc",
    }));

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const value = searchInput.trim();
    if (value === query.filters.search) return;
    const timer = setTimeout(
      () => setQuery((q) => ({ ...q, page: 1, filters: { ...q.filters, search: value } })),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [searchInput, query.filters.search]);

  // replaceState rather than pushState so typing in the search box doesn't flood history.
  useEffect(() => {
    const params = toUrlParams(query).toString();
    if (`?${params}` !== window.location.search) {
      window.history.replaceState(null, "", params ? `?${params}` : window.location.pathname);
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    getEmployees(query, controller.signal)
      .then((data) => {
        // e.g. the last person on the last page was deleted: step back to a page that exists
        if (data.employees.length === 0 && data.total > 0 && query.page > data.totalPages) {
          setQuery((q) => ({ ...q, page: data.totalPages }));
          return;
        }
        setList(data);
        setLoadError(null);
        setSettledKey(requestKey);
      })
      .catch((err) => {
        if (isCancel(err)) return;
        setLoadError(getErrorMessage(err));
        setSettledKey(requestKey);
      });
    return () => controller.abort();
    // requestKey already encodes everything in `query` that changes the request
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter options + the people list (org chart, "reports to"). Reloaded after edits.
  useEffect(() => {
    const controller = new AbortController();
    getFacets(controller.signal)
      .then(setFacets)
      .catch(() => {});
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open");
    } catch {
      // not important if this can't be saved
    }
  }, [collapsed]);

  // "/" jumps to search, "n" opens the new-employee form.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains("modal-open")) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "/") {
        e.preventDefault();
        setQuery((q) => (q.screen === "employees" && q.tab !== "org" ? q : { ...q, screen: "employees", tab: "directory" }));
        setTimeout(() => searchRef.current?.focus());
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setForm({ mode: "create" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const submitEmployee = async (data: EmployeeInput): Promise<SubmitResult> => {
    try {
      if (form?.mode === "edit") {
        const saved = await updateEmployee(form.employee.id, data);
        notify("success", `Saved changes to ${saved.name}'s profile`);
      } else {
        const saved = await addEmployee(data);
        notify("success", `${saved.name} has been added`);
      }
      formDirty.current = false;
      setForm(null);
      refresh();
      return { ok: true };
    } catch (err) {
      const errors = getFieldErrors(err);
      if (Object.keys(errors).length === 0) notify("error", getErrorMessage(err));
      return { ok: false, errors };
    }
  };

  const closeForm = () => {
    if (formSaving) return;
    if (!formDirty.current) {
      setForm(null);
      return;
    }
    setConfirm({
      title: "Discard your changes?",
      message: "You've edited this form but haven't saved it yet.",
      confirmLabel: "Discard",
      onConfirm: () => {
        formDirty.current = false;
        setForm(null);
      },
    });
  };

  const askDelete = (emp: Employee) =>
    setConfirm({
      title: `Delete ${emp.name}?`,
      message: (
        <>
          <p>Their record will be removed from the directory for good.</p>
          {emp.reportCount > 0 && (
            <p className="warn-text">
              {emp.name.split(" ")[0]} manages {pluralize(emp.reportCount, "person", "people")} — they'll need a new
              manager afterwards.
            </p>
          )}
        </>
      ),
      confirmLabel: "Delete",
      busyLabel: "Deleting…",
      onConfirm: async () => {
        try {
          await deleteEmployee(emp.id);
          notify("success", `${emp.name} was removed`);
          if (profileId === emp.id) setProfileId(null);
          refresh();
        } catch (err) {
          notify("error", getErrorMessage(err));
        }
      },
    });

  const askBulkDelete = () => {
    const ids = [...selected];
    setConfirm({
      title: `Delete ${pluralize(ids.length, "employee")}?`,
      message: <p>All of the selected records will be removed. There's no undo.</p>,
      confirmLabel: `Delete ${ids.length}`,
      busyLabel: "Deleting…",
      onConfirm: async () => {
        try {
          const deleted = await bulkDeleteEmployees(ids);
          notify("success", `Removed ${pluralize(deleted, "employee")}`);
          refresh();
        } catch (err) {
          notify("error", getErrorMessage(err));
        }
      },
    });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await exportEmployeesCsv(query);
      notify("success", `Downloaded ${pluralize(list?.total ?? 0, "employee")} as CSV`);
    } catch (err) {
      notify("error", getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const toggleSelect = (id: number) => {
    const ids = new Set(selected);
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    setSelection({ key: apiKey, ids });
  };
  const toggleSelectAll = () => {
    const pageIds = list?.employees.map((e) => e.id) ?? [];
    const all = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    setSelection({ key: apiKey, ids: all ? new Set() : new Set(pageIds) });
  };

  const filterCount = countActiveFilters(query.filters);
  const filtering = hasAnyFilter(query.filters);
  const employees = list?.employees ?? [];
  const companySize = facets?.people.length ?? null;
  const openEdit = (employee: Employee) => setForm({ mode: "edit", employee });

  let results;
  if (!list && loadError) {
    results = (
      <div className="empty">
        <h3>Couldn't load the directory</h3>
        <p>{loadError}</p>
        <button type="button" className="btn" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  } else if (!list) {
    results = (
      <div className="skeleton-cards" aria-busy="true" aria-label="Loading employees">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton-card">
            <span className="avatar avatar-xl skeleton-block" />
            <div className="skeleton-line w-60" />
            <div className="skeleton-line w-40" />
          </div>
        ))}
      </div>
    );
  } else if (employees.length === 0) {
    results = filtering ? (
      <div className="empty">
        <h3>Nobody matches that</h3>
        <p>Try loosening a filter or two, or search for something broader.</p>
        <button type="button" className="btn" onClick={clearFilters}>
          Clear filters
        </button>
      </div>
    ) : (
      <div className="empty">
        <UsersIcon size={28} />
        <h3>No employees yet</h3>
        <p>Add the first person and they'll show up here.</p>
        <button type="button" className="btn btn-primary" onClick={() => setForm({ mode: "create" })}>
          <PlusIcon size={16} /> Add employee
        </button>
      </div>
    );
  } else if (query.tab === "directory") {
    results = (
      <EmployeeGrid
        employees={employees}
        search={query.filters.search}
        onOpen={setProfileId}
        onEdit={openEdit}
        onDelete={askDelete}
      />
    );
  } else {
    results = (
      <EmployeeTable
        employees={employees}
        search={query.filters.search}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        selected={selected}
        onSort={sortBy}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleSelectAll}
        onOpen={setProfileId}
        onEdit={openEdit}
        onDelete={askDelete}
      />
    );
  }

  const onDashboard = query.screen === "dashboard";

  return (
    <div className={`shell ${collapsed ? "is-collapsed" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Sidebar
        screen={query.screen}
        tab={query.tab}
        total={companySize}
        collapsed={collapsed}
        theme={theme}
        onNavigate={navigate}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onToggleTheme={toggleTheme}
        admin={admin}
        onSignOut={onSignOut}
        onReport={() => setFeedbackOpen(true)}
      />

      <main id="main" className="main">
        <header className="page-head">
          <div>
            <h1>{onDashboard ? "Dashboard" : "Employee"}</h1>
            <p>
              {onDashboard
                ? "Headcount, teams and who's joined recently."
                : "Everyone at Ágaetis — search by name, or narrow it down by team, level, years at the company or skills."}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setForm({ mode: "create" })}>
            <PlusIcon size={17} />
            Add New Employee
          </button>
        </header>

        {onDashboard ? (
          <Dashboard
            people={facets?.people ?? []}
            reloadKey={reloadKey}
            onOpen={setProfileId}
            onShowEmployees={showEmployees}
          />
        ) : (
          <>
            <div className="tabs" role="tablist" aria-label="Employee views">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={query.tab === t.id}
                  aria-controls="tab-panel"
                  className={`tab ${query.tab === t.id ? "is-active" : ""}`}
                  onClick={() => setQuery((q) => ({ ...q, tab: t.id }))}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <section id="tab-panel" role="tabpanel" aria-labelledby={`tab-${query.tab}`} className="board">
              {query.tab === "org" ? (
                facets ? (
                  <OrgChart people={facets.people} onOpen={setProfileId} />
                ) : (
                  <div className="skeleton-line" />
                )
              ) : (
                <>
                  <Toolbar
                    searchRef={searchRef}
                    search={searchInput}
                    onSearchChange={setSearchInput}
                    filterCount={filterCount}
                    onOpenFilters={() => setFiltersOpen(true)}
                    sortBy={query.sortBy}
                    sortOrder={query.sortOrder}
                    onSortChange={(by, order) => setQuery((q) => ({ ...q, page: 1, sortBy: by, sortOrder: order }))}
                    onExport={exportCsv}
                    exporting={exporting}
                  />

                  <ActiveFilters
                    filters={query.filters}
                    people={facets?.people ?? []}
                    onChange={replaceFilters}
                    onClear={clearFilters}
                  />

                  <div className="results-meta" aria-live="polite">
                    {list &&
                      (filtering ? (
                        <span>
                          Showing <strong>{list.total}</strong> of {companySize ?? "…"} people
                        </span>
                      ) : (
                        <span>
                          <strong>{list.total}</strong> people
                        </span>
                      ))}
                    {loadError && list && <span className="inline-error">{loadError}</span>}
                  </div>

                  {selected.size > 0 && query.tab === "list" && (
                    <div className="bulk-bar" role="region" aria-label="Bulk actions">
                      <span>
                        <strong>{selected.size}</strong> selected
                      </span>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setSelection({ key: apiKey, ids: new Set() })}
                      >
                        Clear
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost-danger" onClick={askBulkDelete}>
                        <TrashIcon size={15} /> Delete selected
                      </button>
                    </div>
                  )}

                  <div className={`results-body ${loading && list ? "is-refreshing" : ""}`}>
                    {loading && list && <div className="progress" aria-hidden="true" />}
                    {results}
                  </div>

                  {list && (
                    <Pagination
                      page={list.page}
                      totalPages={list.totalPages}
                      total={list.total}
                      limit={query.limit}
                      onPageChange={(page) => {
                        setQuery((q) => ({ ...q, page }));
                        document.getElementById("tab-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      onLimitChange={(limit) => setQuery((q) => ({ ...q, page: 1, limit }))}
                    />
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      {filtersOpen && (
        <Drawer
          title="Filters"
          subtitle={filterCount > 0 ? `${pluralize(filterCount, "filter")} applied` : "Narrow down the list"}
          onClose={() => setFiltersOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={clearFilters} disabled={!filtering}>
                Reset
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
                {list && !loading ? `Show ${pluralize(list.total, "result")}` : "Show results"}
              </button>
            </>
          }
        >
          <FilterPanel filters={query.filters} facets={facets} onChange={updateFilters} onReset={clearFilters} />
        </Drawer>
      )}

      {profileId !== null && !form && (
        <EmployeeProfile
          employeeId={profileId}
          reloadKey={reloadKey}
          onClose={() => setProfileId(null)}
          onOpen={setProfileId}
          onEdit={openEdit}
          onDelete={askDelete}
          onApplyFilter={showEmployees}
          notify={notify}
        />
      )}

      {form && (
        <Drawer
          size="lg"
          title={form.mode === "edit" ? `Edit ${form.employee.name}` : "Add a new employee"}
          subtitle={form.mode === "edit" ? form.employee.email : "They'll appear in the directory as soon as you save."}
          onClose={closeForm}
          footer={
            <>
              <button type="button" className="btn" onClick={closeForm} disabled={formSaving}>
                Cancel
              </button>
              <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={formSaving}>
                {formSaving ? "Saving…" : form.mode === "edit" ? "Save changes" : "Add employee"}
              </button>
            </>
          }
        >
          <EmployeeForm
            formId={FORM_ID}
            employee={form.mode === "edit" ? form.employee : null}
            facets={facets}
            onSubmit={submitEmployee}
            onDirtyChange={(dirty) => {
              formDirty.current = dirty;
            }}
            onSavingChange={setFormSaving}
          />
        </Drawer>
      )}

      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}

      {feedbackOpen && (
        <FeedbackDialog reporter={admin.name} onClose={() => setFeedbackOpen(false)} notify={notify} />
      )}

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

export default App;
