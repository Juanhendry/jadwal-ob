// src/lib/jadwal-utils.js
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns'
import { id } from 'date-fns/locale'

// Siklus 6 hari: 2 pagi, 2 malam, 2 libur
const SIKLUS = ['pagi', 'pagi', 'malam', 'malam', 'libur', 'libur']

/**
 * Hitung shift OB untuk tanggal tertentu
 * @param {number} offsetOb - offset siklus OB (0, 2, 4 untuk 3 OB)
 * @param {Date} tanggal - tanggal yang dicek
 * @param {Date} tanggalMulai - tanggal awal siklus (biasanya awal tahun/awal tracking)
 */
export function hitungShift(offsetOb, tanggal, tanggalMulai = new Date('2024-01-01')) {
  const msPerHari = 24 * 60 * 60 * 1000
  const selisihHari = Math.floor((tanggal - tanggalMulai) / msPerHari)
  const indexSiklus = (selisihHari + offsetOb) % 6
  return SIKLUS[(indexSiklus + 6) % 6]
}

/**
 * Generate jadwal 1 bulan untuk semua OB
 * @param {Array} obList - array of {id, nama, offset}
 * @param {number} tahun
 * @param {number} bulan - 1-12
 */
export function generateJadwalBulan(obList, tahun, bulan) {
  const jumlahHari = getDaysInMonth(new Date(tahun, bulan - 1))
  const tanggalMulai = new Date('2024-01-01')
  const jadwal = []

  for (let hari = 1; hari <= jumlahHari; hari++) {
    const tanggal = new Date(tahun, bulan - 1, hari)

    for (const ob of obList) {
      const shift = hitungShift(ob.offset, tanggal, tanggalMulai)
      jadwal.push({
        ob_id: ob.id,
        tanggal: format(tanggal, 'yyyy-MM-dd'),
        shift,
        is_override: false,
      })
    }
  }

  return jadwal
}

/**
 * Tentukan offset default untuk OB berdasarkan urutan index (0,1,2)
 * OB pertama: offset 0
 * OB kedua: offset 2
 * OB ketiga: offset 4
 */
export function getOffsetDefault(index) {
  return (index * 2) % 6
}

/**
 * Format tanggal ke Bahasa Indonesia
 */
export function formatTanggalID(tanggal) {
  return format(new Date(tanggal), 'EEEE, dd MMMM yyyy', { locale: id })
}

/**
 * Format bulan ke Bahasa Indonesia
 */
export function formatBulanID(tahun, bulan) {
  return format(new Date(tahun, bulan - 1), 'MMMM yyyy', { locale: id })
}

/**
 * Cek apakah OB available untuk menggantikan
 * Returns: 'bisa' | 'shift_malam' | 'libur' | 'sama_shift'
 */
export function cekKetersediaan(shiftObPengganti) {
  if (shiftObPengganti === 'libur') return 'libur'
  if (shiftObPengganti === 'malam') return 'shift_malam'
  return 'sama_shift'
}

/**
 * Label badge shift
 */
export function shiftLabel(shift) {
  const map = {
    pagi: { label: 'Pagi', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    malam: { label: 'Malam', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    libur: { label: 'Libur', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  }
  return map[shift] || { label: shift, color: 'bg-gray-100 text-gray-500' }
}

/**
 * Jam shift
 */
export function jamShift(shift) {
  if (shift === 'pagi') return '06:00 – 14:00'
  if (shift === 'malam') return '14:00 – 22:00'
  return '–'
}
