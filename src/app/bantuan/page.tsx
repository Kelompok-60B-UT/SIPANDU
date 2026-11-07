import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Clock,
  FileCheck2,
  Headset,
  HelpCircle,
  Info,
  MapPin,
  PhoneCall,
  ShieldCheck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionHeading from "@/components/ui/SectionHeading";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Pusat Bantuan & Panduan Layanan — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Panduan resmi penggunaan aplikasi ${siteConfig.appName}, alur status pengaduan warga, panduan pengurus RT/RW, dan jawaban atas pertanyaan umum (FAQ) wilayah ${siteConfig.rwLabel}.`,
};

const FAQ_ITEMS = [
  {
    question: "Mengapa saya belum bisa membuat pengaduan setelah mendaftar?",
    answer:
      "Untuk menjaga keamanan dan keabsahan data lingkungan, akun warga baru wajib diverifikasi terlebih dahulu oleh Ketua RT di wilayah domisili Anda. Setelah Ketua RT menyetujui akun Anda, formulir pembuatan pengaduan akan otomatis aktif.",
  },
  {
    question: "Apakah warga lain dapat melihat detail data pribadi saya?",
    answer:
      "Tidak. Data pribadi seperti alamat lengkap dan nomor telepon hanya dapat diakses oleh pelapor sendiri, Ketua RT di wilayah terkait, Ketua RW, dan Administrator. Rekapitulasi di halaman depan hanya menampilkan ringkasan pengaduan dan kategori secara anonim.",
  },
  {
    question: "Berapa batas foto dan format berkas yang diperbolehkan?",
    answer:
      "Anda dapat mengunggah hingga maksimal 5 foto pendukung per pengaduan. Format yang didukung adalah JPEG, PNG, dan WebP dengan ukuran maksimal 5 MB untuk setiap berkas foto.",
  },
  {
    question: "Apa yang harus saya lakukan jika pengaduan saya ditolak?",
    answer:
      "Buka halaman detail pengaduan untuk membaca catatan alasan penolakan dari Ketua RT (misalnya: data kurang lengkap, bukan wewenang lingkungan RW, atau duplikat laporan). Anda dapat melengkapi informasi yang dibutuhkan lalu mengajukan pengaduan baru yang lebih jelas.",
  },
  {
    question: "Apakah ada biaya dalam menggunakan layanan SIPANDU?",
    answer:
      `Tidak ada biaya sama sekali. Aplikasi ${siteConfig.appName} disediakan sebagai fasilitas layanan publik mandiri untuk memudahkan komunikasi warga dan pengurus ${siteConfig.rwLabel}.`,
  },
  {
    question: "Bagaimana cara mengubah nomor telepon atau kata sandi akun?",
    answer:
      "Masuk ke akun Anda, lalu buka menu 'Profil saya' di sidebar atau klik profil di pojok kanan atas. Pada halaman tersebut Anda dapat memperbarui data kontak serta mengganti kata sandi kapan saja.",
  },
];

const STATUS_FLOWS = [
  {
    step: "01",
    status: "Terkirim",
    badgeClass: "bg-blue-100 text-blue-700",
    role: "Warga",
    desc: "Laporan baru berhasil diajukan oleh warga terverifikasi dan masuk ke antrean pemeriksaan Ketua RT setempat.",
  },
  {
    step: "02",
    status: "Diverifikasi RT",
    badgeClass: "bg-purple-100 text-purple-700",
    role: "Ketua RT",
    desc: "Ketua RT meninjau keabsahan lokasi dan urgensi laporan, lalu meneruskannya ke tingkat RW untuk tindakan lapangan.",
  },
  {
    step: "03",
    status: "Diproses RW",
    badgeClass: "bg-amber-100 text-amber-700",
    role: "Ketua RW",
    desc: "Pengurus RW mengoordinasikan eksekusi penanganan di lapangan, menetapkan perkiraan waktu pengerjaan, dan mencatat progres.",
  },
  {
    step: "04",
    status: "Selesai",
    badgeClass: "bg-green-100 text-green-700",
    role: "Ketua RW",
    desc: "Permasalahan tuntas ditangani di lapangan, dilengkapi dokumentasi foto bukti penyelesaian dan catatan penanganan akhir.",
  },
  {
    step: "05",
    status: "Ditolak",
    badgeClass: "bg-red-100 text-red-700",
    role: "Ketua RT",
    desc: "Laporan tidak dapat ditindaklanjuti karena tidak valid, berada di luar wilayah, atau duplikat, disertai catatan alasan penolakan tertulis.",
  },
];

const WARGA_STEPS = [
  {
    no: "01",
    title: "Daftar & Verifikasi RT",
    text: "Buat akun melalui menu Daftar warga dengan memilih RT domisili Anda. Tunggu persetujuan Ketua RT agar akun dapat membuat laporan.",
  },
  {
    no: "02",
    title: "Buat Pengaduan Lengkap",
    text: "Pilih kategori masalah, cantumkan patokan lokasi (landmark) yang jelas, dan unggah hingga 5 foto pendukung (maks. 5 MB per berkas).",
  },
  {
    no: "03",
    title: "Pantau Lini Masa",
    text: "Pantau perkembangan status pengaduan di menu Pengaduan saya secara berkala. Setiap catatan RT dan tindakan RW tercatat transparan.",
  },
  {
    no: "04",
    title: "Rating & Testimoni",
    text: "Setelah pengaduan dinyatakan Selesai oleh Ketua RW, berikan penilaian bintang 1–5 dan ulasan umpan balik terhadap hasil pekerjaan.",
  },
];

export default function BantuanPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1 text-ink">
        {/* Header Hero Section */}
        <section className="border-b border-border bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Beranda</span>
            </Link>

            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-semibold text-primary">
                <HelpCircle size={14} />
                <span>Pusat Bantuan & Panduan Layanan</span>
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
              Bagaimana kami dapat membantu Anda?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              Panduan terintegrasi penggunaan platform {siteConfig.appName} bagi warga dan pengurus lingkungan {siteConfig.rwLabel}. Pelajari tata cara pengaduan, arti status tindak lanjut, hingga saluran komunikasi langsung.
            </p>

            {/* Navigasi Cepat Kategori */}
            <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3">
              <a
                href="#panduan-warga"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <Users size={15} />
                <span>Panduan Warga</span>
              </a>
              <a
                href="#alur-status"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <FileCheck2 size={15} />
                <span>Status & Alur Pengaduan</span>
              </a>
              <a
                href="#panduan-pengurus"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <ShieldCheck size={15} />
                <span>Panduan Pengurus</span>
              </a>
              <a
                href="#faq"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <HelpCircle size={15} />
                <span>Tanya Jawab (FAQ)</span>
              </a>
              <a
                href="#hubungi-pengurus"
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-blue-100"
              >
                <Headset size={15} />
                <span>Hubungi Pengurus</span>
              </a>
            </div>
          </div>
        </section>

        {/* Section 1: Panduan Warga */}
        <section id="panduan-warga" className="scroll-mt-20 border-b border-border bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <SectionHeading
              label="PANDUAN WARGA"
              title="Langkah Mudah Menyampaikan Pengaduan"
              description="Tata cara pendaftaran akun, pembuatan laporan, pemantauan status tindak lanjut, hingga penilaian layanan."
            />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {WARGA_STEPS.map((step) => (
                <div
                  key={step.no}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-7 transition-colors hover:border-primary/40"
                >
                  <div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-xs">
                      {step.no}
                    </span>
                    <h3 className="mt-4 text-base font-bold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Banner Profil & Keamanan Akun */}
            <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-blue-100 bg-[#F4F8FF] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-xs">
                  <UserCheck size={22} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink sm:text-base">
                    Kelola Profil & Keamanan Akun Anda
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">
                    Perbarui nomor kontak aktif, foto profil, dan alamat domisili di halaman Profil saya. Ubah kata sandi secara berkala untuk menjaga keamanan akun Anda.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:text-sm"
              >
                Buka Profil Saya
              </Link>
            </div>
          </div>
        </section>

        {/* Section 2: Alur & Status Pengaduan */}
        <section id="alur-status" className="scroll-mt-20 border-b border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <SectionHeading
              label="ALUR & TRANSPARANSI"
              title="Arti Status dan Tahapan Tindak Lanjut"
              description="Setiap pengaduan melalui proses berjenjang yang akuntabel, mulai dari verifikasi tingkat RT hingga eksekusi penyelesaian di tingkat RW."
            />

            <div className="space-y-4">
              {STATUS_FLOWS.map((flow) => (
                <div
                  key={flow.status}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-6 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between sm:p-7"
                >
                  <div className="flex items-start gap-4 sm:items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface text-xs font-bold text-muted">
                      {flow.step}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${flow.badgeClass}`}
                        >
                          {flow.status}
                        </span>
                        <span className="text-xs font-medium text-muted">
                          Wewenang: <strong className="text-ink">{flow.role}</strong>
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                        {flow.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Panduan Pengurus */}
        <section id="panduan-pengurus" className="scroll-mt-20 border-b border-border bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <SectionHeading
              label="TATA KELOLA PENGURUS"
              title="Pembagian Peran & Kewenangan Bertingkat"
              description="Koordinasi terstruktur antara Ketua RT, Ketua RW, dan Administrator memastikan pelayanan warga tertib, cepat, dan terpercaya."
            />

            <div className="grid gap-6 md:grid-cols-3">
              {/* Kartu RT */}
              <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 transition-colors hover:border-primary/40">
                <div>
                  <div className="flex items-center gap-2.5 text-primary">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-xs">
                      <UserCheck size={18} />
                    </span>
                    <h3 className="text-base font-bold text-ink">Peran Ketua RT</h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">
                    Garda terdepan verifikasi lapangan di wilayah RT masing-masing.
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-border pt-4 text-xs leading-relaxed text-muted sm:text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Memvalidasi fakta laporan warga di wilayah RT domisili.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Meneruskan ke RW (<strong className="text-ink">Diverifikasi RT</strong>) atau menolak laporan tidak valid.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Menyetujui pendaftaran akun warga baru di RT bersangkutan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Tidak menangani eksekusi teknis RW atau penutupan status selesai.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Kartu RW */}
              <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 transition-colors hover:border-primary/40">
                <div>
                  <div className="flex items-center gap-2.5 text-primary">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-xs">
                      <Wrench size={18} />
                    </span>
                    <h3 className="text-base font-bold text-ink">Peran Ketua RW</h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">
                    Koordinasi tindak lanjut operasional pengaduan lintas RT se-RW.
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-border pt-4 text-xs leading-relaxed text-muted sm:text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Menerima pengaduan yang telah diverifikasi oleh Ketua RT.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Memperbarui status menjadi <strong className="text-ink">Diproses RW</strong> dengan estimasi waktu.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Menyelesaikan pengaduan (<strong className="text-ink">Selesai</strong>) disertai bukti foto hasil penanganan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Mengunduh laporan rekapitulasi data pengaduan berkala.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Kartu Admin */}
              <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 transition-colors hover:border-primary/40">
                <div>
                  <div className="flex items-center gap-2.5 text-primary">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-xs">
                      <ShieldCheck size={18} />
                    </span>
                    <h3 className="text-base font-bold text-ink">Peran Administrator</h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">
                    Pengelolaan sistem, tata kelola akun, dan struktur wilayah.
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-border pt-4 text-xs leading-relaxed text-muted sm:text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Manajemen akun dan penugasan peran (Admin, RW, RT, Warga).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Penetapan Ketua RW aktif dan penetapan Ketua RT per wilayah.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Pengelolaan master kategori layanan pengaduan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>Pemantauan log catatan aktivitas audit sistem.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Tanya Jawab (FAQ) */}
        <section id="faq" className="scroll-mt-20 border-b border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <SectionHeading
              label="TANYA JAWAB (FAQ)"
              title="Pertanyaan yang Sering Diajukan"
              description="Jawaban atas pertanyaan seputar penggunaan akun, batas berkas, perlindungan privasi data warga, dan alur penolakan laporan."
            />

            <div className="space-y-4">
              {FAQ_ITEMS.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-border bg-white p-6 transition-colors hover:border-primary/40 sm:p-7"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-ink sm:text-base">
                    <span>{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-4 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted sm:text-sm">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Hubungi Pengurus */}
        <section id="hubungi-pengurus" className="scroll-mt-20 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <SectionHeading
              label="LAYANAN KONTAK"
              title="Hubungi Pengurus Lingkungan"
              description="Informasi sekretariat resmi dan saluran komunikasi langsung untuk asistensi warga."
            />

            <div className="grid gap-8 rounded-3xl border border-border bg-surface p-8 sm:p-10 lg:grid-cols-2 lg:p-12">
              {/* Info Kontak & Alamat */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    Sekretariat {siteConfig.rwLabel}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">
                    Memerlukan pendampingan langsung, asistensi verifikasi akun, atau konfirmasi berkas warga? Silakan kunjungi sekretariat atau hubungi nomor pengurus berikut:
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-xs sm:text-sm">
                  {/* Alamat Sekretariat */}
                  {siteConfig.contactAddress ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-ink">
                      <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                      <span className="leading-relaxed">{siteConfig.contactAddress}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-muted">
                      <Info size={18} className="mt-0.5 shrink-0 text-muted" />
                      <span className="leading-relaxed">
                        Alamat fisik sekretariat belum dikonfigurasi pada sistem. Silakan hubungi Ketua RT di wilayah domisili Anda untuk koordinasi langsung.
                      </span>
                    </div>
                  )}

                  {/* Telepon / WhatsApp */}
                  {siteConfig.contactPhone ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-ink">
                      <PhoneCall size={18} className="shrink-0 text-primary" />
                      <span className="font-semibold">{siteConfig.contactPhone}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-muted">
                      <PhoneCall size={18} className="shrink-0 text-muted" />
                      <span>Nomor kontak resmi sekretariat belum dikonfigurasi.</span>
                    </div>
                  )}

                  {/* Jam Operasional */}
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-muted">
                    <Clock size={18} className="shrink-0 text-primary" />
                    <span>Senin – Jumat: 08.00 – 16.00 WIB • Sabtu: 08.00 – 12.00 WIB</span>
                  </div>
                </div>
              </div>

              {/* Pemberitahuan Kondisi Darurat & Tombol Akses */}
              <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-[#F4F8FF] p-6 sm:p-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <AlertCircle size={18} />
                    <span>Pemberitahuan Keadaan Mendesak</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted sm:text-sm">
                    Aplikasi {siteConfig.appName} ditujukan untuk pengaduan fasilitas umum dan tata kelola warga. Untuk keadaan darurat (bencana alam, kebakaran, atau gangguan keamanan langsung), warga diimbau segera menghubungi pos keamanan lingkungan atau Ketua RT secara langsung.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-blue-100 pt-6 text-xs font-semibold sm:text-sm">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-white transition-colors hover:bg-primary-hover"
                  >
                    Masuk ke Akun
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-2.5 text-ink transition-colors hover:bg-surface"
                  >
                    Daftar Warga Baru
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
