/* BRASS HQ — shared behaviour */
(function () {
  "use strict";

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

  /* Word-by-word heading reveal */
  function wrapWordsForReveal(el) {
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/).filter(function (p) { return p.length; });
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            var outer = document.createElement("span");
            outer.className = "word";
            var inner = document.createElement("span");
            inner.className = "word__inner";
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    }
    walk(el);

    var index = 0;
    el.querySelectorAll(".word__inner").forEach(function (inner) {
      inner.style.setProperty("--i", index);
      index++;
    });
  }

  var splitEls = document.querySelectorAll("[data-split-words]");
  if (splitEls.length) {
    splitEls.forEach(function (el) {
      wrapWordsForReveal(el);
      el.classList.add("word-reveal");
    });

    if ("IntersectionObserver" in window) {
      var splitObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              splitObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      splitEls.forEach(function (el) { splitObserver.observe(el); });
    } else {
      splitEls.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* Ambient motion — magnetic buttons, cursor halo, drifting particles */
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  /* Signature interaction — the Safe Influence Framework builds itself */
  var fwSteps = document.querySelectorAll(".fw-step");
  var fwFill = document.querySelector(".fw-svg__fill");

  if (fwSteps.length && "IntersectionObserver" in window) {
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
