// Modified JS: preloads apikeys and attaches apiKey to each ai object
const inputs = [];
const masterInput = document.querySelector(".multipleInput");
const emptyMessage = document.querySelector(".emptyMessage");

// global map of api keys (name -> api_key)
let API_KEYS = {};

document.addEventListener("DOMContentLoaded", async function () {
    emptyMessage.style.display = "block";
    emptyMessage.textContent = "Loading...";

    const gathering = document.querySelector(".gathering");
    const addBtn = document.querySelector(".add");
    const aiList = [];

    // Load API keys first
    await loadApiKeys();

    await obtainAiList(aiList);

    // attach apiKey to each ai (normalize by lowercasing names)
    aiList.forEach(ai => {
        const key = (ai.name || "").toLowerCase();
        ai.apiKey = API_KEYS[key] || "";
    });

    aiList.forEach((ai, index) => createContainer(ai, index, gathering));

    if (gathering.children.length === 0) {
        emptyMessage.textContent = "No models introduced yet";
    } else {
        emptyMessage.style.display = "none";
    }

    // Attach add button listener here
    if (addBtn) {
        addBtn.addEventListener("click", handleAdd);
    } else {
        console.error("Add button not found in DOM");
    }
});

// --- load API keys from A.I.s/apikeys.json into API_KEYS map
async function loadApiKeys() {
    try {
        const res = await fetch("A.I.s/apikeys.json");
        if (!res.ok) {
            console.warn("Could not fetch apikeys.json:", res.status);
            return;
        }
        const list = await res.json(); // expected array [{name, api_key}, ...]
        list.forEach(entry => {
            if (entry && entry.name) {
                API_KEYS[entry.name.toLowerCase()] = entry.api_key || "";
            }
        });
    } catch (err) {
        console.error("Error loading apikeys.json:", err);
    }
}

async function obtainAiList(aiList) {
    try {
        const res = await fetch('A.I.s/manifest.json');
        if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
        const folders = await res.json();

        const loaders = folders.map(async (folder) => {
            const infoRes = await fetch(`A.I.s/${folder}/info.json`);
            if (!infoRes.ok) return;

            const info = await infoRes.json();
            // ensure name exists; fallback to folder name
            info.name = info.name || folder;
            info.avatar = `A.I.s/${folder}/image.svg`;
            aiList.push(info);
        });

        await Promise.all(loaders);
    } catch (err) {
        console.error("Error obtaining AI list:", err);
    }
}

function createContainer(ai, index, gathering) {
    const container = document.createElement("div");
    container.classList.add("container");

    const img = document.createElement("img");
    img.src = `../Images/mage.svg`;
    img.alt = ai.name;
    img.classList.add("mage");
    container.appendChild(img);

    const dot = document.createElement("img");
    dot.classList.add("dot");
    dot.src = ai.avatar;
    dot.alt = ai.name; // set alt so we can match/update later
    dot.addEventListener("click", () => handleExit(index, ai.url));
    container.appendChild(dot);

    const feedback = document.createElement("p");
    feedback.classList.add("feedback");
    feedback.textContent = "";
    container.appendChild(feedback);

    const input = document.createElement("textarea");
    input.classList.add("input");
    input.placeholder = "Type here to command this specific instance.";
    input.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const request = { string: input.value.trim(), name: ai.name };
            await sendRequest(request, feedback);
            input.value = "";
        }
    });
    container.appendChild(input);
    inputs.push(input);

    const settings = document.createElement("span");
    settings.classList.add("settings");
    settings.addEventListener("click", () => handleSettings(index, ai));
    container.appendChild(settings);

    const door = document.createElement("span");
    door.classList.add("door");
    door.addEventListener("click", () => handleExit(index, ai.url));
    container.appendChild(door);

    gathering.appendChild(container);
}

async function sendRequest(request, feedback) {
    try {
        const res = await fetch('/api/AIrequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        if (!res.ok) {
            feedback.textContent = "Server error: " + res.status;
            return null;
        }

        const data = await res.json();
        feedback.textContent = data.reply || "No reply from server.";
        return data;
    } catch (err) {
        feedback.textContent = "Network error.";
        return null;
    }
}

// Helper to create a labeled row (keeps previous helper)
function createRow(labelText, element) {
    const row = document.createElement("div");
    row.classList.add("settings-row");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "10px";

    const label = document.createElement("label");
    label.textContent = labelText;
    label.classList.add("settings-label");
    label.style.flex = "0 0 90px";
    label.style.color = "white";

    element.style.flex = "1";
    element.style.boxSizing = "border-box";

    row.appendChild(label);
    row.appendChild(element);
    return row;
}

function getBasename(path) {
    if (!path) return "";
    try {
        // strip any query/hash
        const clean = path.split('?')[0].split('#')[0];
        const parts = clean.split('/');
        return parts[parts.length - 1] || clean;
    } catch (e) {
        return path;
    }
}

