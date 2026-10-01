const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const uploadContent = document.getElementById("uploadContent");
const chooseFileButton = document.getElementById("chooseFileButton");

const previewContainer = document.getElementById("previewContainer");
const imagePreview = document.getElementById("imagePreview");
const removeImageButton = document.getElementById("removeImage");

const analyzeButton = document.getElementById("analyzeButton");
const analyzeButtonText = document.getElementById("analyzeButtonText");

const loadingState = document.getElementById("loadingState");
const loadingTitle = document.getElementById("loadingTitle");
const loadingText = document.getElementById("loadingText");

const errorMessage = document.getElementById("errorMessage");

const resultsSection = document.getElementById("results");
const analyzeAnotherButton = document.getElementById("analyzeAnother");

const wasteName = document.getElementById("wasteName");
const wasteCategory = document.getElementById("wasteCategory");
const confidence = document.getElementById("confidence");
const confidenceBar = document.getElementById("confidenceBar");
const recommendedBin = document.getElementById("recommendedBin");

const disposalMethod = document.getElementById("disposalMethod");
const recycling = document.getElementById("recycling");
const safety = document.getElementById("safety");
const environmentImpact = document.getElementById("environmentImpact");


let selectedFile = null;


// ==========================================
// FILE SELECTION
// ==========================================

chooseFileButton.addEventListener(
    "click",
    function() {

        fileInput.click();

    }
);


fileInput.addEventListener(
    "change",
    function(event) {

        const file =
            event.target.files[0];

        if (file) {

            handleFile(file);

        }

    }
);


// ==========================================
// HANDLE FILE
// ==========================================

function handleFile(file) {

    hideError();


    // Check file type

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {

        showError(
            "Please choose a JPG, PNG or WEBP image."
        );

        return;

    }


    // Check file size

    const maxSize =
        5 * 1024 * 1024;


    if (file.size > maxSize) {

        showError(
            "Your image is larger than 5 MB. Please choose a smaller image."
        );

        return;

    }


    selectedFile = file;


    // Create preview

    const reader =
        new FileReader();


    reader.onload = function(event) {

        imagePreview.src =
            event.target.result;


        uploadContent.style.display =
            "none";


        previewContainer.classList.add(
            "active"
        );


        analyzeButton.disabled =
            false;


        analyzeButtonText.textContent =
            "Analyze my waste";


        uploadArea.classList.remove(
            "dragover"
        );

    };


    reader.readAsDataURL(file);

}


// ==========================================
// DRAG & DROP
// ==========================================

uploadArea.addEventListener(
    "dragover",
    function(event) {

        event.preventDefault();

        uploadArea.classList.add(
            "dragover"
        );

    }
);


uploadArea.addEventListener(
    "dragleave",
    function() {

        uploadArea.classList.remove(
            "dragover"
        );

    }
);


uploadArea.addEventListener(
    "drop",
    function(event) {

        event.preventDefault();

        uploadArea.classList.remove(
            "dragover"
        );


        const file =
            event.dataTransfer.files[0];


        if (file) {

            handleFile(file);

        }

    }
);


// ==========================================
// REMOVE IMAGE
// ==========================================

removeImageButton.addEventListener(
    "click",
    function(event) {

        event.stopPropagation();

        resetUploader();

    }
);


// ==========================================
// ANALYZE IMAGE
// ==========================================

