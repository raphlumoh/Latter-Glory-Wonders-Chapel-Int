
/* =========================================================
   LATTER GLORY WONDERS CHAPEL INTERNATIONAL
   Logo: LGWCI
   Main JavaScript file: script.js

   BEFORE USING:
   1. Enter your Supabase Project URL and publishable key.
   2. Create the database tables used below.
   3. Configure Supabase Row Level Security (RLS).
   4. Never place your service-role key in this file.
========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

let supabaseClient = null;
let currentUser = null;
let isAdmin = false;


/* =========================================================
   2. GENERAL HELPERS
========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));

function byId(...ids) {
    for (const id of ids) {
        const element = document.getElementById(id);
        if (element) return element;
    }

    return null;
}

function setText(elementOrId, value) {
    const element = typeof elementOrId === "string"
        ? byId(elementOrId)
        : elementOrId;

    if (element) {
        element.textContent = value ?? "";
    }
}

function showElement(element) {
    if (element) element.hidden = false;
}

function hideElement(element) {
    if (element) element.hidden = true;
}

function setStatus(message, type = "info", target = null) {
    const element = typeof target === "string"
        ? byId(target)
        : target || byId("siteNotification", "portalStatus");

    if (!element) {
        if (message) console.log(`[${type}] ${message}`);
        return;
    }

    element.textContent = message || "";
    element.dataset.type = type;
    element.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(value) {
    if (!value) return "Date to be announced";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button) return;

    if (loading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }

        button.disabled = true;
        button.textContent = loadingText;
    } else {
        button.disabled = false;

        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

function formValue(form, ...names) {
    for (const name of names) {
        const field = form.elements.namedItem(name);

        if (field && typeof field.value === "string") {
            return field.value.trim();
        }

        const element = form.querySelector(
            `[name="${name}"], #${CSS.escape(name)}`
        );

        if (element && typeof element.value === "string") {
            return element.value.trim();
        }
    }

    return "";
}

function showFormStatus(form, message, type = "info") {
    const statusMap = {
        loginForm: "loginStatus",
        recoveryForm: "recoveryStatus",
        registrationForm: "registrationStatus",
        contactForm: "contactStatus",
        adminMemberForm: "adminMemberStatus",
        adminEventForm: "adminEventStatus",
        adminAnnouncementForm: "adminAnnouncementStatus"
    };

    setStatus(message, type, statusMap[form?.id] || "siteNotification");
}

function showModal(modalOrId) {
    const modal = typeof modalOrId === "string"
        ? byId(modalOrId)
        : modalOrId;

    if (!modal) return;

    modal.hidden = false;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    const focusTarget = $("input, select, textarea, button", modal);
    if (focusTarget) focusTarget.focus();
}

function closeModal(modalOrId) {
    const modal = typeof modalOrId === "string"
        ? byId(modalOrId)
        : modalOrId;

    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
}

window.openModal = showModal;
window.closeModal = closeModal;


/* =========================================================
   3. CONNECT TO SUPABASE
========================================================= */

function initializeSupabase() {
    const configured =
        SUPABASE_URL.startsWith("https://") &&
        !SUPABASE_URL.includes("YOUR_SUPABASE") &&
        SUPABASE_PUBLISHABLE_KEY &&
        !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");

    if (!configured) {
        console.warn(
            "LGWCI: Add your Supabase Project URL and publishable key in script.js."
        );
        return false;
    }

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error(
            "Supabase library not found. Check the Supabase CDN script in index.html."
        );
        return false;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    return true;
}


/* =========================================================
   4. MODALS AND HEADER BUTTONS
========================================================= */

function initializeModals() {
    // Login buttons in the updated index.html.
    $$("[data-open-login]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            showModal("loginModal");
        });
    });

    // Membership registration buttons.
    $$("[data-open-register]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            showModal("registerModal");
        });
    });

    // Donation buttons.
    $$("[data-open-donation]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            showModal("donationModal");
        });
    });

    // Also support generic modal buttons, if present.
    $$("[data-open-modal], [data-modal-target]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const target =
                button.dataset.openModal ||
                button.dataset.modalTarget;

            if (target) {
                showModal(target.replace(/^#/, ""));
            }
        });
    });

    // Close buttons inside modals.
    $$("[data-close-modal], .modal-close").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const modal = button.closest(".modal");
            if (modal) closeModal(modal);
        });
    });

    // Close a modal when clicking its backdrop.
    $$(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    // Close an open modal with Escape.
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            $$(".modal.is-open").forEach(modal => closeModal(modal));
        }
    });

    // Forgot Password button.
    const forgotButton = byId("forgotPasswordButton");

    if (forgotButton) {
        forgotButton.addEventListener("click", event => {
            event.preventDefault();
            closeModal("loginModal");
            showModal("recoveryModal");
        });
    }
}


