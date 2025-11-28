document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Minimal client script: load activities, render participants list, handle signup and update UI.

  async function fetchActivities() {
    const res = await fetch("/activities");
    if (!res.ok) throw new Error("Failed to load activities");
    return res.json();
  }

  function initialsFromEmail(email) {
    const name = email.split("@")[0];
    const parts = name.split(/[.\-_]/).filter(Boolean);
    const chars = parts.length ? parts.map((p) => p[0]) : [name[0]];
    return (chars.slice(0, 2).join("") || name.slice(0, 2)).toUpperCase();
  }

  function createActivityCard(name, data) {
    const card = document.createElement("div");
    card.className = "activity-card";

    const title = document.createElement("h4");
    title.textContent = name;
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.textContent = data.description;
    card.appendChild(desc);

    const sched = document.createElement("p");
    sched.textContent = `Schedule: ${data.schedule}`;
    card.appendChild(sched);

    const meta = document.createElement("div");
    meta.className = "participant-meta";
    meta.textContent = `Participants: ${data.participants.length} / ${data.max_participants}`;
    card.appendChild(meta);

    const ul = document.createElement("ul");
    ul.className = "participants";
    data.participants.forEach((email) => {
      const li = document.createElement("li");
      li.dataset.email = email;
      const avatar = document.createElement("span");
      avatar.className = "participant-avatar";
      avatar.textContent = initialsFromEmail(email);
      const emailSpan = document.createElement("span");
      emailSpan.className = "participant-email";
      emailSpan.textContent = email;
      const del = document.createElement("button");
      del.className = "participant-delete";
      del.type = "button";
      del.title = "Remove participant";
      del.textContent = "✖";
      li.appendChild(avatar);
      li.appendChild(emailSpan);
      li.appendChild(del);
      ul.appendChild(li);
    });
    card.appendChild(ul);

    // Delegate delete clicks on the participants list
    ul.addEventListener("click", async (ev) => {
      const target = ev.target;
      if (!target.classList.contains("participant-delete")) return;
      const li = target.closest("li");
      if (!li) return;
      const email = li.dataset.email;
      if (!email) return;

      try {
        const url = `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(
          email
        )}`;
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.detail || "Failed to remove participant");
        }

        // Update local data and UI
        const idx = data.participants.indexOf(email);
        if (idx !== -1) data.participants.splice(idx, 1);
        meta.textContent = `Participants: ${data.participants.length} / ${data.max_participants}`;
        li.remove();
        showMessage(`Removed ${email} from ${name}`, "success");
      } catch (err) {
        showMessage(err.message || "Failed to remove participant", "error");
      }
    });

    return { card, meta, ul };
  }

  function showMessage(text, type = "info") {
    const msg = document.getElementById("message");
    msg.className = `message ${type}`;
    msg.textContent = text;
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 4000);
  }

  async function init() {
    const container = document.getElementById("activities-list");
    const select = document.getElementById("activity");
    const form = document.getElementById("signup-form");
    container.innerHTML = "<p>Loading activities...</p>";

    try {
      const activities = await fetchActivities();
      container.innerHTML = "";
      const refs = {};

      Object.entries(activities).forEach(([name, data]) => {
        const { card, meta, ul } = createActivityCard(name, data);
        container.appendChild(card);

        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);

        refs[name] = { meta, ul, data };
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const activityName = select.value;
        if (!email || !activityName) {
          showMessage("Please provide both email and activity.", "error");
          return;
        }
        const ref = refs[activityName];
        if (!ref) {
          showMessage("Selected activity not found.", "error");
          return;
        }
        if (ref.data.participants.includes(email)) {
          showMessage("This student is already signed up.", "error");
          return;
        }
        if (ref.data.participants.length >= ref.data.max_participants) {
          showMessage("Activity is full.", "error");
          return;
        }

        try {
          const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(
            email
          )}`;
          const res = await fetch(url, { method: "POST" });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || "Signup failed");
          }
          // update UI
          ref.data.participants.push(email);
          ref.meta.textContent = `Participants: ${ref.data.participants.length} / ${ref.data.max_participants}`;

          const li = document.createElement("li");
          li.dataset.email = email;
          const avatar = document.createElement("span");
          avatar.className = "participant-avatar";
          avatar.textContent = initialsFromEmail(email);
          const emailSpan = document.createElement("span");
          emailSpan.className = "participant-email";
          emailSpan.textContent = email;
          const del = document.createElement("button");
          del.className = "participant-delete";
          del.type = "button";
          del.title = "Remove participant";
          del.textContent = "✖";
          li.appendChild(avatar);
          li.appendChild(emailSpan);
          li.appendChild(del);
          ref.ul.appendChild(li);

          form.reset();
          showMessage(`Signed up ${email} for ${activityName}`, "success");
        } catch (err) {
          showMessage(err.message || "Signup failed", "error");
        }
      });
    } catch (err) {
      container.innerHTML = `<p class="error">Failed to load activities.</p>`;
      console.error(err);
    }
  }

  // Initialize app
  init();
});
