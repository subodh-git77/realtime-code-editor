// Helpers
function byId(id){ return document.getElementById(id); }

// Init CodeMirror editors
const cmHTML = CodeMirror(byId("htmlEditor"), { mode:"xml", theme:"material-darker", lineNumbers:true });
const cmCSS  = CodeMirror(byId("cssEditor"), { mode:"css", theme:"material-darker", lineNumbers:true });
const cmJS   = CodeMirror(byId("jsEditor"), { mode:"javascript", theme:"material-darker", lineNumbers:true });

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    ["htmlEditor","cssEditor","jsEditor"].forEach(id => byId(id).classList.add("hidden"));
    byId(btn.dataset.tab + "Editor").classList.remove("hidden");
  });
});

// Render preview
function render(){
  const html = cmHTML.getValue();
  const css  = cmCSS.getValue();
  const js   = cmJS.getValue();

  const srcdoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <style>${css}</style>
      </head>
      <body>
        ${html}
        <script>
          try {
            ${js}
          } catch(err) {
            parent.postMessage({type:"console", data:String(err)}, "*");
          }
        <\/script>
      </body>
    </html>
  `;

  byId("preview").srcdoc = srcdoc;
  setStatus("Rendered");
}

// Run button
byId("runBtn").addEventListener("click", render);

// Auto-run toggle
let autoRun = true;
byId("autoRunToggle").checked = true;
byId("autoRunToggle").addEventListener("change", e => autoRun = e.target.checked);

// Firebase setup
const docRef = db.ref("realtime-editor/doc1");
function bindEditor(cm, key){
  const ref = docRef.child(key);

  // 🔹 Only update preview locally, no Firebase auto-save
  cm.on("change", () => {
    if (autoRun) render();
  });

  // Load initial content from Firebase once
  ref.once("value", snap => {
    if (snap.exists()) {
      cm.setValue(snap.val());
      if (autoRun) render();
    }
  });
}
bindEditor(cmHTML, "html");
bindEditor(cmCSS, "css");
bindEditor(cmJS, "js");

// Status helper
function setStatus(msg){
  byId("status").textContent = msg;
  setTimeout(()=> byId("status").textContent="Idle", 1500);
}

// Console log from iframe
window.addEventListener("message", e => {
  if(e.data.type === "console"){
    const panel = byId("consolePanel");
    panel.innerHTML += `<div>> ${e.data.data}</div>`;
    panel.scrollTop = panel.scrollHeight;
  }
});

// Manual Save
byId("saveBtn").addEventListener("click", () => {
  docRef.update({
    html: cmHTML.getValue(),
    css: cmCSS.getValue(),
    js: cmJS.getValue(),
    updatedAt: Date.now()
  });
  setStatus("Saved");
});

// Track cursor position
function trackCursor(cm) {
  cm.on("cursorActivity", (instance) => {
    const pos = instance.getCursor();
    byId("cursorPos").textContent = `Ln ${pos.line+1}, Col ${pos.ch+1}`;
  });
}
trackCursor(cmHTML);
trackCursor(cmCSS);
trackCursor(cmJS);

// Clear console button
byId("clearConsoleBtn").addEventListener("click", () => {
  byId("consolePanel").innerHTML = "";
});

// Firebase connection status
const connRef = firebase.database().ref(".info/connected");
connRef.on("value", (snap) => {
  if (snap.val() === true) {
    byId("firebaseStatus").textContent = "🟢 Online";
  } else {
    byId("firebaseStatus").textContent = "🔴 Offline";
  }
});