/* =========================================================
   5. LOGIN
========================================================= */

async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient) {
        showFormStatus(
            form,
            "The website login is not connected yet. Configure Supabase first.",
            "error"
        );
        return;
    }

    const email = formValue(form, "email", "loginEmail");
    const password = formValue(form, "password", "loginPassword");
    const button = $("button[type='submit']", form);

    if (!email || !password) {
        showFormStatus(
            form,
            "Please enter your email address and password.",
            "error"
        );
        return;
    }

    setButtonLoading(button, true, "Signing in...");

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        form.reset();
        closeModal("loginModal");

        await refreshSession();
        await loadPortalData();

        setStatus("Welcome to the LGWCI member portal.", "success", "portalStatus");
    } catch (error) {
        console.error("Login error:", error);

        showFormStatus(
            form,
            error.message || "Login failed. Please check your details.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}


/* =========================================================
   6. LOGOUT
========================================================= */

async function handleLogout() {
    const button = byId("logoutButton");

    if (!supabaseClient) {
        showPublicWebsite();
        return;
    }

    try {
        if (button) button.disabled = true;

        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        currentUser = null;
        isAdmin = false;

        showPublicWebsite();

        setStatus(
            "You have been logged out successfully.",
            "success",
            "siteNotification"
        );
    } catch (error) {
        console.error("Logout error:", error);

        setStatus(
            error.message || "Unable to log out.",
            "error",
            "portalStatus"
        );
    } finally {
        if (button) button.disabled = false;
    }
}


/* =========================================================
   7. FORGOT PASSWORD
========================================================= */

async function handlePasswordRecovery(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient) {
        showFormStatus(
            form,
            "Password recovery is not connected yet.",
            "error"
        );
        return;
    }

    const email = formValue(form, "email", "recoveryEmail");
    const button = $("button[type='submit']", form);

    if (!email) {
        showFormStatus(
            form,
            "Please enter your email address.",
            "error"
        );
        return;
    }

    setButtonLoading(button, true, "Sending...");

    try {
        const redirectTo =
            `${window.location.origin}${window.location.pathname}`;

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo
            });

        if (error) throw error;

        showFormStatus(
            form,
            "If an account exists for that email, a password reset link will be sent.",
            "success"
        );

        form.reset();
    } catch (error) {
        console.error("Password recovery error:", error);

        showFormStatus(
            form,
            error.message || "Unable to send the password reset email.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}


/* =========================================================
   8. CHECK THE SIGNED-IN USER'S ROLE
   Table: church_user_roles
   Expected columns: user_id, role
========================================================= */

async function checkAdminRole() {
    isAdmin = false;

    if (!supabaseClient || !currentUser) {
        updateAdminVisibility();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("church_user_roles")
            .select("role")
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (error) throw error;

        isAdmin = data?.role === "admin";
    } catch (error) {
        console.error("Admin role check failed:", error);
        isAdmin = false;
    }

    updateAdminVisibility();
}

function updateAdminVisibility() {
    $$(".admin-only").forEach(element => {
        element.hidden = !isAdmin;
    });

    const adminTab = $(`[data-portal-tab="adminDashboard"]`);
    const adminPanel = byId("adminDashboard");

    if (adminTab) adminTab.hidden = !isAdmin;

    if (adminPanel && !isAdmin) {
        adminPanel.hidden = true;
    }
}


/* =========================================================
   9. SESSION AND PUBLIC WEBSITE DISPLAY
========================================================= */

async function refreshSession() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session check failed:", error);
        return;
    }

    currentUser = data.session?.user || null;

    if (currentUser) {
        await checkAdminRole();
        showMemberPortal();
    } else {
        isAdmin = false;
        showPublicWebsite();
    }
}