function openAIModal(ai = null) {
    // Create overlay + modal
    const overlay = document.createElement("div");
    overlay.classList.add("settings-modal-overlay");

    const modal = document.createElement("div");
    modal.classList.add("settings-modal");
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
    modal.style.gap = "12px";

    // NAME
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = ai?.name || "";
    nameInput.placeholder = "Name";
    modal.appendChild(createRow("Name:", nameInput));

    // URL row
    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.value = ai?.url || "";
    urlInput.placeholder = "URL (open on exit)";
    modal.appendChild(createRow("URL:", urlInput));

    // API KEY (preloaded from ai.apiKey which we attached earlier)
    const apiInput = document.createElement("input");
    apiInput.type = "password";
    apiInput.value = ai?.apiKey || "";
    apiInput.placeholder = "API Key";
    modal.appendChild(createRow("API Key:", apiInput));

    // IMAGE PREVIEW + PICK BUTTON (no location URL stored in text field)
    const imagePreview = document.createElement("img");
    imagePreview.classList.add("settings-image-preview");
    imagePreview.alt = "preview";
    imagePreview.style.width = "64px";
    imagePreview.style.height = "64px";
    imagePreview.style.objectFit = "cover";
    imagePreview.style.borderRadius = "6px";
    imagePreview.style.border = "1px solid rgba(255,255,255,0.2)";
    imagePreview.style.background = "rgba(255,255,255,0.02)";

    if (ai?.avatar) {
        imagePreview.src = ai.avatar;
    } else {
        imagePreview.src = ""; // no preview
    }

    // Text input now shows only filename / basename (NOT full origin/URL)
    const imageInput = document.createElement("input");
    imageInput.type = "text";
    imageInput.value = getBasename(ai?.avatar || "");
    imageInput.placeholder = "Image filename or name (no URL)";

    const hiddenFileInput = document.createElement("input");
    hiddenFileInput.type = "file";
    hiddenFileInput.accept = "image/*";
    hiddenFileInput.style.display = "none";

    const pickBtn = document.createElement("button");
    pickBtn.type = "button";
    pickBtn.textContent = "Pick Image";
    pickBtn.classList.add("settings-btn");

    // On pick, open file chooser
    pickBtn.addEventListener("click", () => hiddenFileInput.click());

    // File selected -> preview with FileReader, but set imageInput to file.name only
    hiddenFileInput.addEventListener("change", (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            imagePreview.src = reader.result;   // preview the image (data URL)
            imageInput.value = file.name;       // store only filename (no blob/url)
            // optionally keep the file object somewhere if you want to upload later:
            imageInput._file = file; // non-standard property for later use
        };
        reader.readAsDataURL(file);
    });

    // image controls layout
    const imageControls = document.createElement("div");
    imageControls.style.display = "flex";
    imageControls.style.alignItems = "center";
    imageControls.style.gap = "10px";
    imageControls.appendChild(imagePreview);
    imageControls.appendChild(pickBtn);
    imageControls.appendChild(hiddenFileInput); // hidden must be in DOM

    modal.appendChild(createRow("Image:", imageControls));

    // Buttons
    const buttonsRow = document.createElement("div");
    buttonsRow.style.display = "flex";
    buttonsRow.style.justifyContent = "flex-end";
    buttonsRow.style.gap = "8px";
    buttonsRow.style.marginTop = "6px";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.classList.add("settings-btn");
    saveBtn.style.minWidth = "86px";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.classList.add("settings-btn");
    cancelBtn.style.minWidth = "86px";

    // Save: use preview src for image data if needed, but the text field remains just filename
    saveBtn.addEventListener("click", () => {
        const newAI = {
            name: nameInput.value.trim(),
            apiKey: apiInput.value,
            // prefer the preview (data URL) if file was chosen, otherwise ai.avatar or empty
            avatar: imagePreview.src && imagePreview.src.startsWith("data:") ? imagePreview.src : (ai?.avatar || ""),
            url: urlInput.value.trim()
        };

        if (ai) {
            ai.name = newAI.name;
            ai.apiKey = newAI.apiKey;
            ai.avatar = newAI.avatar;
            ai.url = newAI.url;

            // update the dot image for containers matching this ai
            const allDots = document.querySelectorAll(".dot");
            allDots.forEach(d => {
                // match by alt (original name) or by src equality
                if (d.alt === ai.name || d.src === ai.avatar) {
                    d.src = ai.avatar;
                }
            });
        } else {
            const gathering = document.querySelector(".gathering");
            const placeholderAI = {
                name: newAI.name || "New AI",
                avatar: newAI.avatar || "",
                url: newAI.url || "#",
                apiKey: newAI.apiKey || ""
            };
            createContainer(placeholderAI, gathering.children.length, gathering);
        }

        overlay.remove();
    });

    cancelBtn.addEventListener("click", () => overlay.remove());

    buttonsRow.appendChild(cancelBtn);
    buttonsRow.appendChild(saveBtn);
    modal.appendChild(buttonsRow);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    nameInput.focus();
}

// Edit existing AI
function handleSettings(index, ai) {
    openAIModal(ai);
}

// Add new AI
function handleAdd() {
    openAIModal(null);
}

function handleExit(index, url) {
    window.open(url);
}

// Sync master input with all individual inputs
masterInput.addEventListener("input", function () {
    inputs.forEach(input => input.value = masterInput.value);
});

masterInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        inputs.forEach(input => {
            const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
            input.dispatchEvent(enterEvent);
        });
        masterInput.value = "";
    }
});
