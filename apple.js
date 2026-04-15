(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setupDropdownAnimation() {
    const toggles = document.querySelectorAll(".work-toggle");
    if (!toggles.length) {
      return;
    }

    const DURATION_MS = 1000;
    const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

    toggles.forEach((details) => {
      const summary = details.querySelector("summary");
      const content = details.querySelector(".toggle-content");

      if (!summary || !content) {
        return;
      }

      const hasHeavyMedia = Boolean(
        content.querySelector("img[src*='.gif' i], video, canvas, iframe")
      );
      const contentHeightEstimate = content.scrollHeight;
      const useLightweightMode = hasHeavyMedia || contentHeightEstimate > 900;

      summary.setAttribute("aria-expanded", String(details.open));
      content.style.height = details.open ? "auto" : "0px";
      content.style.overflow = "hidden";

      const setExpandedState = () => {
        content.style.height = "auto";
        content.style.opacity = "1";
        content.style.transform = "translateY(0)";
        content.style.pointerEvents = "auto";
      };

      const setCollapsedState = () => {
        content.style.height = "0px";
        content.style.opacity = "0";
        content.style.transform = "translateY(-8px)";
        content.style.pointerEvents = "none";
      };

      if (useLightweightMode) {
        if (details.open) {
          setExpandedState();
        } else {
          setCollapsedState();
        }
      }

      if (prefersReducedMotion) {
        return;
      }

      if (useLightweightMode) {
        content.style.transition = `opacity 360ms ${EASING}, transform 360ms ${EASING}`;
        content.style.willChange = "opacity, transform";
      } else {
        content.style.transition = `height ${DURATION_MS}ms ${EASING}`;
        content.style.willChange = "height";
      }

      let isAnimating = false;

      summary.addEventListener("click", (event) => {
        event.preventDefault();

        if (isAnimating) {
          return;
        }

        if (details.open) {
          isAnimating = true;
          summary.setAttribute("aria-expanded", "false");

          if (useLightweightMode) {
            content.style.pointerEvents = "none";
            requestAnimationFrame(() => {
              content.style.opacity = "0";
              content.style.transform = "translateY(-8px)";
            });

            const onCollapseEnd = (transitionEvent) => {
              if (transitionEvent.propertyName !== "opacity") {
                return;
              }

              content.removeEventListener("transitionend", onCollapseEnd);
              details.open = false;
              content.style.height = "0px";
              isAnimating = false;
            };

            content.addEventListener("transitionend", onCollapseEnd);
            return;
          }

          const startHeight = content.getBoundingClientRect().height;
          content.style.height = `${startHeight}px`;
          requestAnimationFrame(() => {
            content.style.height = "0px";
          });

          const onCollapseEnd = (transitionEvent) => {
            if (transitionEvent.propertyName !== "height") {
              return;
            }

            content.removeEventListener("transitionend", onCollapseEnd);
            details.open = false;
            isAnimating = false;
          };

          content.addEventListener("transitionend", onCollapseEnd);
          return;
        }

        isAnimating = true;
        details.open = true;
        summary.setAttribute("aria-expanded", "true");

        if (useLightweightMode) {
          content.style.height = "auto";
          content.style.pointerEvents = "none";
          content.style.opacity = "0";
          content.style.transform = "translateY(-8px)";

          requestAnimationFrame(() => {
            content.style.pointerEvents = "auto";
            content.style.opacity = "1";
            content.style.transform = "translateY(0)";
          });

          const onExpandEnd = (transitionEvent) => {
            if (transitionEvent.propertyName !== "opacity") {
              return;
            }

            content.removeEventListener("transitionend", onExpandEnd);
            isAnimating = false;
          };

          content.addEventListener("transitionend", onExpandEnd);
          return;
        }

        content.style.height = "0px";
        const endHeight = content.scrollHeight;
        const dynamicDuration = Math.min(
          DURATION_MS,
          Math.max(320, Math.round(endHeight * 0.35))
        );
        content.style.transition = `height ${dynamicDuration}ms ${EASING}`;

        requestAnimationFrame(() => {
          content.style.height = `${endHeight}px`;
        });

        const onExpandEnd = (transitionEvent) => {
          if (transitionEvent.propertyName !== "height") {
            return;
          }

          content.removeEventListener("transitionend", onExpandEnd);
          content.style.height = "auto";
          isAnimating = false;
        };

        content.addEventListener("transitionend", onExpandEnd);
      });

      window.addEventListener("resize", () => {
        if (isAnimating) {
          return;
        }

        if (useLightweightMode) {
          if (details.open) {
            setExpandedState();
          } else {
            setCollapsedState();
          }
          return;
        }

        content.style.height = details.open ? "auto" : "0px";
      });
    });
  }

  function setupScrollProgress() {
    const updateProgress = () => {
      const root = document.documentElement;
      const total = root.scrollHeight - window.innerHeight;
      const progress = total <= 0 ? 0 : Math.min(Math.max(window.scrollY / total, 0), 1);
      root.style.setProperty("--scroll-progress", String(progress));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  function setupCopyEmailAction() {
    const copyButton = document.getElementById("copy-email-btn");
    const feedback = document.getElementById("copy-email-feedback");

    if (!copyButton) {
      return;
    }

    const email = copyButton.getAttribute("data-email") || "";
    const defaultLabel = copyButton.textContent || "Copy email";
    let resetTimerId = null;

    const setFeedback = (message, isError = false) => {
      if (!feedback) {
        return;
      }

      feedback.textContent = message;
      feedback.style.color = isError ? "#ffb3b3" : "#9bd0ff";
    };

    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = email;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (_error) {
        copied = false;
      }

      document.body.removeChild(textarea);
      return copied;
    };

    copyButton.addEventListener("click", async () => {
      if (!email) {
        setFeedback("Email address unavailable right now.", true);
        return;
      }

      let copied = false;
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(email);
          copied = true;
        } catch (_error) {
          copied = fallbackCopy();
        }
      } else {
        copied = fallbackCopy();
      }

      if (!copied) {
        setFeedback("Copy failed. Please copy manually.", true);
        return;
      }

      copyButton.textContent = "Copied";
      setFeedback("Email copied to clipboard.");

      if (resetTimerId !== null) {
        window.clearTimeout(resetTimerId);
      }

      resetTimerId = window.setTimeout(() => {
        copyButton.textContent = defaultLabel;
        setFeedback("");
      }, 1400);
    });
  }

  function setupActiveNav() {
    const navLinks = Array.from(
      document.querySelectorAll(".nav-links a[href^='#'], .section-rail-link[href^='#']")
    );
    const rail = document.querySelector(".section-rail");
    const darkToneSections = new Set(["hero", "core-skill", "experience", "contact"]);

    const sectionMap = new Map();
    navLinks.forEach((link) => {
      const id = link.getAttribute("href")?.slice(1);
      const section = id ? document.getElementById(id) : null;
      if (!id || !section) {
        return;
      }

      if (!sectionMap.has(id)) {
        sectionMap.set(id, { id, section, links: [] });
      }

      sectionMap.get(id).links.push(link);
    });

    const sectionLinks = Array.from(sectionMap.values());

    if (!sectionLinks.length) {
      return;
    }

    const updateRailDial = (id) => {
      if (!rail) {
        return;
      }

      const link = rail.querySelector(`.section-rail-link[href="#${id}"]`);
      if (!link) {
        return;
      }

      const top = link.offsetTop + link.offsetHeight * 0.5 - 9;
      rail.style.setProperty("--rail-indicator-top", `${top.toFixed(1)}px`);
    };

    const updateRailTone = (id) => {
      if (!rail) {
        return;
      }

      const darkTone = darkToneSections.has(id);
      rail.classList.toggle("rail-tone-dark", darkTone);
      rail.classList.toggle("rail-tone-light", !darkTone);
    };

    const setActive = (id) => {
      sectionLinks.forEach(({ id: sectionId, links }) => {
        links.forEach((link) => {
          link.classList.toggle("nav-active", sectionId === id);
        });
      });
      updateRailDial(id);
      updateRailTone(id);
    };

    const getOrderedSections = () => {
      return sectionLinks
        .map((entry) => ({
          ...entry,
          top: entry.section.getBoundingClientRect().top + window.scrollY,
        }))
        .sort((a, b) => a.top - b.top);
    };

    const findActiveId = () => {
      const orderedSections = getOrderedSections();
      const activationOffset = Math.min(160, window.innerHeight * 0.2);
      const scrollAnchor = window.scrollY + activationOffset;

      let currentId = orderedSections[0].id;

      orderedSections.forEach(({ id, top }) => {
        if (top <= scrollAnchor) {
          currentId = id;
        }
      });

      return currentId;
    };

    let activeId = "";

    const syncActive = () => {
      const nextId = findActiveId();
      if (nextId !== activeId) {
        activeId = nextId;
      }
      setActive(activeId);
    };

    syncActive();
    window.addEventListener("scroll", syncActive, { passive: true });
    window.addEventListener("resize", syncActive);
  }

  function setupMetricCountUp() {
    const metrics = Array.from(document.querySelectorAll("#proof-strip .proof-stat strong"));
    if (!metrics.length || prefersReducedMotion) {
      return;
    }

    const numberPattern = /\d+(?:\.\d+)?/g;

    const animateMetric = (element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        const template = currentNode.nodeValue || "";
        const matches = Array.from(template.matchAll(numberPattern));
        if (matches.length) {
          const numbers = matches.map((match) => {
            const raw = match[0];
            return {
              value: Number(raw),
              decimals: (raw.split(".")[1] || "").length,
            };
          });

          textNodes.push({ node: currentNode, template, numbers });
        }
        currentNode = walker.nextNode();
      }

      if (!textNodes.length) {
        return;
      }

      const duration = 1300;
      const startTime = performance.now();

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        textNodes.forEach(({ node, template, numbers }) => {
          let index = 0;
          node.nodeValue = template.replace(numberPattern, () => {
            const current = numbers[index++];
            const nextValue = current.value * eased;

            if (current.decimals > 0) {
              return nextValue.toFixed(current.decimals);
            }

            return String(Math.round(nextValue));
          });
        });

        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }

        textNodes.forEach(({ node, template }) => {
          node.nodeValue = template;
        });
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const metric = entry.target;
          if (metric.dataset.counted === "true") {
            return;
          }

          metric.dataset.counted = "true";
          animateMetric(metric);
          observer.unobserve(metric);
        });
      },
      { threshold: 0.45 }
    );

    metrics.forEach((metric) => observer.observe(metric));
  }

  function setupFocusCardTilt() {
    if (prefersReducedMotion) {
      return;
    }

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const cards = Array.from(document.querySelectorAll(".hero-core .panel-result"));

    if (!cards.length) {
      return;
    }

    const resetTilt = (card) => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--lift", "0px");
    };

    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (!finePointer.matches) {
          return;
        }

        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        const rotateX = (0.5 - py) * 6;
        const rotateY = (px - 0.5) * 6;

        card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
        card.style.setProperty("--lift", "-5px");
      });

      card.addEventListener("pointerleave", () => resetTilt(card));
      card.addEventListener("pointercancel", () => resetTilt(card));
    });

    const handlePointerModeChange = (event) => {
      if (event.matches) {
        return;
      }

      cards.forEach((card) => resetTilt(card));
    };

    if (typeof finePointer.addEventListener === "function") {
      finePointer.addEventListener("change", handlePointerModeChange);
    } else if (typeof finePointer.addListener === "function") {
      finePointer.addListener(handlePointerModeChange);
    }
  }

  function setupHeroFocusRotation() {
    if (prefersReducedMotion) {
      return;
    }

    const groups = Array.from(document.querySelectorAll(".hero-core .panel-results"));
    const mobileLayout = window.matchMedia("(max-width: 720px)");
    if (!groups.length) {
      return;
    }

    const ROTATE_INTERVAL_MS = 4200;
    const EXIT_DURATION_MS = 980;

    groups.forEach((group) => {
      const cards = Array.from(group.querySelectorAll(".panel-result"));
      if (cards.length < 2) {
        return;
      }

      group.classList.add("focus-rotator");

      const indicator = document.createElement("div");
      indicator.className = "focus-rotation-indicator";

      const dots = document.createElement("div");
      dots.className = "focus-rotation-dots";
      dots.setAttribute("role", "tablist");
      dots.setAttribute("aria-label", "Focus highlight navigation");

      const cardTitles = cards.map((card, index) => {
        const heading = card.querySelector("strong");
        const title = heading?.textContent?.trim() || `Focus ${index + 1}`;
        card.dataset.focusTitle = title;
        return title;
      });

      const dotNodes = cards.map((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "focus-rotation-dot";
        dot.dataset.dotIndex = String(index);
        dot.setAttribute("aria-label", cardTitles[index]);
        dot.setAttribute("aria-controls", `focus-card-${index}`);
        dot.setAttribute("role", "tab");
        dots.appendChild(dot);
        return dot;
      });

      cards.forEach((card, index) => {
        card.id = card.id || `focus-card-${index}`;
      });

      indicator.append(dots);
      group.insertAdjacentElement("beforebegin", indicator);

      let activeIndex = 0;
      let rotationTimer = null;
      let exitTimer = null;

      const updateIndicatorDots = (currentIndex, previewIndex) => {
        dotNodes.forEach((dot, index) => {
          dot.classList.toggle("is-active", index === currentIndex);
          dot.classList.toggle("is-next", index === previewIndex && index !== currentIndex);
          dot.setAttribute("aria-selected", String(index === currentIndex));
          dot.tabIndex = index === currentIndex ? 0 : -1;
        });
      };

      const syncSteadyState = () => {
        const previewIndex = (activeIndex + 1) % cards.length;

        cards.forEach((card, index) => {
          const isActive = index === activeIndex;
          const isPreview = index === previewIndex && !isActive;
          card.classList.toggle("is-active", isActive);
          card.classList.toggle("is-next", isPreview);
          card.classList.remove("is-exiting");
          card.setAttribute("aria-hidden", String(!isActive));
        });

        updateIndicatorDots(activeIndex, previewIndex);
      };

      syncSteadyState();

      const transitionToIndex = (targetIndex) => {
        if (targetIndex === activeIndex) {
          return;
        }

        const currentIndex = activeIndex;
        const current = cards[currentIndex];
        const next = cards[targetIndex];
        const previewIndex = (targetIndex + 1) % cards.length;
        const preview = cards[previewIndex];

        cards.forEach((card, index) => {
          card.classList.remove("is-next");
          if (index !== currentIndex) {
            card.classList.remove("is-exiting");
          }
        });

        current.classList.remove("is-active");
        current.classList.add("is-exiting");
        current.setAttribute("aria-hidden", "true");

        next.classList.remove("is-exiting");
        next.classList.add("is-active");
        next.setAttribute("aria-hidden", "false");
        preview.classList.add("is-next");
        preview.setAttribute("aria-hidden", "true");
        updateIndicatorDots(targetIndex, previewIndex);

        if (exitTimer !== null) {
          window.clearTimeout(exitTimer);
        }

        exitTimer = window.setTimeout(() => {
          current.classList.remove("is-exiting");
          exitTimer = null;
        }, EXIT_DURATION_MS);

        activeIndex = targetIndex;
      };

      const rotate = () => {
        transitionToIndex((activeIndex + 1) % cards.length);
      };

      const shouldKeepRotatingOnMobile = () => mobileLayout.matches;

      const stopRotation = (force = false) => {
        if (!force && shouldKeepRotatingOnMobile()) {
          return;
        }

        if (rotationTimer !== null) {
          window.clearInterval(rotationTimer);
          rotationTimer = null;
        }
      };

      const startRotation = () => {
        if (rotationTimer !== null) {
          return;
        }

        rotationTimer = window.setInterval(rotate, ROTATE_INTERVAL_MS);
      };

      group.addEventListener("pointerenter", stopRotation);
      group.addEventListener("pointerleave", startRotation);
      group.addEventListener("focusin", stopRotation);
      group.addEventListener("focusout", (event) => {
        if (group.contains(event.relatedTarget)) {
          return;
        }

        startRotation();
      });

      indicator.addEventListener("pointerenter", stopRotation);
      indicator.addEventListener("pointerleave", () => {
        startRotation();
      });
      indicator.addEventListener("focusin", stopRotation);
      indicator.addEventListener("focusout", (event) => {
        if (indicator.contains(event.relatedTarget)) {
          return;
        }

        startRotation();
      });

      dotNodes.forEach((dot, index) => {
        dot.addEventListener("pointerenter", () => {
          transitionToIndex(index);
        });

        dot.addEventListener("focus", () => {
          transitionToIndex(index);
        });

        dot.addEventListener("click", () => {
          transitionToIndex(index);
          stopRotation();
          startRotation();
        });
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          stopRotation(true);
          return;
        }

        startRotation();
      });

      const handleMobileLayoutChange = (event) => {
        if (event.matches) {
          startRotation();
        }
      };

      if (typeof mobileLayout.addEventListener === "function") {
        mobileLayout.addEventListener("change", handleMobileLayoutChange);
      } else if (typeof mobileLayout.addListener === "function") {
        mobileLayout.addListener(handleMobileLayoutChange);
      }

      startRotation();
    });
  }

  function setupProjectInfoCards() {
    const projectCards = Array.from(
      document.querySelectorAll("#work .stack-card, #additional-work .support-card")
    );

    if (!projectCards.length) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "project-reading-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div
        class="project-reading-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-reading-title"
        tabindex="-1"
      >
        <div class="project-reading-header">
          <div>
            <p class="project-reading-kicker">Project Description</p>
            <h3 class="project-reading-title" id="project-reading-title"></h3>
          </div>
          <button type="button" class="project-reading-close" aria-label="Close project description">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div class="project-reading-tags"></div>
        <div class="project-reading-actions"></div>
        <div class="project-reading-body"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeButton = overlay.querySelector(".project-reading-close");
    const titleSlot = overlay.querySelector(".project-reading-title");
    const tagsSlot = overlay.querySelector(".project-reading-tags");
    const actionsSlot = overlay.querySelector(".project-reading-actions");
    const bodySlot = overlay.querySelector(".project-reading-body");

    let restoreFocusTarget = null;

    const clearNode = (node) => {
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
    };

    const isOpen = () => overlay.classList.contains("is-open");

    const closeOverlay = () => {
      if (!isOpen()) {
        return;
      }

      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("project-reading-open");

      const nextFocusTarget = restoreFocusTarget;
      restoreFocusTarget = null;

      if (nextFocusTarget instanceof HTMLElement) {
        nextFocusTarget.focus();
      }
    };

    const openOverlay = (card, trigger) => {
      const title =
        card.querySelector("h3")?.textContent?.trim() ||
        card.querySelector(".feature-link[href]")?.textContent?.trim() ||
        "Project";
      const tagSource = card.querySelector(".experience-tags");
      const summarySource = card.querySelector(".feature-summary");
      const summaryText = card.dataset.projectSummary?.trim() || "";
      const pointsSource = card.querySelector(".feature-points");
      const actionLinks = Array.from(card.querySelectorAll(".feature-link[href]"));

      restoreFocusTarget = trigger;

      titleSlot.textContent = title;
      clearNode(tagsSlot);
      clearNode(actionsSlot);
      clearNode(bodySlot);

      if (tagSource) {
        tagsSlot.appendChild(tagSource.cloneNode(true));
      }

      actionLinks.forEach((link) => {
        actionsSlot.appendChild(link.cloneNode(true));
      });

      if (summarySource) {
        const summaryClone = summarySource.cloneNode(true);
        summaryClone.className = "project-reading-summary";
        bodySlot.appendChild(summaryClone);
      } else if (summaryText) {
        const summaryClone = document.createElement("p");
        summaryClone.className = "project-reading-summary";
        summaryClone.textContent = summaryText;
        bodySlot.appendChild(summaryClone);
      }

      if (pointsSource) {
        const pointsClone = pointsSource.cloneNode(true);
        pointsClone.className = "project-reading-points";
        bodySlot.appendChild(pointsClone);
      }

      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("project-reading-open");

      requestAnimationFrame(() => {
        closeButton.focus();
      });
    };

    projectCards.forEach((card) => {
      const descriptionAnchor = card.querySelector(".feature-summary, .feature-points");
      const glanceText = card.dataset.projectGlance?.trim() || "";
      const title = card.querySelector("h3")?.textContent?.trim() || "project";
      const existingActionLinks = Array.from(card.querySelectorAll(".feature-link[href]"));

      if (!descriptionAnchor) {
        return;
      }

      card.setAttribute("data-project-info-ready", "true");

      const infoButton = document.createElement("button");
      infoButton.type = "button";
      infoButton.className = "feature-link project-info-trigger";
      infoButton.textContent = "Description";
      infoButton.setAttribute("aria-haspopup", "dialog");
      infoButton.setAttribute("aria-label", `Open description for ${title}`);

      const actionsRow = document.createElement("div");
      actionsRow.className = "project-card-actions";

      existingActionLinks.forEach((link) => {
        actionsRow.appendChild(link);
      });

      actionsRow.appendChild(infoButton);

      if (glanceText) {
        const glance = document.createElement("p");
        glance.className = "project-glance";
        glance.textContent = glanceText;
        descriptionAnchor.insertAdjacentElement("beforebegin", glance);
        glance.insertAdjacentElement("afterend", actionsRow);
      } else {
        descriptionAnchor.insertAdjacentElement("beforebegin", actionsRow);
      }

      infoButton.addEventListener("click", () => {
        openOverlay(card, infoButton);
      });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeOverlay();
      }
    });

    closeButton.addEventListener("click", closeOverlay);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        closeOverlay();
      }
    });
  }

  function setupAboutInteractive() {
    const aboutSection = document.getElementById("about");
    if (!aboutSection) {
      return;
    }

    const segments = Array.from(
      aboutSection.querySelectorAll(".about-segment[data-about-target]")
    );
    const cards = Array.from(
      aboutSection.querySelectorAll(".about-card[data-about-card]")
    );
    const panels = Array.from(
      aboutSection.querySelectorAll(".about-detail[data-about-panel]")
    );

    if (!segments.length || !cards.length || !panels.length) {
      return;
    }

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const cardVisibility = new Map();

    cards.forEach((card) => cardVisibility.set(card, 0));
    panels.forEach((panel) => panel.classList.toggle("is-active", false));

    let activeKey =
      segments.find((segment) => segment.classList.contains("is-active"))?.dataset.aboutTarget ||
      cards[0].dataset.aboutCard ||
      "build";

    const setActive = (key) => {
      if (!key) {
        return;
      }

      activeKey = key;

      segments.forEach((segment) => {
        const isActive = segment.dataset.aboutTarget === key;
        segment.classList.toggle("is-active", isActive);
        segment.setAttribute("aria-selected", String(isActive));
        segment.tabIndex = isActive ? 0 : -1;
      });

      cards.forEach((card) => {
        const isActive = card.dataset.aboutCard === key;
        card.classList.toggle("segment-active", isActive);
        card.classList.toggle("is-focused", isActive);
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.aboutPanel === key;
        panel.classList.toggle("is-active", isActive);
        panel.setAttribute("aria-hidden", String(!isActive));
      });
    };

    const focusMostVisibleCard = () => {
      let bestCard = cards[0];
      let bestRatio = -1;

      cards.forEach((card) => {
        const ratio = cardVisibility.get(card) || 0;
        if (ratio > bestRatio) {
          bestCard = card;
          bestRatio = ratio;
        }
      });

      const isFocusedMode = bestRatio > 0.22 && window.innerWidth > 720;
      aboutSection.classList.toggle("about-focus-mode", isFocusedMode);

      if (isFocusedMode) {
        const nextKey = bestCard.dataset.aboutCard;
        if (nextKey && nextKey !== activeKey) {
          setActive(nextKey);
        }
      }
    };

    const focusObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          cardVisibility.set(entry.target, entry.intersectionRatio);
        });
        focusMostVisibleCard();
      },
      {
        rootMargin: "-18% 0px -18% 0px",
        threshold: [0, 0.18, 0.35, 0.55, 0.75],
      }
    );

    cards.forEach((card) => {
      focusObserver.observe(card);

      card.addEventListener("click", () => {
        const key = card.dataset.aboutCard;
        if (key) {
          setActive(key);
        }
      });

      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        const key = card.dataset.aboutCard;
        if (key) {
          setActive(key);
        }
      });
    });

    segments.forEach((segment) => {
      segment.addEventListener("click", () => {
        const key = segment.dataset.aboutTarget;
        if (!key) {
          return;
        }

        setActive(key);
      });

      segment.addEventListener("keydown", (event) => {
        const currentIndex = segments.indexOf(segment);
        if (currentIndex === -1) {
          return;
        }

        let nextIndex = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          nextIndex = (currentIndex + 1) % segments.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          nextIndex = (currentIndex - 1 + segments.length) % segments.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = segments.length - 1;
        }

        if (nextIndex === null) {
          return;
        }

        event.preventDefault();
        const nextSegment = segments[nextIndex];
        const nextKey = nextSegment?.dataset.aboutTarget;
        if (!nextKey) {
          return;
        }

        setActive(nextKey);
        nextSegment.focus();
      });
    });

    if (!prefersReducedMotion) {
      const resetCardTilt = (card) => {
        card.style.setProperty("--about-tilt-x", "0deg");
        card.style.setProperty("--about-tilt-y", "0deg");
        card.style.setProperty("--about-lift", "0px");
      };

      cards.forEach((card) => {
        card.addEventListener("pointermove", (event) => {
          if (!finePointer.matches) {
            return;
          }

          const rect = card.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          const rotateX = (0.5 - py) * 5.5;
          const rotateY = (px - 0.5) * 6.2;

          card.style.setProperty("--about-tilt-x", `${rotateX.toFixed(2)}deg`);
          card.style.setProperty("--about-tilt-y", `${rotateY.toFixed(2)}deg`);
          card.style.setProperty("--about-lift", "-6px");
        });

        card.addEventListener("pointerleave", () => resetCardTilt(card));
        card.addEventListener("pointercancel", () => resetCardTilt(card));
      });
    }

    setActive(activeKey);
    focusMostVisibleCard();
    window.addEventListener("resize", focusMostVisibleCard);
  }

  function setupExperienceWheel() {
    const grid = document.querySelector(".experience-grid");
    const cards = Array.from(grid?.querySelectorAll(".experience-card") || []);
    const timelineSteps = Array.from(document.querySelectorAll(".timeline-step[data-job-index]"));
    const scrollbar = document.querySelector(".experience-scrollbar");
    const scrollbarThumb = scrollbar?.querySelector(".experience-scrollbar-thumb");

    if (!grid || !cards.length) {
      return;
    }

    const desktopLayout = window.matchMedia("(min-width: 721px)");
    const wheelClasses = [
      "wheel-active",
      "wheel-left-1",
      "wheel-left-2",
      "wheel-left-3",
      "wheel-left-4",
      "wheel-right-1",
      "wheel-right-2",
      "wheel-right-3",
      "wheel-right-4",
    ];

    const latestIndex = cards.length - 1;
    let activeIndex = latestIndex;
    let scrollTicking = false;
    let lockedActiveIndex = null;
    let unlockTimerId = null;

    const clampIndex = (index) => Math.min(Math.max(index, 0), cards.length - 1);
    const resolveStepIndex = (step, fallbackIndex) => {
      const parsed = Number(step.getAttribute("data-job-index"));
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return clampIndex(parsed);
      }

      return clampIndex(fallbackIndex);
    };

    const updateEdgeGutters = () => {
      if (!desktopLayout.matches) {
        grid.style.setProperty("--wheel-edge-gutter", "0px");
        return;
      }

      const referenceCard = cards[0];
      if (!referenceCard) {
        return;
      }

      const gutter = Math.max((grid.clientWidth - referenceCard.clientWidth) / 2, 0);
      grid.style.setProperty("--wheel-edge-gutter", `${gutter.toFixed(1)}px`);
    };

    const updateScrollIndicator = () => {
      if (!scrollbar || !scrollbarThumb) {
        return;
      }

      const maxLeft = Math.max(grid.scrollWidth - grid.clientWidth, 0);
      if (maxLeft <= 1 || grid.clientWidth <= 0) {
        scrollbar.classList.add("is-hidden");
        return;
      }

      scrollbar.classList.remove("is-hidden");

      const trackWidth = scrollbar.clientWidth;
      if (trackWidth <= 0) {
        return;
      }

      const viewportRatio = Math.min(grid.clientWidth / grid.scrollWidth, 1);
      const thumbWidth = Math.max(Math.round(trackWidth * viewportRatio), 34);
      const travel = Math.max(trackWidth - thumbWidth, 0);
      const progress = maxLeft > 0 ? grid.scrollLeft / maxLeft : 0;
      const x = travel * progress;

      scrollbarThumb.style.width = `${thumbWidth}px`;
      scrollbarThumb.style.transform = `translateX(${x.toFixed(1)}px)`;
    };

    const applyWheelState = () => {
      cards.forEach((card, index) => {
        card.classList.remove(...wheelClasses);
        card.removeAttribute("aria-current");

        const delta = index - activeIndex;
        if (delta === 0) {
          card.classList.add("wheel-active");
          card.setAttribute("aria-current", "true");
          return;
        }

        if (delta < 0) {
          card.classList.add(`wheel-left-${Math.min(Math.abs(delta), 4)}`);
          return;
        }

        card.classList.add(`wheel-right-${Math.min(delta, 4)}`);
      });

      timelineSteps.forEach((step, index) => {
        const stepIndex = resolveStepIndex(step, index);
        const isActive = stepIndex === activeIndex;
        step.classList.toggle("is-active", isActive);
        if (isActive) {
          step.setAttribute("aria-current", "true");
        } else {
          step.removeAttribute("aria-current");
        }
      });
    };

    const centerCard = (index, behavior = "auto") => {
      updateEdgeGutters();

      const card = cards[clampIndex(index)];
      if (!card) {
        return;
      }

      const rawLeft = card.offsetLeft - (grid.clientWidth - card.clientWidth) / 2;
      const maxLeft = Math.max(grid.scrollWidth - grid.clientWidth, 0);
      const nextLeft = Math.min(Math.max(rawLeft, 0), maxLeft);
      grid.scrollTo({ left: nextLeft, behavior });
      updateScrollIndicator();
    };

    const findCenteredIndex = () => {
      const gridRect = grid.getBoundingClientRect();
      const viewportCenter = gridRect.left + gridRect.width * 0.5;

      return cards.reduce(
        (best, card, index) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width * 0.5;
          const distance = Math.abs(cardCenter - viewportCenter);

          if (distance < best.distance) {
            return { index, distance };
          }

          return best;
        },
        { index: activeIndex, distance: Number.POSITIVE_INFINITY }
      ).index;
    };

    const syncFromScroll = () => {
      updateScrollIndicator();
      const centeredIndex = findCenteredIndex();
      if (centeredIndex === activeIndex) {
        return;
      }

      activeIndex = centeredIndex;
      applyWheelState();
    };

    const navigateToCard = (index, behavior = "smooth") => {
      activeIndex = clampIndex(index);
      applyWheelState();

      lockedActiveIndex = activeIndex;
      if (unlockTimerId !== null) {
        window.clearTimeout(unlockTimerId);
      }
      unlockTimerId = window.setTimeout(() => {
        lockedActiveIndex = null;
        unlockTimerId = null;
      }, 900);

      centerCard(activeIndex, behavior);
      if (behavior === "auto") {
        requestAnimationFrame(() => {
          lockedActiveIndex = null;
          if (unlockTimerId !== null) {
            window.clearTimeout(unlockTimerId);
            unlockTimerId = null;
          }
          syncFromScroll();
        });
      }
    };

    const onGridScroll = () => {
      if (scrollTicking) {
        return;
      }

      scrollTicking = true;
      requestAnimationFrame(() => {
        updateScrollIndicator();

        if (lockedActiveIndex !== null) {
          const centeredIndex = findCenteredIndex();
          if (centeredIndex !== lockedActiveIndex) {
            scrollTicking = false;
            return;
          }

          lockedActiveIndex = null;
          if (unlockTimerId !== null) {
            window.clearTimeout(unlockTimerId);
            unlockTimerId = null;
          }
        }

        syncFromScroll();
        scrollTicking = false;
      });
    };

    const initializeWheel = () => {
      activeIndex = latestIndex;
      applyWheelState();
      updateEdgeGutters();
      centerCard(activeIndex);
      requestAnimationFrame(syncFromScroll);
    };

    cards.forEach((card, index) => {
      card.addEventListener("click", () => {
        navigateToCard(index, "smooth");
      });
    });

    timelineSteps.forEach((step, index) => {
      step.addEventListener("click", () => {
        navigateToCard(resolveStepIndex(step, index), "smooth");
      });
    });

    const onGridWheel = (event) => {
      if (!desktopLayout.matches) {
        return;
      }

      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      window.scrollBy({
        top: event.deltaY,
        left: 0,
        behavior: "auto",
      });
    };

    grid.addEventListener("scroll", onGridScroll, { passive: true });
    grid.addEventListener("wheel", onGridWheel, { passive: false });

    const handleLayoutChange = (event) => {
      lockedActiveIndex = null;
      if (unlockTimerId !== null) {
        window.clearTimeout(unlockTimerId);
        unlockTimerId = null;
      }

      if (!event.matches) {
        updateEdgeGutters();
        applyWheelState();
        centerCard(activeIndex, "auto");
        syncFromScroll();
        return;
      }

      updateEdgeGutters();
      centerCard(activeIndex);
      syncFromScroll();
    };

    if (typeof desktopLayout.addEventListener === "function") {
      desktopLayout.addEventListener("change", handleLayoutChange);
    } else if (typeof desktopLayout.addListener === "function") {
      desktopLayout.addListener(handleLayoutChange);
    }

    window.addEventListener("resize", () => {
      updateEdgeGutters();
      centerCard(activeIndex, "auto");
      syncFromScroll();
    });

    window.addEventListener(
      "load",
      () => {
        updateEdgeGutters();
        centerCard(activeIndex, "auto");
        syncFromScroll();
      },
      { once: true }
    );

    initializeWheel();
  }

  function setupRevealStagger() {
    const groups = document.querySelectorAll(
      ".hero-actions-bridge, .hero-panel, .proof-strip, .experience-timeline, .experience-grid, .flagship-grid, .support-grid, .about-architecture, .about-segmented, .about-detail-stage, .about-grid, .contact-grid"
    );

    groups.forEach((group, groupIndex) => {
      let items = Array.from(group.children).filter((item) => item.classList.contains("reveal"));
      if (!items.length && group.classList.contains("reveal")) {
        items = [group];
      }

      items.forEach((item, index) => {
        const wave = index % 2 === 0 ? 0 : 35;
        const delay = Math.min(groupIndex * 30 + index * 90 + wave, 680);
        item.style.setProperty("--reveal-delay", `${delay}ms`);
      });
    });
  }

  function setupSectionMotionParallax() {
    const layers = Array.from(document.querySelectorAll(".section-motion"));
    if (!layers.length || prefersReducedMotion) {
      return;
    }

    let ticking = false;

    const update = () => {
      const viewportCenter = window.innerHeight * 0.5;

      layers.forEach((layer) => {
        const section = layer.closest("section");
        if (!section) {
          return;
        }

        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height * 0.5;
        const centerDelta = (viewportCenter - sectionCenter) / window.innerHeight;
        const shapes = layer.querySelectorAll(".motion-shape");

        shapes.forEach((shape) => {
          const depth = Number(shape.getAttribute("data-depth") || "12");
          const y = centerDelta * depth;
          shape.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
        });
      });

      ticking = false;
    };

    update();

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) {
          return;
        }

        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    window.addEventListener("resize", update);
  }

  function setupHeroParallax() {
    if (prefersReducedMotion) {
      return;
    }

    const hero = document.getElementById("hero");
    const heroCore = hero?.querySelector(".hero-core");
    const heroPanel = hero?.querySelector(".hero-panel");

    if (!hero || !heroCore || !heroPanel) {
      return;
    }

    let ticking = false;

    const update = () => {
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(Math.min((window.innerHeight - rect.top) / window.innerHeight, 1.4), 0);
      const coreOffset = (progress - 0.4) * -14;
      const panelOffset = (progress - 0.4) * -22;

      if (window.innerWidth <= 900) {
        heroCore.style.transform = "";
        heroPanel.style.transform = "";
      } else {
        heroCore.style.transform = `translate3d(0, ${coreOffset.toFixed(2)}px, 0)`;
        heroPanel.style.transform = `translate3d(0, ${panelOffset.toFixed(2)}px, 0)`;
      }

      ticking = false;
    };

    update();

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) {
          return;
        }

        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    window.addEventListener("resize", update);
  }

  setupDropdownAnimation();
  setupScrollProgress();
  setupCopyEmailAction();
  setupActiveNav();
  setupMetricCountUp();
  setupFocusCardTilt();
  setupHeroFocusRotation();
  setupProjectInfoCards();
  setupAboutInteractive();
  setupExperienceWheel();
  setupRevealStagger();
  setupSectionMotionParallax();
  setupHeroParallax();
})();
