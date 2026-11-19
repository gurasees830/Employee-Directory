import type {
  Employee,
  EmployeeDetail,
  EmployeeInput,
  EmployeeListResponse,
  Facets,
  Filters,
  QueryState,
  Stats,
} from "../types";
import { filtersToParams, toApiParams } from "../utils/query";
import { api } from "./client";

export { getErrorMessage, getFieldErrors, isCancel } from "./client";

export const getEmployees = async (query: QueryState, signal?: AbortSignal) => {
  const res = await api.get<EmployeeListResponse>("/employees", { params: toApiParams(query), signal });
  return res.data;
};

export const getStats = async (filters: Filters, signal?: AbortSignal) => {
  const res = await api.get<Stats>("/employees/stats", { params: filtersToParams(filters), signal });
  return res.data;
};

export const getFacets = async (signal?: AbortSignal) => {
  const res = await api.get<Facets>("/employees/facets", { signal });
  return res.data;
};

export const getEmployee = async (id: number, signal?: AbortSignal) => {
  const res = await api.get<EmployeeDetail>(`/employees/${id}`, { signal });
  return res.data;
};

export const addEmployee = async (data: EmployeeInput) => {
  const res = await api.post<Employee>("/employees", data);
  return res.data;
};

export const updateEmployee = async (id: number, data: EmployeeInput) => {
  const res = await api.put<Employee>(`/employees/${id}`, data);
  return res.data;
};

export const deleteEmployee = async (id: number) => {
  await api.delete(`/employees/${id}`);
};

export const bulkDeleteEmployees = async (ids: number[]) => {
  const res = await api.post<{ deleted: number }>("/employees/bulk-delete", { ids });
  return res.data.deleted;
};

/** Downloads a CSV of every employee matching the filters, in the current sort order. */
export const exportEmployeesCsv = async (query: QueryState) => {
  const params = toApiParams(query);
  params.delete("page");
  params.delete("limit");
  const res = await api.get<Blob>("/employees/export", { params, responseType: "blob" });

  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
