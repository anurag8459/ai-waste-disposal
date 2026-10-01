const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = 5000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.5-flash-lite";

// --------------------------------------------------
// BASIC SETUP
// --------------------------------------------------

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// --------------------------------------------------
// UPLOAD FOLDER
// --------------------------------------------------

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --------------------------------------------------
// MULTER
// --------------------------------------------------

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function(req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 100000) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function(req, file, cb) {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, PNG and WEBP images are allowed."
                )
            );
        }
    }
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", function(req, res) {

    res.json({
        success: true,
        message: "AI Waste Disposal Server is running.",
        model: GEMINI_MODEL
    });

});

// --------------------------------------------------
// AI ANALYSIS
// --------------------------------------------------

app.post(
    "/api/analyze",
    upload.single("wasteImage"),
    async function(req, res) {

        let uploadedFile = null;

        try {

            console.log("");
            console.log("=======================================");
            console.log("Analyzing waste image...");
            console.log("=======================================");

            // ------------------------------------------
            // CHECK API KEY
            // ------------------------------------------

            if (!GEMINI_API_KEY ||
                GEMINI_API_KEY === "PASTE_YOUR_KEY_HERE"
            ) {

                return res.status(500).json({
                    success: false,
                    message: "Gemini API key is missing. Check server/.env"
                });

            }

            // ------------------------------------------
            // CHECK IMAGE
            // ------------------------------------------

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message: "Please upload an image."
                });

            }

            uploadedFile = req.file.path;

            console.log(
                "Image:",
                req.file.originalname
            );

            console.log(
                "Model:",
                GEMINI_MODEL
            );

            // ------------------------------------------
            // READ IMAGE
            // ------------------------------------------

            const imageBuffer =
                fs.readFileSync(uploadedFile);

            const base64Image =
                imageBuffer.toString("base64");

            // ------------------------------------------
            // AI PROMPT
            // ------------------------------------------

            const prompt = `
You are an AI waste disposal assistant.

Analyze the uploaded image and identify the main waste item.

Return ONLY valid JSON.
Do not use markdown.
Do not add any text outside the JSON.

Use exactly this structure:

{
  "wasteName": "name of the waste item",
  "wasteCategory": "one of: Wet Waste, Dry Waste, E-Waste, Hazardous Waste, Medical Waste, Recyclable Waste, Other",
  "confidence": "percentage such as 95%",
  "bin": "recommended bin or collection category",
  "disposalMethod": "simple practical disposal instructions",
  "recycling": "whether it can be recycled and how",
  "safety": "important safety precaution if applicable",
  "environmentImpact": "brief environmental impact if improperly disposed"
}

Rules:
- Identify only what is visible in the image.
- Keep the answer practical and concise.
- Do not invent details.
- Give simple instructions suitable for a normal household.
- Mention special disposal requirements for hazardous, electronic or medical waste.
`;

            // ------------------------------------------
            // GEMINI API URL
            // ------------------------------------------

            const apiUrl =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                GEMINI_MODEL +
                ":generateContent?key=" +
                GEMINI_API_KEY;

            // ------------------------------------------
            // GEMINI REQUEST
            // ------------------------------------------

            console.log(
                "Sending image to Gemini..."
            );

            const response =
                await fetch(
                    apiUrl, {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            contents: [{
                                parts: [

                                    {
                                        text: prompt
                                    },

                                    {
                                        inline_data: {
                                            mime_type: req.file.mimetype,

                                            data: base64Image
                                        }
                                    }

                                ]
                            }],

                            generationConfig: {

                                temperature: 0.2,

                                responseMimeType: "application/json"

                            }

                        })
                    }
                );

            const data =
                await response.json();

            // ------------------------------------------
            // HANDLE GEMINI ERROR
            // ------------------------------------------

            if (!response.ok) {

                console.error(
                    "Gemini error:",
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );

                let errorMessage =
                    "Gemini could not analyze the image.";

                if (
                    data &&
                    data.error &&
                    data.error.message
                ) {

                    errorMessage =
                        data.error.message;

                }

                return res.status(502).json({
                    success: false,
                    message: errorMessage
                });

            }

            // ------------------------------------------
            // GET AI RESPONSE
            // ------------------------------------------

            if (!data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts ||
                !data.candidates[0].content.parts[0]
            ) {

                console.error(
                    "Invalid Gemini response:",
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );

                return res.status(502).json({
                    success: false,
                    message: "Gemini returned an empty response."
                });

            }

            const aiText =
                data.candidates[0]
                .content
                .parts[0]
                .text;

            console.log(
                "Gemini response received."
            );

            // ------------------------------------------
            // CLEAN RESPONSE
            // ------------------------------------------

            let cleanedText =
                aiText.trim();

            if (
                cleanedText.startsWith("```json")
            ) {

                cleanedText =
                    cleanedText
                    .replace(
                        /^```json/,
                        ""
                    )
                    .replace(
                        /```$/,
                        ""
                    )
                    .trim();

            } else if (
                cleanedText.startsWith("```")
            ) {

                cleanedText =
                    cleanedText
                    .replace(
                        /^```/,
                        ""
                    )
                    .replace(
                        /```$/,
                        ""
                    )
                    .trim();

            }

            // ------------------------------------------
            // PARSE JSON
            // ------------------------------------------

            let result;

            try {

                result =
                    JSON.parse(cleanedText);

            } catch (error) {

                console.error(
                    "Could not parse AI response:"
                );

                console.error(
                    aiText
                );

                return res.status(502).json({
                    success: false,
                    message: "AI returned an invalid response format."
                });

            }

            // ------------------------------------------
            // SUCCESS
            // ------------------------------------------

            console.log("");
            console.log(
                "AI analysis completed successfully."
            );

            console.log(
                "Waste:",
                result.wasteName
            );

            console.log(
                "Category:",
                result.wasteCategory
            );

            console.log(
                "Confidence:",
                result.confidence
            );

            console.log("");

            return res.json({

                success: true,

                result: result

            });

        } catch (error) {

            console.error("");
            console.error(
                "SERVER ERROR:"
            );

            console.error(
                error.message
            );

            return res.status(500).json({

                success: false,

                message: error.message ||
                    "Something went wrong."

            });

        } finally {

            // ------------------------------------------
            // DELETE TEMPORARY IMAGE
            // ------------------------------------------

            if (
                uploadedFile &&
                fs.existsSync(uploadedFile)
            ) {

                try {

                    fs.unlinkSync(
                        uploadedFile
                    );

                    console.log(
                        "Temporary image deleted."
                    );

                } catch (error) {

                    console.error(
                        "Could not delete temporary image."
                    );

                }

            }

        }

    }
);

// --------------------------------------------------
// UPLOAD ERROR HANDLER
// --------------------------------------------------

app.use(
    function(error, req, res, next) {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message: "Image must be smaller than 5 MB."

                });

            }

        }

        if (error) {

            return res.status(400).json({

                success: false,

                message: error.message

            });

        }

        next();

    }
);

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(
    PORT,
    function() {

        console.log("");
        console.log(
            "======================================="
        );

        console.log(
            "      AI WASTE DISPOSAL SYSTEM"
        );

        console.log(
            "======================================="
        );

        console.log(
            "Server running at http://localhost:" +
            PORT
        );

        console.log(
            "Gemini model: " +
            GEMINI_MODEL
        );

        console.log(
            "======================================="
        );

        console.log("");

    }
);