analyzeButton.addEventListener(
    "click",
    async function() {

        if (!selectedFile) {

            showError(
                "Please choose an image first."
            );

            return;

        }


        hideError();


        // Hide previous results

        resultsSection.classList.remove(
            "visible"
        );


        // Disable button

        analyzeButton.disabled =
            true;


        analyzeButtonText.textContent =
            "Analyzing...";


        // Show loading

        loadingState.classList.add(
            "active"
        );


        // Friendly loading messages

        loadingTitle.textContent =
            "Looking at your waste...";


        loadingText.textContent =
            "Identifying the item and its material.";


        const formData =
            new FormData();


        formData.append(
            "wasteImage",
            selectedFile
        );


        try {

            // Change loading message after a short delay

            const loadingTimer =
                setTimeout(
                    function() {

                        loadingTitle.textContent =
                            "Figuring out where it belongs...";

                        loadingText.textContent =
                            "Checking disposal and recycling options.";

                    },
                    2500
                );


            const secondLoadingTimer =
                setTimeout(
                    function() {

                        loadingTitle.textContent =
                            "Almost there...";

                        loadingText.textContent =
                            "Putting together your waste guide.";

                    },
                    5000
                );


            // Send image to backend

            const response =
                await fetch(
                    "/api/analyze", {
                        method: "POST",
                        body: formData
                    }
                );


            clearTimeout(
                loadingTimer
            );


            clearTimeout(
                secondLoadingTimer
            );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to analyze the image."
                );

            }


            if (!data.success ||
                !data.result
            ) {

                throw new Error(
                    "The AI did not return a valid result."
                );

            }


            // Display result

            displayResults(
                data.result
            );


        } catch (error) {

            console.error(
                "Analysis Error:",
                error
            );


            showError(
                error.message ||
                "Something went wrong. Please try again."
            );


            analyzeButton.disabled =
                false;


            analyzeButtonText.textContent =
                "Try again";


        } finally {

            loadingState.classList.remove(
                "active"
            );

        }

    }
);


// ==========================================
// DISPLAY RESULTS
// ==========================================

function displayResults(result) {

    // Waste name

    wasteName.textContent =
        result.wasteName ||
        "Unknown waste item";


    // Category

    wasteCategory.textContent =
        result.wasteCategory ||
        "Other";


    // Confidence

    let confidenceValue =
        parseInt(
            result.confidence,
            10
        );


    if (isNaN(confidenceValue)) {

        confidenceValue =
            0;

    }


    confidenceValue =
        Math.max(
            0,
            Math.min(
                100,
                confidenceValue
            )
        );


    confidence.textContent =
        confidenceValue + "%";


    // Animate confidence bar

    confidenceBar.style.width =
        "0%";


    setTimeout(
        function() {

            confidenceBar.style.width =
                confidenceValue + "%";

        },
        100
    );


    // Recommended bin

    recommendedBin.textContent =
        result.bin ||
        result.recommendedBin ||
        "Check local waste collection guidance";


    // Disposal

    disposalMethod.textContent =
        result.disposalMethod ||
        "No disposal instructions were provided.";


    // Recycling

    recycling.textContent =
        result.recycling ||
        "No recycling information was provided.";


    // Safety

    safety.textContent =
        result.safety ||
        "Handle the item carefully and follow local waste guidelines.";


    // Environmental impact

    environmentImpact.textContent =
        result.environmentImpact ||
        "Proper disposal helps reduce waste and environmental pollution.";


    // Show results

    resultsSection.classList.add(
        "visible"
    );


    // Scroll to results

    setTimeout(
        function() {

            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        },
        150
    );


    // Reset button state

    analyzeButton.disabled =
        false;


    analyzeButtonText.textContent =
        "Analyze again";

}


// ==========================================
// ANALYZE ANOTHER
// ==========================================

analyzeAnotherButton.addEventListener(
    "click",
    function() {

        resultsSection.classList.remove(
            "visible"
        );


        resetUploader();


        window.scrollTo({
            top: document.getElementById(
                "scanner"
            ).offsetTop - 80,

            behavior: "smooth"

        });

    }
);


// ==========================================
// RESET UPLOADER
// ==========================================

function resetUploader() {

    selectedFile =
        null;


    fileInput.value =
        "";


    imagePreview.src =
        "";


    previewContainer.classList.remove(
        "active"
    );


    uploadContent.style.display =
        "";


    analyzeButton.disabled =
        true;


    analyzeButtonText.textContent =
        "Analyze my waste";


    loadingState.classList.remove(
        "active"
    );


    hideError();

}


// ==========================================
// ERROR MESSAGE
// ==========================================

function showError(message) {

    const errorText =
        errorMessage.querySelector("p");


    errorText.textContent =
        message;


    errorMessage.classList.add(
        "active"
    );

}


function hideError() {

    errorMessage.classList.remove(
        "active"
    );

}


// ==========================================
// KEYBOARD ACCESSIBILITY
// ==========================================

uploadArea.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            fileInput.click();

        }

    }
);