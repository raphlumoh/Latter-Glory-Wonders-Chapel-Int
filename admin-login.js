
"use strict";

/*
 * LGWCI ADMIN LOGIN
 *
 * IMPORTANT:
 * Use the Supabase URL and publishable key belonging to
 * your CHURCH WEBSITE project.
 * Do not use a service-role or secret key in browser code.
 */

const SUPABASE_URL =
    "https://avjqntjyjpswefwjnxyn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_VSjjhu3RrcOBntgKvRik7w_EKTmEGyE";

const loginForm = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");
const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

document.getElementById("currentYear").textContent =
    new Date().getFullYear();

const configIsReady =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("YOUR_") &&
    SUPABASE_PUBLISHABLE_KEY &&
    !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");

let supabaseClient = null;

if (configIsReady && window.supabase) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
}

function showMessage(message, type = "") {
    loginMessage.textContent = message;
    loginMessage.className = "status-message";

    if (type) {
        loginMessage.classList.add(type);
    }
}

function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading
        ? "Verifying access..."
        : "Sign In Securely";
}

function isAdminRole(roleRow) {
    return Boolean(roleRow && roleRow.role === "admin");
}

/*
 * If an authenticated person opens this page again,
 * check whether their existing session belongs to an admin.
 */
async function checkExistingSession() {
    if (!supabaseClient) {
        showMessage(
            "Supabase is not configured. Add your church project's URL and publishable key in admin-login.js.",
            "error"
        );
        loginButton.disabled = true;
        return;
    }

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session check failed:", error);
        return;
    }

    if (data.session) {
        await verifyAdministrator(data.session.user.id);
    }
}

/*
 * A valid Supabase login alone is NOT enough.
 * The signed-in user must have an admin row in
 * public.church_user_roles.
 */
async function verifyAdministrator(userId) {
    const { data: roleRow, error } = await supabaseClient
        .from("church_user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Administrator role check failed:", error);

        showMessage(
            "We could not verify your administrator access. Check the role table and its permissions, then try again.",
            "error"
        );

        await supabaseClient.auth.signOut();
        return false;
    }

    if (!isAdminRole(roleRow)) {
        await supabaseClient.auth.signOut();

        showMessage(
            "Access denied. This account is not an authorized church administrator.",
            "error"
        );

        return false;
    }

    showMessage(
        "Administrator verified. Opening the church website...",
        "success"
    );

    /*
     * The existing website's script.js should use the same
     * Supabase project and role table to protect its admin area.
     */
    window.location.replace("index.html#adminDashboard");

    return true;
}

/* Show or hide password */
togglePassword.addEventListener("click", function () {
    const isPasswordHidden = passwordInput.type === "password";

    passwordInput.type = isPasswordHidden ? "text" : "password";
    togglePassword.textContent = isPasswordHidden ? "Hide" : "Show";
    togglePassword.setAttribute(
        "aria-label",
        isPasswordHidden ? "Hide password" : "Show password"
    );
    togglePassword.setAttribute(
        "aria-pressed",
        String(isPasswordHidden)
    );
});

/* Administrator sign-in */
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(
            "Supabase is not configured. Please complete the configuration first.",
            "error"
        );
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    setLoading(true);
    showMessage("Checking your login details...");

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            console.error("Sign-in failed:", error);

            showMessage(
                "Sign-in failed. Check your email and password, then try again.",
                "error"
            );
            return;
        }

        const allowed = await verifyAdministrator(data.user.id);

        if (!allowed) {
            passwordInput.value = "";
        }
    } catch (error) {
        console.error("Unexpected login error:", error);

        showMessage(
            "Something went wrong while signing in. Please try again.",
            "error"
        );
    } finally {
        setLoading(false);
    }
});

/* Password recovery */
forgotPasswordButton.addEventListener("click", async function () {
    if (!supabaseClient) {
        showMessage(
            "Supabase is not configured yet.",
            "error"
        );
        return;
    }

    const email = emailInput.value.trim();

    if (!email) {
        showMessage(
            "Enter your registered email address first.",
            "error"
        );
        emailInput.focus();
        return;
    }

    forgotPasswordButton.disabled = true;
    showMessage("Requesting a password reset...");

    try {
        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/index.html"
            });

        if (error) {
            console.error("Password recovery failed:", error);
            showMessage(
                "We could not send the reset link. Check the email and Supabase settings.",
                "error"
            );
            return;
        }

        showMessage(
            "If this address is registered, a password reset email will be sent. Check your inbox.",
            "success"
        );
    } catch (error) {
        console.error("Password recovery error:", error);
        showMessage(
            "Unable to request a reset link right now. Please try again.",
            "error"
        );
    } finally {
        forgotPasswordButton.disabled = false;
    }
});

/* Run when the page loads */
checkExistingSession();
S
