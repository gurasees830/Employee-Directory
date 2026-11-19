import { api } from "./client";

export interface Admin {
  id: number;
  name: string;
  email: string;
}

export const login = async (email: string, password: string) => {
  const res = await api.post<{ admin: Admin }>("/auth/login", { email, password });
  return res.data.admin;
};

export const logout = async () => {
  await api.post("/auth/logout");
};

/** The signed-in admin, or a 401 error if there's no valid session. */
export const getCurrentAdmin = async () => {
  const res = await api.get<{ admin: Admin }>("/auth/me");
  return res.data.admin;
};
