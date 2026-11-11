const { v2: cloudinary } = require("cloudinary");

const settings = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};

if (Object.values(settings).some((value) => !value?.trim())) {
    throw new Error("Cloudinary configuration is missing in backend/.env.");
}

cloudinary.config({
    ...settings,
    secure: true,
});

module.exports = cloudinary;
