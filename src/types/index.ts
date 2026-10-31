// Tipe data SIPANDU, mengikuti ERD.
// Nama field snake_case supaya sama dengan kolom database nanti.

export type Role = "warga" | "rt" | "rw";

// Alur: diajukan -> (RT) diteruskan / ditolak -> (RW) diproses -> selesai
// CATATAN: daftar status ini belum ada di ERD, sepakati dengan tim backend.
export type ComplaintStatus =
  | "diajukan"
  | "diteruskan"
  | "ditolak"
  | "diproses"
  | "selesai";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  rt_number: number | null;
  phone: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Complaint {
  id: string;
  ticket_number: string;
  user_id: string;
  category_id: string;
  rt_number: number;
  title: string;
  location_description: string;
  description: string;
  photo_path: string | null;
  completion_photo_path: string | null;
  status: ComplaintStatus;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  changed_by: string;
  status: ComplaintStatus;
  note: string | null;
  created_at: string;
}
