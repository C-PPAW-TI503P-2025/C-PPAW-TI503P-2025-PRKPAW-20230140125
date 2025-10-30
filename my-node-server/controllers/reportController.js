const presensiRecords = require("../data/presensiData");
const { Presensi } = require("../models");
const { Op } = require("sequelize");

exports.getDailyReport = async (req, res) => {
  try {
    const { nama, tanggalMulai, tanggalSelesai } = req.query;

    // pilih field tanggal (opsional: kirim ?tanggalField=createdAt)
    let dateField = req.query.tanggalField || "tanggal";

    // safe fallback: jika model tidak punya field 'tanggal', gunakan createdAt
    if (!Presensi.rawAttributes || !Presensi.rawAttributes[dateField]) {
      dateField = "createdAt";
    }

    let options = { where: {} };

    // filter nama (jika ada)
    if (nama) {
      options.where.nama = {
        [Op.like]: `%${nama}%`,
      };
    }

    // helper: parse tanggal (mengembalikan Date atau null)
    const parseDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };

    const startDate = parseDate(tanggalMulai);
    let endDate = parseDate(tanggalSelesai);

    // validasi format tanggal
    if ((tanggalMulai && !startDate) || (tanggalSelesai && !endDate)) {
      return res.status(400).json({
        message:
          "Format tanggal tidak valid. Gunakan ISO atau YYYY-MM-DD untuk tanggalMulai / tanggalSelesai.",
      });
    }

    // jika ada endDate, set ke akhir hari agar inklusif
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    // bangun kondisi tanggal
    if (startDate && endDate) {
      // gunakan between
      options.where[dateField] = {
        [Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      options.where[dateField] = {
        [Op.gte]: startDate,
      };
    } else if (endDate) {
      options.where[dateField] = {
        [Op.lte]: endDate,
      };
    }

    const records = await Presensi.findAll(options);

    res.json({
      reportDate: new Date().toLocaleDateString(),
      filter: {
        nama: nama || null,
        tanggalField,
        tanggalMulai: tanggalMulai || null,
        tanggalSelesai: tanggalSelesai || null,
      },
      data: records,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mengambil laporan", error: error.message });
  }
};
