import multer, { diskStorage } from "multer";

const storage = diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/temp");
    },

    filename: (req, file, cb) => {
        const suffix = Date.now() + "-" + Math.round(Math.random * 1E9);
        cb(null, file.fieldname + "-" + suffix);
    }
});

export const upload = multer({ storage: storage });
