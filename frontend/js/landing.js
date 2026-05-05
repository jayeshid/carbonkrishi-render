// Shared script for the landing-style pages (Home, Methodology, About).
// - Mobile menu toggle
// - Closes the menu when a link is clicked

(function () {
    const burger = document.getElementById("lc-burger");
    if (burger) {
        burger.addEventListener("click", () => {
            document.body.classList.toggle("lc-menu-open");
        });
    }
    document.querySelectorAll(".lc-nav-link").forEach((link) => {
        link.addEventListener("click", () => document.body.classList.remove("lc-menu-open"));
    });

    // ── Email copy-to-clipboard ──────────────────────────────────────────
    const copyEmailLinks = document.querySelectorAll(".lc-copy-email");
    copyEmailLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const email = link.getAttribute("data-email");
            if (!email) return;

            navigator.clipboard.writeText(email).then(() => {
                // Visual feedback: brief toast notification
                showToast(`Copied!`);
            }).catch(err => {
                console.error('Could not copy email:', err);
                // Fallback: try to open mailto if clipboard fails
                window.location.href = link.href;
            });
        });
    });

    function showToast(message) {
        let toast = document.querySelector(".lc-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "lc-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show");
        
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2000);
    }
})();