function showPublicWebsite() {
    const portal = byId("memberPortal");

    hideElement(portal);

    $$(".public-content, [data-public-section]").forEach(showElement);

    const loginButtons = $$("[data-open-login]");
    const logoutButton = byId("logoutButton");

    loginButtons.forEach(showElement);
    hideElement(logoutButton);

    setText("portalUserName", "");
    updateAdminVisibility();
}

function showMemberPortal() {
    const portal = byId("memberPortal");

    showElement(portal);

    $$(".public-content, [data-public-section]").forEach(hideElement);

    const logoutButton = byId("logoutButton");

    showElement(logoutButton);

    const userName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.email ||
        "Church Member";

    setText("portalUserName", userName);

    updateAdminVisibility();
    switchPortalTab("memberHome");
}


/* =========================================================
   10. MEMBER PORTAL TABS
   Matches the data-portal-tab values in index.html.
========================================================= */

const PORTAL_PANELS = [
    "memberHome",
    "memberDirectory",
    "memberEvents",
    "memberNotices",
    "adminDashboard"
];

function switchPortalTab(tabName) {
    if (tabName === "adminDashboard" && !isAdmin) {
        setStatus(
            "Administrator access is required.",
            "error",
            "portalStatus"
        );

        tabName = "memberHome";
    }

    PORTAL_PANELS.forEach(panelId => {
        const panel = byId(panelId);

        if (panel) {
            panel.hidden = panelId !== tabName;
        }
    });

    $$("[data-portal-tab]").forEach(button => {
        const active = button.dataset.portalTab === tabName;

        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });

    if (tabName === "memberDirectory") {
        loadMemberDirectory();
    }

    if (tabName === "memberEvents") {
        loadEvents();
    }

    if (tabName === "memberNotices") {
        loadAnnouncements();
    }

    if (tabName === "adminDashboard" && isAdmin) {
        loadAdminDashboard();
    }
}

function initializePortalNavigation() {
    $$("[data-portal-tab]").forEach(button => {
        button.addEventListener("click", () => {
            switchPortalTab(button.dataset.portalTab);
        });
    });

    const logoutButton = byId("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }
}


/* =========================================================
   11. EVENTS
   Table: church_events

   Expected columns:
   id, title, description, event_date, event_time, location
========================================================= */

async function loadEvents() {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from("church_events")
            .select("id, title, description, event_date, event_time, location")
            .order("event_date", { ascending: true })
            .limit(50);

        if (error) throw error;

        const events = data || [];

        renderEvents(events);
        renderAdminEvents(events);

        setText("adminTotalEvents", events.length);
        setText("memberEventCount", events.length);
    } catch (error) {
        console.error("Loading events failed:", error);

        renderEvents([]);

        setStatus(
            "Unable to load events. Check the church_events table and its RLS policies.",
            "error",
            "portalStatus"
        );
    }
}

function renderEvents(events) {
    const containers = [
        byId("publicEvents"),
        byId("memberEventsList")
    ].filter(Boolean);

    containers.forEach(container => {
        container.replaceChildren();

        if (!events.length) {
            const message = document.createElement("p");
            message.textContent = "No events have been published yet.";
            container.appendChild(message);
            return;
        }

        events.forEach(item => {
            const card = document.createElement("article");
            card.className = "event-card";

            const title = document.createElement("h3");
            title.textContent = item.title || "Church Event";

            const date = document.createElement("p");
            date.textContent = `Date: ${formatDate(item.event_date)}`;

            const time = document.createElement("p");
            time.textContent = `Time: ${item.event_time || "To be announced"}`;

            const location = document.createElement("p");
            location.textContent =
                `Location: ${item.location || "To be announced"}`;

            const description = document.createElement("p");
            description.textContent = item.description || "";

            card.append(title, date, time, location, description);
            container.appendChild(card);
        });
    });
}

