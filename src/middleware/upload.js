const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,

  params: {
    folder: "uploads",                 // cloud folder name
    allowed_formats: ["jpg", "png", "jpeg", "webp","HEIC"],
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 4 * 1024 * 1024,       
  },
});

module.exports = upload;
