import axios from "axios";
import type { Employee, EmployeeInput, EmployeeListResponse } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

export const getEmployees = async (search = "", page = 1, limit = 5) => {
  const res = await api.get<EmployeeListResponse>("/employees", {
    params: { search, page, limit },
  });
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


export const getErrorMessage = (err: unknown) => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Can't reach the server. Is the backend running?";
    return err.response.data?.message || "Request failed";
  }
  return "Something went wrong";
};
