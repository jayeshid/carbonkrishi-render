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
})();
