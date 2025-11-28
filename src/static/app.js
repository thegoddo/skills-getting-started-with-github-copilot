document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

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
      const avatar = document.createElement("span");
      avatar.className = "participant-avatar";
      avatar.textContent = initialsFromEmail(email);
      const emailSpan = document.createElement("span");
      emailSpan.className = "participant-email";
      emailSpan.textContent = email;
      li.appendChild(avatar);
      li.appendChild(emailSpan);
      ul.appendChild(li);
    });
    card.appendChild(ul);

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
          const avatar = document.createElement("span");
          avatar.className = "participant-avatar";
          avatar.textContent = initialsFromEmail(email);
          const emailSpan = document.createElement("span");
          emailSpan.className = "participant-email";
          emailSpan.textContent = email;
          li.appendChild(avatar);
          li.appendChild(emailSpan);
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
  fetchActivities();
  init();
});