async function handleAdminEventSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient || !isAdmin) {
        showFormStatus(form, "Only an administrator can manage events.", "error");
        return;
    }

    const id = formValue(form, "adminEventId");
    const title = formValue(form, "adminEventTitle");
    const eventDate = formValue(form, "adminEventDate");
    const eventTime = formValue(form, "adminEventTime");
    const location = formValue(form, "adminEventLocation");
    const description = formValue(form, "adminEventDescription");

    if (!title || !eventDate) {
        showFormStatus(form, "Enter an event title and date.", "error");
        return;
    }

    const button = $("button[type='submit']", form);
    setButtonLoading(button, true, "Saving...");

    const record = {
        title,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location || null,
        description: description || null
    };

    try {
        let result;

        if (id) {
            result = await supabaseClient
                .from("church_events")
                .update(record)
                .eq("id", id);
        } else {
            result = await supabaseClient
                .from("church_events")
                .insert([record]);
        }

        if (result.error) throw result.error;

        form.reset();
        setText("adminEventId", "");
        showFormStatus(form, id ? "Event updated." : "Event published.", "success");

        await loadEvents();
        await loadAdminDashboard();
    } catch (error) {
        console.error("Saving event failed:", error);

        showFormStatus(
            form,
            error.message || "Could not save the event.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}

function renderAdminEvents(events) {
    const container = byId("adminEventsList");
    if (!container) return;

    container.replaceChildren();

    if (!isAdmin) return;

    if (!events.length) {
        const message = document.createElement("p");
        message.textContent = "No events to manage.";
        container.appendChild(message);
        return;
    }

    events.forEach(item => {
        const card = document.createElement("article");
        card.className = "admin-list-item";

        const title = document.createElement("h4");
        title.textContent = item.title || "Church Event";

        const details = document.createElement("p");
        details.textContent =
            `${formatDate(item.event_date)} · ${item.location || "Location not set"}`;

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
            setText("adminEventId", item.id);
            byId("adminEventId").value = item.id;
            byId("adminEventTitle").value = item.title || "";
            byId("adminEventDate").value = item.event_date || "";
            byId("adminEventTime").value = item.event_time || "";
            byId("adminEventLocation").value = item.location || "";
            byId("adminEventDescription").value = item.description || "";

            switchPortalTab("adminDashboard");
            byId("adminEventTitle")?.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteEvent(item.id));

        card.append(title, details, editButton, deleteButton);
        container.appendChild(card);
    });
}

async function deleteEvent(id) {
    if (!isAdmin || !supabaseClient) return;

    if (!window.confirm("Delete this event?")) return;

    const { error } = await supabaseClient
        .from("church_events")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Deleting event failed:", error);
        setStatus(error.message || "Could not delete event.", "error", "adminEventStatus");
        return;
    }

    setStatus("Event deleted.", "success", "adminEventStatus");
    await loadEvents();
    await loadAdminDashboard();
}


/* =========================================================
   12. ANNOUNCEMENTS
   Table: church_announcements

   Expected columns:
   id, title, message, created_at, created_by
========================================================= */

async function loadAnnouncements() {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from("church_announcements")
            .select("id, title, message, created_at, created_by")
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) throw error;

        const announcements = data || [];

        renderAnnouncements(announcements);
        renderAdminAnnouncements(announcements);

        setText("adminTotalAnnouncements", announcements.length);
        setText("memberNoticeCount", announcements.length);
    } catch (error) {
        console.error("Loading announcements failed:", error);

        renderAnnouncements([]);

        setStatus(
            "Unable to load announcements. Check the church_announcements table and its RLS policies.",
            "error",
            "portalStatus"
        );
    }
}

function renderAnnouncements(announcements) {
    const containers = [
        byId("publicAnnouncements"),
        byId("memberAnnouncementsList")
    ].filter(Boolean);

    containers.forEach(container => {
        container.replaceChildren();

        if (!announcements.length) {
            const message = document.createElement("p");
            message.textContent = "There are no announcements at the moment.";
            container.appendChild(message);
            return;
        }

        announcements.forEach(item => {
            const card = document.createElement("article");
            card.className = "announcement-card";

            const title = document.createElement("h3");
            title.textContent = item.title || "Church Announcement";

            const date = document.createElement("small");
            date.textContent = formatDate(item.created_at);

            const message = document.createElement("p");
            message.textContent = item.message || "";

            card.append(title, date, message);
            container.appendChild(card);
        });
    });
}

