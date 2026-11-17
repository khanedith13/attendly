import api from "../api/axios";

export async function getAccount() {
  const { data } = await api.get("/account");

  return data;
}

export async function saveAccount(user, values) {
  await api.put("/account", values);
}

export async function updatePassword(user, values) {
  await api.put("/account/password", values);
}