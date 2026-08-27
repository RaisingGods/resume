/* BRASS HQ — shared behaviour */
(function () {
  "use strict";

  var prefersReducedMotionMQ = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var prefersReducedMotion = !!(prefersReducedMotionMQ && prefersReducedMotionMQ.matches);
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* Smooth, inertia-driven scroll — skipped entirely under reduced motion
     so the browser falls back to plain native scrolling. */
  var lenis = null;
  if (!prefersReducedMotion && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    if (hasGSAP) {
      lenis.on("scroll", hasScrollTrigger ? ScrollTrigger.update : function () {});
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      });
    }
  }

  /* Context-aware nav — transparent over the hero, solid once scrolled */
  var header = document.querySelector(".site-header");
  if (header) {
    var updateHeaderState = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  }

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Scroll-reveal */
  var revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Stat counters */
  var counters = document.querySelectorAll("[data-count-to]");

  function animateCount(el) {
    var target = parseFloat(el.dataset.countTo);
    var suffix = el.dataset.countSuffix || "";
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(target * eased);
      el.textContent = value + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }

    window.requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && counters.length) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach(function (el) {
      countObserver.observe(el);
    });
  } else {
    counters.forEach(function (el) {
      el.textContent = el.dataset.countTo + (el.dataset.countSuffix || "");
    });
  }

  /* Kinetic typography — staggered line-mask reveal.
     Each word is temporarily wrapped to measure which visual line it falls
     on (line breaks depend on viewport width), then the words on each line
     are regrouped into an overflow:hidden mask with an inner span that
     slides up from below — the "feeding up" effect, one line at a time. */
  function buildLineReveal(el) {
    if (!el.__lrSource) el.__lrSource = el.innerHTML;
    el.innerHTML = el.__lrSource;

    function walk(node, wrapTag) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/).filter(function (p) { return p.length; });
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            var span = document.createElement("span");
            span.className = "lr-word";
            span.dataset.wrapTag = wrapTag || "";
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child, child.tagName.toLowerCase());
        }
      });
    }
    walk(el, null);

    var words = Array.prototype.slice.call(el.querySelectorAll(".lr-word"));
    var lines = [];
    var lastTop = null;
    words.forEach(function (w) {
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) {
        lines.push([]);
        lastTop = top;
      }
      lines[lines.length - 1].push(w);
    });

    el.innerHTML = "";
    lines.forEach(function (lineWords, i) {
      var mask = document.createElement("span");
      mask.className = "line-mask";
      var inner = document.createElement("span");
      inner.className = "line-mask__inner";
      inner.style.transitionDelay = (i * 0.08).toFixed(2) + "s";
      lineWords.forEach(function (w, wi) {
        var wrapTag = w.dataset.wrapTag;
        var node = wrapTag ? document.createElement(wrapTag) : document.createTextNode(w.textContent);
        if (wrapTag) { node.textContent = w.textContent; }
        inner.appendChild(node);
        if (wi < lineWords.length - 1) inner.appendChild(document.createTextNode(" "));
      });
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < lines.length - 1) el.appendChild(document.createTextNode(" "));
    });

    el.classList.add("lr-armed");
  }

  var lineRevealEls = document.querySelectorAll("[data-line-reveal]");
  if (lineRevealEls.length) {
    lineRevealEls.forEach(function (el) { buildLineReveal(el); });

    if (!prefersReducedMotion) {
      /* Hero headlines are already in view at load — play the entrance
         immediately rather than waiting on a scroll trigger. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          lineRevealEls.forEach(function (el) {
            setTimeout(function () { el.classList.add("is-visible"); }, 150);
          });
        });
      });

      var lrResizeTimer;
      window.addEventListener("resize", function () {
        clearTimeout(lrResizeTimer);
        lrResizeTimer = setTimeout(function () {
          lineRevealEls.forEach(function (el) {
            var wasVisible = el.classList.contains("is-visible");
            buildLineReveal(el);
            if (wasVisible) { el.classList.add("is-visible"); }
          });
        }, 200);
      });
    } else {
      lineRevealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* Ambient motion — magnetic buttons, custom cursor, drifting particles */
  var hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  if (!prefersReducedMotion && hasFinePointer) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x * 0.18).toFixed(1) + "px, " + (y * 0.35).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });

    var glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);
    var glowRaf = null;
    var glowX = 0;
    var glowY = 0;

    document.addEventListener("mousemove", function (e) {
      glowX = e.clientX;
      glowY = e.clientY;
      glow.classList.add("is-active");
      if (!glowRaf) {
        glowRaf = requestAnimationFrame(function () {
          glow.style.transform = "translate(" + glowX + "px, " + glowY + "px)";
          glowRaf = null;
        });
      }
    });

    document.addEventListener("mouseleave", function () {
      glow.classList.remove("is-active");
    });

    /* Custom cursor — a small dot that tracks the pointer, expanding into
       a text label when hovering anything tagged data-cursor-label. */
    document.documentElement.classList.add("has-custom-cursor");

    var cursorDot = document.createElement("div");
    cursorDot.className = "cursor-dot";
    var cursorLabel = document.createElement("div");
    cursorLabel.className = "cursor-label";
    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorLabel);

    var moveDot, moveLabel;
    if (hasGSAP) {
      var setDotX = gsap.quickTo(cursorDot, "x", { duration: 0.18, ease: "power3" });
      var setDotY = gsap.quickTo(cursorDot, "y", { duration: 0.18, ease: "power3" });
      var setLabelX = gsap.quickTo(cursorLabel, "x", { duration: 0.32, ease: "power3" });
      var setLabelY = gsap.quickTo(cursorLabel, "y", { duration: 0.32, ease: "power3" });
      moveDot = function (x, y) { setDotX(x); setDotY(y); };
      moveLabel = function (x, y) { setLabelX(x); setLabelY(y); };
    } else {
      moveDot = function (x, y) { cursorDot.style.transform = "translate(" + x + "px," + y + "px)"; };
      moveLabel = function (x, y) { cursorLabel.style.transform = "translate(" + x + "px," + y + "px)"; };
    }

    document.addEventListener("mousemove", function (e) {
      moveDot(e.clientX, e.clientY);
      moveLabel(e.clientX, e.clientY);
      cursorDot.classList.add("is-active");
    });

    document.addEventListener("mouseleave", function () {
      cursorDot.classList.remove("is-active");
      cursorLabel.classList.remove("is-active");
    });

    document.querySelectorAll("[data-cursor-label]").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        cursorLabel.textContent = el.dataset.cursorLabel;
        cursorLabel.classList.add("is-active");
        cursorDot.classList.add("is-hovering");
      });
      el.addEventListener("mouseleave", function () {
        cursorLabel.classList.remove("is-active");
        cursorDot.classList.remove("is-hovering");
      });
    });
  }

  if (!prefersReducedMotion) {
    document.querySelectorAll(".section--burgundy").forEach(function (section) {
      if (section.querySelector(".particle-field")) return;
      var field = document.createElement("div");
      field.className = "particle-field";
      field.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 6; i++) {
        var span = document.createElement("span");
        var size = 3 + Math.random() * 4;
        span.style.setProperty("--size", size.toFixed(1) + "px");
        span.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
        span.style.setProperty("--dur", (12 + Math.random() * 10).toFixed(1) + "s");
        span.style.setProperty("--delay", (Math.random() * -20).toFixed(1) + "s");
        span.style.setProperty("--drift", (Math.random() * 40 - 20).toFixed(1) + "px");
        field.appendChild(span);
      }
      section.insertBefore(field, section.firstChild);
    });
  }

  /* Signature interaction — the Safe Influence Framework builds itself.
     With GSAP + ScrollTrigger available, the diagram column pins in place
     while the SVG line draws continuously (scrubbed to scroll position,
     not a timer) and each step lights up in turn — genuine pinned
     storytelling. Falls back to the plain IntersectionObserver version
     (sticky via CSS, discrete step activation) if either library failed
     to load. */
  var fwSteps = document.querySelectorAll(".fw-step");
  var fwFill = document.querySelector(".fw-svg__fill");
  var fwMap = document.querySelector(".framework-map");
  var fwSticky = document.querySelector(".framework-map .split__sticky");

  if (fwSteps.length && hasScrollTrigger && fwMap && fwSticky && window.matchMedia("(min-width: 880px)").matches) {
    var fwTotalP = fwSteps.length - 1;
    var fwLineLengthP = 420;
    var fwActiveMaxP = -1;

    ScrollTrigger.create({
      trigger: fwMap,
      start: "top top+=90",
      end: "bottom bottom",
      pin: fwSticky,
      pinSpacing: false,
      scrub: 0.6,
      onUpdate: function (self) {
        if (fwFill) {
          fwFill.style.strokeDashoffset = (fwLineLengthP * (1 - self.progress)).toFixed(1);
        }
        var activeIndex = Math.round(self.progress * fwTotalP);
        if (activeIndex > fwActiveMaxP) fwActiveMaxP = activeIndex;
        fwSteps.forEach(function (step, i) {
          var isActive = i <= fwActiveMaxP;
          step.classList.toggle("is-active", isActive);
          var node = document.querySelector('.fw-svg__node[data-node-index="' + i + '"]');
          if (node) node.classList.toggle("is-active", isActive);
        });
      }
    });
  } else if (fwSteps.length && "IntersectionObserver" in window) {
    var fwTotal = fwSteps.length - 1;
    var fwActiveMax = -1;
    var fwLineLength = 420;

    function updateFwFill() {
      if (!fwFill || fwTotal <= 0) return;
      var progress = fwActiveMax < 0 ? 0 : fwActiveMax / fwTotal;
      fwFill.style.strokeDashoffset = (fwLineLength * (1 - progress)).toFixed(1);
    }

    /* Trigger zone is a thin line at vertical center — so with any viewport
       height, steps activate one at a time as they cross it, rather than
       all at once whenever they happen to fit on one screen. */
    var fwObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var index = parseInt(entry.target.dataset.nodeIndex, 10);
          var node = document.querySelector('.fw-svg__node[data-node-index="' + index + '"]');
          if (entry.isIntersecting) {
            entry.target.classList.add("is-active");
            if (node) node.classList.add("is-active");
            if (index > fwActiveMax) fwActiveMax = index;
          } else {
            entry.target.classList.remove("is-active");
            if (node) node.classList.remove("is-active");
          }
          updateFwFill();
        });
      },
      { threshold: 0, rootMargin: "-48% 0px -48% 0px" }
    );

    fwSteps.forEach(function (step) { fwObserver.observe(step); });
  }

  /* Tabs (pillars, etc.) */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = group.querySelectorAll(".tabs__tab");
    var panels = group.querySelectorAll(".tabs__panel");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var targetId = tab.getAttribute("aria-controls");

        tabs.forEach(function (t) {
          t.setAttribute("aria-selected", "false");
        });
        tab.setAttribute("aria-selected", "true");

        panels.forEach(function (panel) {
          panel.classList.toggle("is-active", panel.id === targetId);
        });
      });
    });
  });

  /* Contact form → prefilled email (static site, no backend) */
  var form = document.querySelector("[data-contact-form]");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var subject = "Strategy session enquiry — " + (data.get("organisation") || data.get("name") || "Brass HQ website");
      var body = [
        "Name: " + (data.get("name") || ""),
        "Organisation: " + (data.get("organisation") || ""),
        "Email: " + (data.get("email") || ""),
        "Interest: " + (data.get("interest") || ""),
        "",
        data.get("message") || ""
      ].join("\n");

      window.location.href =
        "mailto:" + form.dataset.contactForm +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      var note = form.querySelector(".form-note");
      if (note) {
        note.textContent = "Your email client should now open with your message pre-filled. If it doesn't, email us directly at " + form.dataset.contactForm + ".";
      }
    });
  }
})();