async function handleAdminAnnouncementSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient || !isAdmin || !currentUser) {
        showFormStatus(
            form,
            "Only an authorized administrator can publish announcements.",
            "error"
        );
        return;
    }

    const id = formValue(form, "adminAnnouncementId");
    const title = formValue(form, "adminAnnouncementTitle");
    const message = formValue(form, "adminAnnouncementBody");

    if (!title || !message) {
        showFormStatus(form, "Enter an announcement title and message.", "error");
        return;
    }

    const button = $("button[type='submit']", form);
    setButtonLoading(button, true, "Publishing...");

    try {
        let result;

        if (id) {
            result = await supabaseClient
                .from("church_announcements")
                .update({ title, message })
                .eq("id", id);
        } else {
            result = await supabaseClient
                .from("church_announcements")
                .insert([{
                    title,
                    message,
                    created_by: currentUser.id
                }]);
        }

        if (result.error) throw result.error;

        form.reset();
        setText("adminAnnouncementId", "");
        showFormStatus(
            form,
            id ? "Announcement updated." : "Announcement published.",
            "success"
        );

        await loadAnnouncements();
        await loadAdminDashboard();
    } catch (error) {
        console.error("Saving announcement failed:", error);

        showFormStatus(
            form,
            error.message || "Could not publish the announcement.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}

function renderAdminAnnouncements(announcements) {
    const container = byId("adminAnnouncementsList");
    if (!container) return;

    container.replaceChildren();

    if (!isAdmin) return;

    if (!announcements.length) {
        const message = document.createElement("p");
        message.textContent = "No announcements to manage.";
        container.appendChild(message);
        return;
    }

    announcements.forEach(item => {
        const card = document.createElement("article");
        card.className = "admin-list-item";

        const title = document.createElement("h4");
        title.textContent = item.title || "Church Announcement";

        const body = document.createElement("p");
        body.textContent = item.message || "";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
            byId("adminAnnouncementId").value = item.id;
            byId("adminAnnouncementTitle").value = item.title || "";
            byId("adminAnnouncementBody").value = item.message || "";

            switchPortalTab("adminDashboard");
            byId("adminAnnouncementTitle")?.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteAnnouncement(item.id));

        card.append(title, body, editButton, deleteButton);
        container.appendChild(card);
    });
}

async function deleteAnnouncement(id) {
    if (!isAdmin || !supabaseClient) return;

    if (!window.confirm("Delete this announcement?")) return;

    const { error } = await supabaseClient
        .from("church_announcements")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Deleting announcement failed:", error);
        setStatus(error.message || "Could not delete announcement.", "error", "adminAnnouncementStatus");
        return;
    }

    setStatus("Announcement deleted.", "success", "adminAnnouncementStatus");
    await loadAnnouncements();
    await loadAdminDashboard();
}


/* =========================================================
   13. MEMBERSHIP REGISTRATION REQUEST
   Table: membership_requests

   Expected columns:
   full_name, email, phone, location, ministry
========================================================= */

