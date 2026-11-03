import api from "../../lib/api.js";

export async function fetchStudents(params = {}) {
  const res = await api.get("/students", { params });
  return res.data;
}

export async function fetchStudent(id) {
  const res = await api.get(`/students/${id}`);
  return res.data;
}

export async function createStudent(input) {
  const res = await api.post("/students", input);
  return res.data.student;
}

export async function updateStudent(id, input) {
  const res = await api.put(`/students/${id}`, input);
  return res.data.student;
}

export async function deactivateStudentAccount(id) {
  const res = await api.delete(`/students/${id}`);
  return res.data;
}

export async function fetchBlocks() {
  const res = await api.get("/blocks");
  return res.data.data;
}

export async function fetchWardens() {
  const res = await api.get("/blocks/wardens");
  return res.data.data;
}

export async function createBlock(input) {
  const res = await api.post("/blocks", input);
  return res.data.block;
}

export async function updateBlock(id, input) {
  const res = await api.put(`/blocks/${id}`, input);
  return res.data.block;
}

export async function deleteBlock(id) {
  const res = await api.delete(`/blocks/${id}`);
  return res.data;
}

export async function fetchRooms(params = {}) {
  const res = await api.get("/rooms", { params });
  return res.data.data;
}

export async function fetchRoom(id) {
  const res = await api.get(`/rooms/${id}`);
  return res.data;
}

export async function createRoom(input) {
  const res = await api.post("/rooms", input);
  return res.data.room;
}

export async function updateRoom(id, input) {
  const res = await api.put(`/rooms/${id}`, input);
  return res.data.room;
}

export async function deleteRoom(id) {
  const res = await api.delete(`/rooms/${id}`);
  return res.data;
}

export async function allocateBed(roomId, studentId, remarks = "") {
  const res = await api.post(`/rooms/${roomId}/allocate`, { student: studentId, remarks });
  return res.data;
}

export async function transferBed(roomId, studentId, remarks = "") {
  const res = await api.post(`/rooms/${roomId}/transfer`, { student: studentId, remarks });
  return res.data;
}

export async function releaseBed(roomId, studentId, remarks = "") {
  const res = await api.post(`/rooms/${roomId}/vacate`, { student: studentId, remarks });
  return res.data;
}

export async function fetchAllocationHistory() {
  const res = await api.get("/rooms/history");
  return res.data.history || [];
}

export async function fetchDashboardStats() {
  const res = await api.get("/dashboard/stats");
  return res.data;
}

export async function fetchFees(params = {}) {
  const res = await api.get("/fees", { params });
  return res.data.data;
}

export async function fetchFeeSummary() {
  const res = await api.get("/fees/summary");
  return res.data.summary;
}

export async function createFee(input) {
  const res = await api.post("/fees", input);
  return res.data.payment;
}

export async function simulatePayment(feeId, amount, method = "upi") {
  const res = await api.post(`/fees/${feeId}/simulate`, { amount, method });
  return res.data;
}

export async function deleteFee(id) {
  const res = await api.delete(`/fees/${id}`);
  return res.data;
}

