document.addEventListener("DOMContentLoaded", () => {
  const label = document.getElementById("formshieldLabel");
  const icon = document.getElementById("formshieldCheck");
  const box = document.getElementById("formshieldBox");
  const feedback = document.getElementById("formshieldFeedback");
  const form = document.getElementById("formshieldForm");
  const nameField = document.getElementById("name");
  const messageField = document.getElementById("msg");
  const submitButton = document.getElementById("formshieldSubmit");

  if (!label || !icon || !box || !form || !feedback || !nameField || !messageField || !submitButton) return;

  let challengeData = null;
  let powSolved = false;
  let powResult = null;
  let verificationReady = false;
  let userTyped = false;
  let verificationDisplayTimeout;
  let submitted = false;

  const sitekey = box?.dataset?.sitekey || window.AEGILOCK_SITEKEY || "";
  const apiUrlVerify = window.AEGILOCK_API_URL || "/wp-json/aegilock/v1/formshield-verify";
  const apiUrlSubmit = window.AEGILOCK_API_URL_SUBMIT || "/wp-json/aegilock/v1/formsubmit";

  function updateVerificationDisplay() {
    clearTimeout(verificationDisplayTimeout);
    if (verificationReady && userTyped && powSolved) {
      verificationDisplayTimeout = setTimeout(() => {
        label.textContent = "Ich bin ein Mensch";
        label.style.color = "#00cfff";
        icon.setAttribute("stroke", "#00cfff");
        box.style.opacity = "1";
      }, 500);
    } else {
      label.textContent = "";
      icon.setAttribute("stroke", "#333");
      box.style.opacity = "0.25";
    }
  }

  (async () => {
    try {
      const res = await fetch(apiUrlVerify, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sitekey,
          ua: navigator.userAgent,
          entropy: Math.random().toString(36).slice(2),
          timestamp: Date.now()
        }),
      });

      if (!res.ok) throw new Error("Challenge fehlgeschlagen");

      challengeData = await res.json();
      verificationReady = true;
      updateVerificationDisplay();
    } catch (err) {
      label.textContent = "Verifizierung fehlgeschlagen";
      label.style.color = "#ff4d4d";
      icon.setAttribute("stroke", "#ff4d4d");
      box.style.opacity = "1";
    }
  })();

  async function solveChallenge() {
    if (!challengeData) return;
    const { challenge, difficulty } = challengeData;
    const prefix = "0".repeat(difficulty);
    let nonce = 0;

    while (true) {
      const input = challenge + nonce;
      const buffer = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");

      if (hash.startsWith(prefix)) {
        powResult = { challenge, nonce, hash };
        powSolved = true;
        submitButton.disabled = false;
        updateVerificationDisplay();
        break;
      }

      nonce++;
      if (nonce % 5000 === 0) await new Promise(r => setTimeout(r, 0));
    }
  }

  function checkFields() {
    const hasName = nameField.value.trim().length > 0;
    const hasMessage = messageField.value.trim().length > 0;
    userTyped = hasName || hasMessage;

    if (!powSolved) {
      submitButton.disabled = !userTyped;
    }

    updateVerificationDisplay();

    if (userTyped && challengeData && !powSolved) {
      solveChallenge();
    }
  }

  nameField.addEventListener("input", checkFields);
  messageField.addEventListener("input", checkFields);
  window.addEventListener("load", checkFields);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitted) return;

    if (!powSolved || !powResult) {
      feedback.classList.remove("hidden");
      feedback.classList.add("feature-card");
      feedback.innerHTML = `
        <h4 class="text-pink-400 font-bold text-lg">Verifizierung läuft noch</h4>
        <p class="text-gray-300">Bitte warten Sie einen Moment, bis die Rechenaufgabe abgeschlossen ist.</p>
      `;
      return;
    }

    submitted = true;
    submitButton.disabled = true;

    ["challenge", "nonce", "hash"].forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = powResult[key];
      form.appendChild(input);
    });

    feedback.classList.remove("hidden");
    feedback.classList.add("feature-card");
    feedback.innerHTML = "";

    try {
      const formData = new FormData(form);
      const res = await fetch(apiUrlSubmit, {
        method: "POST",
        body: new URLSearchParams(formData)
      });

      const result = await res.json();

      if (result.success && result.bot === false) {
        box.style.display = "none";
        setTimeout(() => {
          feedback.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
              <svg width="28" height="28" fill="none" stroke="#00cfff" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <h4 class="text-cyan-400 font-bold text-lg">Aegilock Captcha-Verifizierung erfolgreich</h4>
            </div>
            <p class="text-gray-300">Du bist kein Bot.</p>
          `;
        }, 1000);
      } else {
        feedback.innerHTML = `
          <div class="flex items-center gap-3 mb-2">
            <svg width="28" height="28" fill="none" stroke="#d600c3" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
            <h4 class="text-pink-400 font-bold text-lg">Du bist ein Bot</h4>
          </div>
          <p class="text-gray-300">${result.message}</p>
        `;
      }
    } catch (err) {
      feedback.innerHTML = `
        <h4 class="text-pink-400 font-bold text-lg">Fehler</h4>
        <p class="text-gray-300">Serverantwort konnte nicht verarbeitet werden.</p>
      `;
    }
  });
});