async function handleRegistration(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient) {
        showFormStatus(form, "The registration database is not connected yet.", "error");
        return;
    }

    const fullName = formValue(form, "full_name", "fullName");
    const email = formValue(form, "email");
    const phone = formValue(form, "phone");
    const location = formValue(form, "location");
    const ministry = formValue(form, "ministry");

    if (!fullName || !email) {
        showFormStatus(form, "Please enter your full name and email address.", "error");
        return;
    }

    const button = $("button[type='submit']", form);
    setButtonLoading(button, true, "Submitting...");

    try {
        const { error } = await supabaseClient
            .from("membership_requests")
            .insert([{
                full_name: fullName,
                email,
                phone: phone || null,
                location: location || null,
                ministry: ministry || null
            }]);

        if (error) throw error;

        form.reset();

        showFormStatus(
            form,
            "Thank you. Your membership registration request has been submitted.",
            "success"
        );

        closeModal("registerModal");
    } catch (error) {
        console.error("Registration request failed:", error);

        showFormStatus(
            form,
            error.message || "Your request could not be submitted. Please try again.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}


/* =========================================================
   14. CONTACT FORM
   Table: church_messages

   Expected columns:
   name, email, subject, message
========================================================= */

async function handleContactForm(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient) {
        showFormStatus(form, "The contact form is not connected yet.", "error");
        return;
    }

    const name = formValue(form, "name", "full_name");
    const email = formValue(form, "email");
    const subject = formValue(form, "subject");
    const message = formValue(form, "message");

    if (!name || !email || !message) {
        showFormStatus(form, "Please enter your name, email and message.", "error");
        return;
    }

    const button = $("button[type='submit']", form);
    setButtonLoading(button, true, "Sending...");

    try {
        const { error } = await supabaseClient
            .from("church_messages")
            .insert([{
                name,
                email,
                subject: subject || null,
                message
            }]);

        if (error) throw error;

        form.reset();

        showFormStatus(
            form,
            "Thank you. Your message has been sent to the church.",
            "success"
        );
    } catch (error) {
        console.error("Contact form failed:", error);

        showFormStatus(
            form,
            error.message || "Your message could not be sent.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}


/* =========================================================
   15. MEMBER DIRECTORY
   Table: church_members

   Expected columns:
   id, full_name, email, phone, location, ministry, created_at
========================================================= */

async function loadMemberDirectory() {
    if (!supabaseClient || !currentUser) return;

    const container = byId("memberDirectoryBody");
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from("church_members")
            .select("id, full_name, location, ministry")
            .order("full_name", { ascending: true });

        if (error) throw error;

        renderMemberDirectory(data || []);
    } catch (error) {
        console.error("Member directory failed:", error);

        container.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent =
            "Unable to load the directory. Check your database permissions.";

        row.appendChild(cell);
        container.appendChild(row);
    }
}

function renderMemberDirectory(members) {
    const container = byId("memberDirectoryBody");
    if (!container) return;

    container.replaceChildren();

    if (!members.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No members are listed yet.";

        row.appendChild(cell);
        container.appendChild(row);
        return;
    }

    members.forEach((member, index) => {
        const row = document.createElement("tr");

        [
            index + 1,
            member.full_name || "—",
            member.ministry || "—",
            member.location || "—"
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        container.appendChild(row);
    });
}


/* =========================================================
   16. ADMIN MEMBER MANAGEMENT
   Form: adminMemberForm
   Table: church_members
========================================================= */

async function loadAdminMembers() {
    if (!supabaseClient || !isAdmin) return;

    const container = byId("adminMembersBody");
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from("church_members")
            .select("id, full_name, email, phone, location, ministry, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;

        renderAdminMembers(data || []);
        setText("adminTotalMembers", (data || []).length);
    } catch (error) {
        console.error("Admin members failed to load:", error);

        setStatus(
            "Unable to load members. Check the church_members table and RLS policies.",
            "error",
            "adminMemberStatus"
        );
    }
}

function renderAdminMembers(members) {
    const container = byId("adminMembersBody");
    if (!container) return;

    container.replaceChildren();

    if (!members.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "No member records found.";

        row.appendChild(cell);
        container.appendChild(row);
        return;
    }

    members.forEach(member => {
        const row = document.createElement("tr");

        [
            member.full_name,
            member.email,
            member.phone,
            member.location,
            member.ministry
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value || "—";
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
            byId("adminMemberId").value = member.id;
            byId("adminMemberName").value = member.full_name || "";
            byId("adminMemberEmail").value = member.email || "";
            byId("adminMemberPhone").value = member.phone || "";
            byId("adminMemberLocation").value = member.location || "";
            byId("adminMemberMinistry").value = member.ministry || "";

            byId("adminMemberName")?.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteMember(member.id));

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);
        container.appendChild(row);
    });
}

async function handleAdminMemberSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!supabaseClient || !isAdmin) {
        showFormStatus(form, "Only an administrator can manage member records.", "error");
        return;
    }

    const id = formValue(form, "adminMemberId");
    const fullName = formValue(form, "adminMemberName");
    const email = formValue(form, "adminMemberEmail");
    const phone = formValue(form, "adminMemberPhone");
    const location = formValue(form, "adminMemberLocation");
    const ministry = formValue(form, "adminMemberMinistry");

    if (!fullName) {
        showFormStatus(form, "Please enter the member's name.", "error");
        return;
    }

    const button = $("button[type='submit']", form);
    setButtonLoading(button, true, "Saving...");

    const record = {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        location: location || null,
        ministry: ministry || null
    };

    try {
        let result;

        if (id) {
            result = await supabaseClient
                .from("church_members")
                .update(record)
                .eq("id", id);
        } else {
            result = await supabaseClient
                .from("church_members")
                .insert([record]);
        }

        if (result.error) throw result.error;

        form.reset();
        byId("adminMemberId").value = "";

        showFormStatus(
            form,
            id ? "Member details updated." : "Member added successfully.",
            "success"
        );

        await loadAdminMembers();
        await loadMemberDirectory();
        await loadAdminDashboard();
    } catch (error) {
        console.error("Saving member failed:", error);

        showFormStatus(
            form,
            error.message || "Unable to save the member.",
            "error"
        );
    } finally {
        setButtonLoading(button, false);
    }
}

async function deleteMember(id) {
    if (!supabaseClient || !isAdmin) return;

    if (!window.confirm("Are you sure you want to delete this member?")) {
        return;
    }

    const { error } = await supabaseClient
        .from("church_members")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Deleting member failed:", error);

        setStatus(
            error.message || "Unable to delete this member.",
            "error",
            "adminMemberStatus"
        );
        return;
    }

    setStatus("Member deleted.", "success", "adminMemberStatus");

    await loadAdminMembers();
    await loadMemberDirectory();
    await loadAdminDashboard();
}

