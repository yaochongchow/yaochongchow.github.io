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

  function setupAnchorNavigation() {
    const anchorLinks = Array.from(document.querySelectorAll("a[href^='#']"));
    if (!anchorLinks.length) {
      return;
    }

    const getNavbarOffset = () => {
      const navbar = document.getElementById("navbar");
      return Math.round((navbar?.getBoundingClientRect().height || 0) + 12);
    };

    const scrollToHash = (hash, { behavior = "smooth", updateHistory = false } = {}) => {
      const id = hash.replace(/^#/, "");
      const target = id ? document.getElementById(id) : null;
      if (!target) {
        return;
      }

      const absoluteTop = target.getBoundingClientRect().top + window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      const nextTop = Math.min(Math.max(absoluteTop - getNavbarOffset(), 0), maxScroll);

      window.scrollTo({ top: nextTop, behavior });

      if (updateHistory && window.location.hash !== `#${id}`) {
        window.history.pushState(null, "", `#${id}`);
      }
    };

    anchorLinks.forEach((link) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") {
        return;
      }

      link.addEventListener("click", (event) => {
        event.preventDefault();
        scrollToHash(hash, {
          behavior: prefersReducedMotion ? "auto" : "smooth",
          updateHistory: true,
        });
      });
    });

    const syncHashOnLoad = () => {
      if (!window.location.hash) {
        return;
      }

      scrollToHash(window.location.hash, { behavior: "auto" });
    };

    window.addEventListener("load", syncHashOnLoad);
    window.addEventListener("hashchange", () => {
      if (!window.location.hash) {
        return;
      }

      scrollToHash(window.location.hash, { behavior: "auto" });
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

      const atBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 2;
      if (atBottom && orderedSections.length) {
        return orderedSections[orderedSections.length - 1].id;
      }

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
    const metrics = Array.from(document.querySelectorAll("#what-i-build .proof-stat strong"));
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
      let touchStartX = 0;
      let touchStartY = 0;

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

      const moveBy = (offset) => {
        const nextIndex = (activeIndex + offset + cards.length) % cards.length;
        transitionToIndex(nextIndex);
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

      group.addEventListener(
        "touchstart",
        (event) => {
          const touch = event.touches[0];
          if (!touch) {
            return;
          }

          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
        },
        { passive: true }
      );

      group.addEventListener(
        "touchend",
        (event) => {
          const touch = event.changedTouches[0];
          if (!touch) {
            return;
          }

          const deltaX = touch.clientX - touchStartX;
          const deltaY = touch.clientY - touchStartY;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          touchStartX = 0;
          touchStartY = 0;

          if (!mobileLayout.matches || absX < 42 || absX <= absY) {
            return;
          }

          moveBy(deltaX < 0 ? 1 : -1);
          stopRotation(true);
          startRotation();
        },
        { passive: true }
      );

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
    const PRIMARY_PROJECT_TAG_LIMIT = 4;

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

    const buildTagGroup = (labels, className) => {
      const group = document.createElement("div");
      group.className = className;

      labels.forEach((label) => {
        const pill = document.createElement("span");
        pill.textContent = label;
        group.appendChild(pill);
      });

      return group;
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
        const tagLabels = Array.from(tagSource.querySelectorAll("span"))
          .map((tag) => tag.textContent?.trim() || "")
          .filter(Boolean);

        if (tagLabels.length) {
          const primaryTags = tagLabels.slice(0, PRIMARY_PROJECT_TAG_LIMIT);
          const secondaryTags = tagLabels.slice(PRIMARY_PROJECT_TAG_LIMIT);

          tagsSlot.appendChild(
            buildTagGroup(primaryTags, "experience-tags project-reading-tags-primary")
          );

          if (secondaryTags.length) {
            const secondaryBlock = document.createElement("div");
            secondaryBlock.className = "project-reading-tags-secondary";

            const secondaryLabel = document.createElement("p");
            secondaryLabel.className = "project-reading-tags-note";
            secondaryLabel.textContent = "Also used";
            secondaryBlock.appendChild(secondaryLabel);
            secondaryBlock.appendChild(
              buildTagGroup(secondaryTags, "experience-tags project-reading-tags-muted")
            );

            tagsSlot.appendChild(secondaryBlock);
          }
        }
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

  function setupSkillExplorer() {
    const explorer = document.querySelector(".skill-explorer");
    if (!explorer) {
      return;
    }

    const segments = Array.from(
      explorer.querySelectorAll(".skill-segment[data-skill-target]")
    );
    const panels = Array.from(
      explorer.querySelectorAll(".skill-panel[data-skill-panel]")
    );

    if (!segments.length || !panels.length) {
      return;
    }

    const panelState = new Map();
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    const getPanel = (key) =>
      panels.find((panel) => panel.dataset.skillPanel === key) || null;

    const getCards = (key) =>
      Array.from(getPanel(key)?.querySelectorAll(".skill-card[data-skill-card]") || []);

    const getDetails = (key) =>
      Array.from(getPanel(key)?.querySelectorAll(".skill-detail[data-skill-detail]") || []);

    const getDefaultCard = (key) => getCards(key)[0]?.dataset.skillCard || null;

    const setActiveCard = (panelKey, cardKey) => {
      const cards = getCards(panelKey);
      const details = getDetails(panelKey);
      const nextCardKey = cardKey || panelState.get(panelKey) || getDefaultCard(panelKey);

      if (!nextCardKey) {
        return;
      }

      panelState.set(panelKey, nextCardKey);

      cards.forEach((card) => {
        const isActive = card.dataset.skillCard === nextCardKey;
        card.classList.toggle("is-active", isActive);
        card.setAttribute("aria-pressed", String(isActive));
      });

      details.forEach((detail) => {
        const isActive = detail.dataset.skillDetail === nextCardKey;
        detail.classList.toggle("is-active", isActive);
        detail.setAttribute("aria-hidden", String(!isActive));
      });
    };

    const setActivePanel = (panelKey) => {
      if (!panelKey) {
        return;
      }

      segments.forEach((segment) => {
        const isActive = segment.dataset.skillTarget === panelKey;
        segment.classList.toggle("is-active", isActive);
        segment.setAttribute("aria-selected", String(isActive));
        segment.tabIndex = isActive ? 0 : -1;
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.skillPanel === panelKey;
        panel.classList.toggle("is-active", isActive);
        panel.setAttribute("aria-hidden", String(!isActive));
      });

      setActiveCard(panelKey, panelState.get(panelKey) || getDefaultCard(panelKey));
    };

    segments.forEach((segment) => {
      segment.addEventListener("click", () => {
        const key = segment.dataset.skillTarget;
        if (key) {
          setActivePanel(key);
        }
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
        const nextKey = nextSegment?.dataset.skillTarget;
        if (!nextKey) {
          return;
        }

        setActivePanel(nextKey);
        nextSegment.focus();
      });
    });

    panels.forEach((panel) => {
      const panelKey = panel.dataset.skillPanel;
      if (!panelKey) {
        return;
      }

      const cards = getCards(panelKey);

      cards.forEach((card) => {
        card.addEventListener("click", () => {
          const cardKey = card.dataset.skillCard;
          if (cardKey) {
            setActiveCard(panelKey, cardKey);
          }
        });

        card.addEventListener("focus", () => {
          const cardKey = card.dataset.skillCard;
          if (cardKey) {
            setActiveCard(panelKey, cardKey);
          }
        });

        card.addEventListener("pointerenter", () => {
          if (!finePointer.matches) {
            return;
          }

          const cardKey = card.dataset.skillCard;
          if (cardKey) {
            setActiveCard(panelKey, cardKey);
          }
        });

        card.addEventListener("keydown", (event) => {
          const currentIndex = cards.indexOf(card);
          if (currentIndex === -1) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const cardKey = card.dataset.skillCard;
            if (cardKey) {
              setActiveCard(panelKey, cardKey);
            }
            return;
          }

          let nextIndex = null;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % cards.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + cards.length) % cards.length;
          } else if (event.key === "Home") {
            nextIndex = 0;
          } else if (event.key === "End") {
            nextIndex = cards.length - 1;
          }

          if (nextIndex === null) {
            return;
          }

          event.preventDefault();
          cards[nextIndex]?.focus();
        });
      });
    });

    const initialPanel =
      segments.find((segment) => segment.classList.contains("is-active"))?.dataset.skillTarget ||
      panels[0]?.dataset.skillPanel;

    if (initialPanel) {
      setActivePanel(initialPanel);
    }
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

      const isFocusedMode = bestRatio > 0.22 && window.innerWidth > 960;
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
    const track = document.querySelector(".timeline-track");
    const cards = Array.from(track?.querySelectorAll(".experience-card[data-job-index]") || []);
    const timelineSteps = Array.from(track?.querySelectorAll(".timeline-step[data-job-index]") || []);

    if (!track || !cards.length || !timelineSteps.length) {
      return;
    }

    const clampIndex = (index) => Math.min(Math.max(index, 0), cards.length - 1);
    const resolveIndex = (node, fallbackIndex) => {
      const parsed = Number(node.getAttribute("data-job-index"));
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return clampIndex(parsed);
      }

      return clampIndex(fallbackIndex);
    };

    const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    let activeIndex = resolveIndex(cards[0], 0);

    const setActive = (targetIndex, { scrollIntoView = false } = {}) => {
      activeIndex = clampIndex(targetIndex);

      timelineSteps.forEach((step, index) => {
        const isActive = resolveIndex(step, index) === activeIndex;
        step.classList.toggle("is-active", isActive);
        step.setAttribute("aria-expanded", String(isActive));
        if (isActive) {
          step.setAttribute("aria-current", "true");
        } else {
          step.removeAttribute("aria-current");
        }
      });

      cards.forEach((card, index) => {
        const isActive = resolveIndex(card, index) === activeIndex;
        card.classList.toggle("is-expanded", isActive);
        card.setAttribute("aria-expanded", String(isActive));
        if (isActive) {
          card.setAttribute("aria-current", "true");
          if (scrollIntoView) {
            card.scrollIntoView({ block: "nearest", behavior: scrollBehavior });
          }
        } else {
          card.removeAttribute("aria-current");
        }
      });
    };

    timelineSteps.forEach((step, index) => {
      step.addEventListener("click", () => {
        setActive(resolveIndex(step, index), { scrollIntoView: true });
      });

      step.addEventListener("keydown", (event) => {
        const currentIndex = resolveIndex(step, index);
        let nextIndex = null;

        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          nextIndex = currentIndex + 1;
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          nextIndex = currentIndex - 1;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = cards.length - 1;
        }

        if (nextIndex === null) {
          return;
        }

        event.preventDefault();
        const boundedIndex = clampIndex(nextIndex);
        setActive(boundedIndex, { scrollIntoView: true });
        timelineSteps[boundedIndex]?.focus();
      });
    });

    cards.forEach((card, index) => {
      const cardIndex = resolveIndex(card, index);

      card.addEventListener("click", (event) => {
        if (event.target.closest(".timeline-step")) {
          return;
        }

        if (cardIndex === activeIndex) {
          return;
        }

        setActive(cardIndex, { scrollIntoView: true });
      });
    });

    setActive(activeIndex);
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

      if (window.innerWidth <= 960) {
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
  setupAnchorNavigation();
  setupActiveNav();
  setupMetricCountUp();
  setupFocusCardTilt();
  setupHeroFocusRotation();
  setupSkillExplorer();
  setupProjectInfoCards();
  setupAboutInteractive();
  setupExperienceWheel();
  setupRevealStagger();
  setupSectionMotionParallax();
  setupHeroParallax();
})();
