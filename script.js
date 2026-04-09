const navbar = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");
const animatedItems = document.querySelectorAll(".reveal");

function syncNavbar() {
  navbar.classList.toggle("scrolled", window.scrollY > 16);
}

function closeMenu() {
  hamburger.classList.remove("open");
  navLinks.classList.remove("open");
  hamburger.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const nextState = !navLinks.classList.contains("open");
  hamburger.classList.toggle("open", nextState);
  navLinks.classList.toggle("open", nextState);
  hamburger.setAttribute("aria-expanded", String(nextState));
}

syncNavbar();
window.addEventListener("scroll", syncNavbar, { passive: true });

hamburger.addEventListener("click", toggleMenu);

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 720) {
    closeMenu();
  }
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  animatedItems.forEach((item) => item.classList.add("visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  animatedItems.forEach((item) => observer.observe(item));
}