function initializeMemberFormButtons() {
    const clearButton = byId("clearMemberForm");

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            byId("adminMemberForm")?.reset();
            setText("adminMemberId", "");

            const idField = byId("adminMemberId");
            if (idField) idField.value = "";

            setStatus("", "info", "adminMemberStatus");
        });
    }
}


/* =========================================================
   17. ADMIN DASHBOARD COUNTS
========================================================= */

async function loadAdminDashboard() {
    if (!supabaseClient || !isAdmin) return;

    await Promise.all([
        loadAdminMembers(),
        loadEvents(),
        loadAnnouncements()
    ]);
}

async function loadPortalData() {
    if (!supabaseClient || !currentUser) return;

    await Promise.all([
        loadEvents(),
        loadAnnouncements(),
        loadMemberDirectory()
    ]);

    if (isAdmin) {
        await loadAdminDashboard();
    }
}


/* =========================================================
   18. CONNECT ALL FORMS
========================================================= */

function connectForm(id, handler) {
    const form = byId(id);

    if (form) {
        form.addEventListener("submit", handler);
    }
}

function initializeForms() {
    connectForm("loginForm", handleLogin);
    connectForm("recoveryForm", handlePasswordRecovery);
    connectForm("registrationForm", handleRegistration);
    connectForm("contactForm", handleContactForm);

    connectForm("adminMemberForm", handleAdminMemberSubmit);
    connectForm("adminEventForm", handleAdminEventSubmit);
    connectForm("adminAnnouncementForm", handleAdminAnnouncementSubmit);

    const refreshMembersButton = byId("refreshMembersBtn", "refreshMembers");

    if (refreshMembersButton) {
        refreshMembersButton.addEventListener("click", () => {
            if (isAdmin) loadAdminMembers();
            else loadMemberDirectory();
        });
    }

    const refreshEventsButton = byId("refreshEventsBtn", "refreshEvents");

    if (refreshEventsButton) {
        refreshEventsButton.addEventListener("click", loadEvents);
    }

    initializeMemberFormButtons();
}


/* =========================================================
   19. START THE WEBSITE
========================================================= */

async function startWebsite() {
    initializeModals();
    initializePortalNavigation();
    initializeForms();

    const connected = initializeSupabase();

    if (!connected) {
        showPublicWebsite();
        return;
    }

    await refreshSession();

    // Load public events and announcements even when signed out.
    await Promise.all([
        loadEvents(),
        loadAnnouncements()
    ]);

    if (currentUser) {
        await loadPortalData();
    }

    supabaseClient.auth.onAuthStateChange(() => {
        /*
          Let Supabase finish its auth callback before making
          additional database requests.
        */
        setTimeout(async () => {
            await refreshSession();

            if (currentUser) {
                await loadPortalData();
            }
        }, 0);
    });
}

document.addEventListener("DOMContentLoaded", startWebsite);