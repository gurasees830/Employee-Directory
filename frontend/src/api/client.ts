import axios from "axios";
import type { FieldErrors } from "../types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 15_000,
  withCredentials: true, // send the httpOnly session cookie
});

// When the session runs out mid-use, any request comes back 401. One handler (set by the
// auth gate) sends the admin back to the sign-in screen instead of showing broken pages.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(undefined, (error) => {
  const url: string = error?.config?.url ?? "";
  if (axios.isAxiosError(error) && error.response?.status === 401 && !url.startsWith("/auth/")) {
    onUnauthorized?.();
  }
  return Promise.reject(error);
});

export const isCancel = (err: unknown) => axios.isCancel(err);

export const getErrorMessage = (err: unknown) => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Can't reach the server. Is the backend running?";
    return err.response.data?.message || "Request failed";
  }
  return "Something went wrong";
};

/** Field-level errors from a 400/409 response, if the server sent any. */
export const getFieldErrors = (err: unknown): FieldErrors => {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object") {
    return (err.response.data as { errors?: FieldErrors }).errors ?? {};
  }
  return {};
};
