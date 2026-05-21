const elements = {
  html: document.documentElement,
  themeToggle: document.getElementById("theme-toggle"),
  form: document.getElementById("composition-form"),
  inputF: document.getElementById("func-f"),
  inputG: document.getElementById("func-g"),
  evalX: document.getElementById("eval-x"),
  validation: document.getElementById("validation-message"),
  resultFog: document.getElementById("result-fog"),
  resultGof: document.getElementById("result-gof"),
  valueFog: document.getElementById("value-fog"),
  valueGof: document.getElementById("value-gof"),
  stepDefine: document.getElementById("step-define"),
  stepSubstitute: document.getElementById("step-substitute"),
  stepEvaluate: document.getElementById("step-evaluate"),
  plot: document.getElementById("plot"),
  plotLoading: document.getElementById("plot-loading"),
  plotStatus: document.getElementById("plot-status"),
  calculateButton: document.getElementById("btn-hitung"),
  emptyState: document.getElementById("empty-state"),
  resultsContent: document.getElementById("results-content"),
  siteHeader: document.getElementById("site-header"),
};

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10 ? Math.log10 : (value) => Math.log(value) / Math.LN10,
  exp: Math.exp,
};

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
};

const OPERATORS = {
  "+": { precedence: 1, associativity: "left", args: 2, apply: (a, b) => a + b },
  "-": { precedence: 1, associativity: "left", args: 2, apply: (a, b) => a - b },
  "*": { precedence: 2, associativity: "left", args: 2, apply: (a, b) => a * b },
  "/": { precedence: 2, associativity: "left", args: 2, apply: (a, b) => a / b },
  "^": { precedence: 4, associativity: "right", args: 2, apply: (a, b) => Math.pow(a, b) },
  neg: { precedence: 3, associativity: "right", args: 1, apply: (a) => -a },
};

const chartColors = {
  f: "#0058be",
  g: "#6b38d4",
  fog: "#009f9a",
};

let activeEvaluators = null;
let debounceTimer = null;
let plotRenderId = 0;
let hasCalculated = false;

function normalizeExpression(value) {
  return value
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "");
}

function tokenizeExpression(input) {
  const source = normalizeExpression(input);
  const tokens = [];
  let index = 0;

  if (!source) {
    throw new Error("Ekspresi tidak boleh kosong.");
  }

  while (index < source.length) {
    const char = source[index];

    if (/\d|\./.test(char)) {
      let numberText = "";
      let dots = 0;

      while (index < source.length && /[\d.]/.test(source[index])) {
        if (source[index] === ".") dots += 1;
        numberText += source[index];
        index += 1;
      }

      if (dots > 1 || numberText === ".") {
        throw new Error("Format angka tidak valid.");
      }

      tokens.push({ type: "number", value: Number(numberText) });
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let word = "";

      while (index < source.length && /[a-zA-Z]/.test(source[index])) {
        word += source[index].toLowerCase();
        index += 1;
      }

      if (word === "x") {
        tokens.push({ type: "variable", value: "x" });
      } else if (Object.hasOwn(CONSTANTS, word)) {
        tokens.push({ type: "constant", value: word });
      } else if (Object.hasOwn(FUNCTIONS, word)) {
        tokens.push({ type: "function", value: word });
      } else {
        throw new Error(`Simbol "${word}" belum didukung.`);
      }
      continue;
    }

    if ("+-*/^".includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "leftParen", value: char });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rightParen", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Karakter "${char}" tidak dapat diproses.`);
  }

  return addImplicitMultiplication(tokens);
}

function addImplicitMultiplication(tokens) {
  const withMultiplication = [];

  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];

    if (previous && isValueEnd(previous) && isValueStart(token)) {
      withMultiplication.push({ type: "operator", value: "*" });
    }

    withMultiplication.push(token);
  });

  return withMultiplication;
}

function isValueEnd(token) {
  return ["number", "variable", "constant", "rightParen"].includes(token.type);
}

function isValueStart(token) {
  return ["number", "variable", "constant", "function", "leftParen"].includes(token.type);
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  let previous = null;

  tokens.forEach((token) => {
    if (["number", "variable", "constant"].includes(token.type)) {
      output.push(token);
      previous = token;
      return;
    }

    if (token.type === "function") {
      stack.push(token);
      previous = token;
      return;
    }

    if (token.type === "operator") {
      let operator = token.value;

      if ((operator === "+" || operator === "-") && (!previous || previous.type === "operator" || previous.type === "leftParen")) {
        if (operator === "+") {
          previous = { type: "operator", value: "pos" };
          return;
        }
        operator = "neg";
      }

      const current = OPERATORS[operator];

      while (stack.length) {
        const top = stack[stack.length - 1];
        const topOperator = top.type === "operator" ? OPERATORS[top.value] : null;
        const shouldPopOperator =
          topOperator &&
          ((current.associativity === "left" && current.precedence <= topOperator.precedence) ||
            (current.associativity === "right" && current.precedence < topOperator.precedence));

        if (top.type === "function" || shouldPopOperator) {
          output.push(stack.pop());
        } else {
          break;
        }
      }

      stack.push({ type: "operator", value: operator });
      previous = { type: "operator", value: operator };
      return;
    }

    if (token.type === "leftParen") {
      stack.push(token);
      previous = token;
      return;
    }

    if (token.type === "rightParen") {
      let foundLeftParen = false;

      while (stack.length) {
        const top = stack.pop();
        if (top.type === "leftParen") {
          foundLeftParen = true;
          break;
        }
        output.push(top);
      }

      if (!foundLeftParen) {
        throw new Error("Tanda kurung tidak seimbang.");
      }

      if (stack[stack.length - 1]?.type === "function") {
        output.push(stack.pop());
      }

      previous = token;
    }
  });

  while (stack.length) {
    const top = stack.pop();
    if (top.type === "leftParen") {
      throw new Error("Tanda kurung tidak seimbang.");
    }
    output.push(top);
  }

  return output;
}

function createEvaluator(expression) {
  const tokens = tokenizeExpression(expression);
  const rpn = toRpn(tokens);

  return {
    expression: expression.trim(),
    evaluate(xValue) {
      const stack = [];

      rpn.forEach((token) => {
        if (token.type === "number") {
          stack.push(token.value);
          return;
        }

        if (token.type === "variable") {
          stack.push(xValue);
          return;
        }

        if (token.type === "constant") {
          stack.push(CONSTANTS[token.value]);
          return;
        }

        if (token.type === "function") {
          if (stack.length < 1) {
            throw new Error("Ekspresi belum lengkap.");
          }
          const value = stack.pop();
          stack.push(FUNCTIONS[token.value](value));
          return;
        }

        if (token.type === "operator") {
          const operator = OPERATORS[token.value];

          if (operator.args === 1) {
            if (stack.length < 1) {
              throw new Error("Ekspresi belum lengkap.");
            }
            stack.push(operator.apply(stack.pop()));
            return;
          }

          if (stack.length < 2) {
            throw new Error("Ekspresi belum lengkap.");
          }
          const right = stack.pop();
          const left = stack.pop();
          stack.push(operator.apply(left, right));
        }
      });

      if (stack.length !== 1) {
        throw new Error("Ekspresi belum lengkap.");
      }

      return stack[0];
    },
  };
}

function substituteVariable(outerExpression, innerExpression) {
  const outer = outerExpression.trim() || "x";
  const inner = innerExpression.trim() || "x";
  const wrappedInner = inner === "x" ? "x" : `(${inner})`;

  return outer.replace(/(^|[^a-zA-Z])x(?![a-zA-Z])/g, (_, prefix) => `${prefix}${wrappedInner}`);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "tidak terdefinisi";
  }

  if (Math.abs(value) >= 100000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
    return value.toExponential(3);
  }

  return Number.parseFloat(value.toFixed(5)).toString();
}

function clearValidation() {
  elements.validation.textContent = "";
  document.querySelectorAll(".input-shell.is-invalid").forEach((inputShell) => {
    inputShell.classList.remove("is-invalid");
  });
}

function setValidation(message, relatedInput) {
  elements.validation.textContent = message;
  relatedInput?.closest(".input-shell")?.classList.add("is-invalid");
}

function updateTheme(isDark) {
  elements.html.classList.toggle("dark", isDark);
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.setAttribute("aria-label", isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap");
  elements.themeToggle.querySelector(".material-symbols-outlined").textContent = isDark ? "light_mode" : "dark_mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");

  if (activeEvaluators) {
    renderPlot(activeEvaluators);
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");
  updateTheme(savedTheme === "dark");
}

function initializeRevealAnimation() {
  const revealTargets = document.querySelectorAll(".reveal-section");

  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealTargets.forEach((target) => observer.observe(target));
}

function initializeParallax() {
  const items = document.querySelectorAll(".parallax-item");
  let ticking = false;

  function update() {
    const scrollY = window.scrollY;
    items.forEach((item) => {
      const depth = Number(item.dataset.depth || 0);
      item.style.transform = `translate3d(0, ${scrollY * depth}px, 0)`;
    });
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
}

function initializeScrollSpy() {
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  let ticking = false;

  function updateActiveLink() {
    const anchor = window.scrollY + window.innerHeight * 0.36;
    const activeSection =
      sections
        .filter((section) => section.offsetTop <= anchor)
        .at(-1) || sections[0];

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${activeSection.id}`);
    });

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateActiveLink);
        ticking = true;
      }
    },
    { passive: true }
  );

  updateActiveLink();
}

function calculateComposition() {
  clearValidation();

  let fEvaluator;
  let gEvaluator;
  const fExpression = elements.inputF.value.trim();
  const gExpression = elements.inputG.value.trim();
  const xValue = Number(elements.evalX.value);

  if (!Number.isFinite(xValue)) {
    setValidation("Nilai x harus berupa angka yang valid.", elements.evalX);
    return;
  }

  try {
    fEvaluator = createEvaluator(fExpression);
  } catch (error) {
    setValidation(`Periksa f(x): ${error.message}`, elements.inputF);
    activeEvaluators = null;
    renderPlot(null);
    updateFlowVisualization();
    return;
  }

  try {
    gEvaluator = createEvaluator(gExpression);
  } catch (error) {
    setValidation(`Periksa g(x): ${error.message}`, elements.inputG);
    activeEvaluators = null;
    renderPlot(null);
    updateFlowVisualization();
    return;
  }

  let fAtX;
  let gAtX;
  let fogAtX;
  let gofAtX;

  try {
    fAtX = fEvaluator.evaluate(xValue);
  } catch (error) {
    setValidation(`Periksa f(x): ${error.message}`, elements.inputF);
    activeEvaluators = null;
    renderPlot(null);
    updateFlowVisualization();
    return;
  }

  try {
    gAtX = gEvaluator.evaluate(xValue);
  } catch (error) {
    setValidation(`Periksa g(x): ${error.message}`, elements.inputG);
    activeEvaluators = null;
    renderPlot(null);
    updateFlowVisualization();
    return;
  }

  try {
    fogAtX = fEvaluator.evaluate(gAtX);
  } catch (error) {
    setValidation(`Periksa f(x): ${error.message}`, elements.inputF);
    activeEvaluators = null;
    renderPlot(null);
    updateFlowVisualization();
    return;
  }

  try {
    gofAtX = gEvaluator.evaluate(fAtX);
  } catch (error) {
    setValidation(`Periksa g(x): ${error.message}`, elements.inputG);
    activeEvaluators = null;
    renderPlot(null);
    updateFlowVisualization();
    return;
  }

  const fogExpression = substituteVariable(fExpression, gExpression);
  const gofExpression = substituteVariable(gExpression, fExpression);

  elements.resultFog.textContent = fogExpression;
  elements.resultGof.textContent = gofExpression;
  elements.valueFog.textContent = formatNumber(fogAtX);
  elements.valueGof.textContent = formatNumber(gofAtX);

  elements.stepDefine.textContent = `Gunakan f(x) = ${fExpression} dan g(x) = ${gExpression}.`;
  elements.stepSubstitute.textContent = `Ganti setiap x pada f(x) dengan g(x), sehingga f(g(x)) = ${fogExpression}.`;
  elements.stepEvaluate.textContent = `Saat x = ${formatNumber(xValue)}, g(x) = ${formatNumber(gAtX)} dan f(g(x)) = ${formatNumber(fogAtX)}.`;

  showResults();
  highlightSubstitutionStep();

  document.querySelectorAll("[data-result-card]").forEach((card) => {
    card.classList.remove("is-updated");
    requestAnimationFrame(() => {
      card.classList.add("is-updated");
      window.setTimeout(() => card.classList.remove("is-updated"), 420);
    });
  });

  elements.calculateButton.classList.add("is-working");
  window.setTimeout(() => elements.calculateButton.classList.remove("is-working"), 520);

  activeEvaluators = { fEvaluator, gEvaluator, fExpression, gExpression };
  renderPlot(activeEvaluators);
  updateFlowVisualization();
}

function createSeries(evaluators) {
  const xValues = [];
  const fValues = [];
  const gValues = [];
  const fogValues = [];

  for (let i = -120; i <= 120; i += 1) {
    const x = Number((i / 10).toFixed(1));
    const fValue = evaluators.fEvaluator.evaluate(x);
    const gValue = evaluators.gEvaluator.evaluate(x);
    const fogValue = evaluators.fEvaluator.evaluate(gValue);

    xValues.push(x);
    fValues.push(Number.isFinite(fValue) ? fValue : null);
    gValues.push(Number.isFinite(gValue) ? gValue : null);
    fogValues.push(Number.isFinite(fogValue) ? fogValue : null);
  }

  return { xValues, fValues, gValues, fogValues };
}

function setPlotLoading(isLoading) {
  const plotWrap = elements.plot?.closest(".plot-wrap");
  plotWrap?.classList.toggle("is-loading", isLoading);
  plotWrap?.setAttribute("aria-busy", String(isLoading));
}

function getPlotLayout(evaluators) {
  const isDark = elements.html.classList.contains("dark");
  const isMobile = window.innerWidth < 640;
  const textColor = isDark ? "#c9d0dd" : "#424754";
  const axisColor = isDark ? "rgba(201, 208, 221, 0.42)" : "rgba(114, 119, 133, 0.35)";
  const gridColor = isDark ? "rgba(201, 208, 221, 0.16)" : "rgba(114, 119, 133, 0.2)";
  const tooltipBg = isDark ? "rgba(24, 34, 53, 0.94)" : "rgba(255, 255, 255, 0.96)";

  return {
    autosize: true,
    margin: isMobile ? { l: 42, r: 12, t: 56, b: 42 } : { l: 54, r: 22, t: 54, b: 48 },
    paper_bgcolor: "rgba(255,255,255,0)",
    plot_bgcolor: "rgba(255,255,255,0)",
    font: {
      family: "Manrope, system-ui, sans-serif",
      color: textColor,
      size: 12,
    },
    transition: {
      duration: 360,
      easing: "cubic-in-out",
    },
    uirevision: `${evaluators.fExpression}|${evaluators.gExpression}`,
    dragmode: "zoom",
    hovermode: "x unified",
    hoverlabel: {
      align: "left",
      bgcolor: tooltipBg,
      bordercolor: isDark ? "rgba(173, 198, 255, 0.22)" : "rgba(194, 198, 214, 0.7)",
      font: {
        family: "Geist, Consolas, monospace",
        color: isDark ? "#eff1f3" : "#191c1e",
        size: isMobile ? 11 : 12,
      },
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.14,
      xanchor: "left",
      yanchor: "bottom",
      bgcolor: isDark ? "rgba(24,34,53,0.58)" : "rgba(255,255,255,0.62)",
      bordercolor: isDark ? "rgba(173,198,255,0.18)" : "rgba(194,198,214,0.42)",
      borderwidth: 1,
      font: { color: textColor, family: "Geist, Consolas, monospace", size: isMobile ? 10 : 12 },
      itemclick: "toggle",
      itemdoubleclick: "toggleothers",
    },
    xaxis: {
      title: { text: "x" },
      automargin: true,
      zeroline: true,
      zerolinecolor: axisColor,
      gridcolor: gridColor,
      linecolor: axisColor,
      tickfont: { color: textColor },
      fixedrange: false,
    },
    yaxis: {
      title: { text: "y" },
      automargin: true,
      zeroline: true,
      zerolinecolor: axisColor,
      gridcolor: gridColor,
      linecolor: axisColor,
      tickfont: { color: textColor },
      fixedrange: false,
    },
  };
}

async function renderPlot(evaluators) {
  if (!elements.plot) return;

  const renderId = ++plotRenderId;

  if (!window.Plotly) {
    elements.plotStatus.textContent = "Plotly.js belum termuat. Pastikan file vendor Plotly tersedia.";
    setPlotLoading(false);
    return;
  }

  if (!evaluators) {
    elements.plotStatus.textContent = "Perbaiki ekspresi fungsi untuk menampilkan grafik.";
    window.Plotly.purge(elements.plot);
    setPlotLoading(false);
    return;
  }

  elements.plotStatus.textContent = "";
  setPlotLoading(true);
  await new Promise((resolve) => window.requestAnimationFrame(resolve));

  if (renderId !== plotRenderId) return;

  let series;
  try {
    series = createSeries(evaluators);
  } catch (error) {
    if (renderId === plotRenderId) {
      elements.plotStatus.textContent = `Grafik belum bisa ditampilkan: ${error.message}`;
      setPlotLoading(false);
    }
    return;
  }

  const traces = [
    {
      x: series.xValues,
      y: series.fValues,
      type: "scatter",
      mode: "lines",
      name: "f(x)",
      connectgaps: false,
      line: { color: chartColors.f, width: 3, shape: "spline", smoothing: 0.85 },
      hovertemplate: "f(%{x}) = %{y:.4f}<extra></extra>",
    },
    {
      x: series.xValues,
      y: series.gValues,
      type: "scatter",
      mode: "lines",
      name: "g(x)",
      connectgaps: false,
      line: { color: chartColors.g, width: 3, shape: "spline", smoothing: 0.85 },
      hovertemplate: "g(%{x}) = %{y:.4f}<extra></extra>",
    },
    {
      x: series.xValues,
      y: series.fogValues,
      type: "scatter",
      mode: "lines",
      name: "f(g(x))",
      connectgaps: false,
      fill: "tozeroy",
      fillcolor: elements.html.classList.contains("dark") ? "rgba(0, 159, 154, 0.09)" : "rgba(0, 159, 154, 0.07)",
      line: { color: chartColors.fog, width: 3.4, shape: "spline", smoothing: 0.85 },
      hovertemplate: "f(g(%{x})) = %{y:.4f}<extra></extra>",
    },
  ];

  const config = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    displayModeBar: true,
    doubleClick: "reset+autosize",
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
  };

  try {
    await window.Plotly.react(elements.plot, traces, getPlotLayout(evaluators), config);
    if (renderId === plotRenderId) {
      setPlotLoading(false);
    }
  } catch (error) {
    if (renderId === plotRenderId) {
      elements.plotStatus.textContent = `Grafik belum bisa ditampilkan: ${error.message}`;
      setPlotLoading(false);
    }
  }
}

function initializeSimulator() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateComposition();
  });

  [elements.inputF, elements.inputG, elements.evalX].forEach((input) => {
    input.addEventListener("input", () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(calculateComposition, 360);
    });
  });

  calculateComposition();
}

function initializeResizeHandling() {
  window.addEventListener(
    "resize",
    () => {
      if (window.Plotly && elements.plot) {
        window.Plotly.Plots.resize(elements.plot);
      }
    },
    { passive: true }
  );
}

function boot() {
  initializeTheme();
  initializeRevealAnimation();
  initializeParallax();
  initializeScrollSpy();
  initializeSimulator();
  initializeResizeHandling();
  initializeAccordions();
  initializeExampleCards();
  initializePresetButtons();
  initializeFlowVisualization();
  initializeSmoothScroll();
  initializeHeaderScroll();
  initializeEmptyState();
  initializeMobileMenu();

  elements.themeToggle.addEventListener("click", () => {
    updateTheme(!elements.html.classList.contains("dark"));
  });
}

function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#top') {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerOffset = 96;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

function initializeHeaderScroll() {
  let lastScroll = 0;
  let ticking = false;

  function updateHeader() {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      elements.siteHeader?.classList.add('scrolled');
    } else {
      elements.siteHeader?.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
}

function initializeEmptyState() {
  if (!hasCalculated && elements.emptyState && elements.resultsContent) {
    elements.emptyState.hidden = false;
    elements.resultsContent.hidden = true;
  }
}

function showResults() {
  if (elements.emptyState && elements.resultsContent) {
    elements.emptyState.hidden = true;
    elements.resultsContent.hidden = false;
    hasCalculated = true;
  }
}

function highlightSubstitutionStep() {
  const stepCards = document.querySelectorAll('.step-card');
  if (stepCards[1]) {
    stepCards[1].classList.add('highlight-substitution');
    setTimeout(() => {
      stepCards[1].classList.remove('highlight-substitution');
    }, 1200);
  }
}

function initializeAccordions() {
  const accordionTriggers = document.querySelectorAll(".accordion-trigger");

  accordionTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const isExpanded = trigger.getAttribute("aria-expanded") === "true";
      const content = trigger.nextElementSibling;

      trigger.setAttribute("aria-expanded", String(!isExpanded));

      if (isExpanded) {
        content.hidden = true;
      } else {
        content.hidden = false;
      }
    });
  });
}

function initializeExampleCards() {
  const expandButtons = document.querySelectorAll(".example-expand");

  expandButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      const solution = button.nextElementSibling;

      button.setAttribute("aria-expanded", String(!isExpanded));

      if (isExpanded) {
        solution.hidden = true;
      } else {
        solution.hidden = false;
      }
    });
  });
}

function initializePresetButtons() {
  const presetButtons = document.querySelectorAll(".preset-btn");

  const presets = {
    linear: {
      f: "3x - 2",
      g: "x + 5",
      x: 2,
    },
    quadratic: {
      f: "x^2 + 1",
      g: "2x - 3",
      x: 1,
    },
    trigonometric: {
      f: "sin(x)",
      g: "2x",
      x: 1.57,
    },
    exponential: {
      f: "2^x",
      g: "x + 1",
      x: 2,
    },
  };

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const presetName = button.dataset.preset;
      const preset = presets[presetName];

      if (preset) {
        elements.inputF.value = preset.f;
        elements.inputG.value = preset.g;
        elements.evalX.value = preset.x;

        presetButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        calculateComposition();

        const simulatorPanel = document.querySelector(".simulator-panel");
        if (simulatorPanel) {
          simulatorPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    });
  });
}

function initializeFlowVisualization() {
  updateFlowVisualization();
}

function updateFlowVisualization() {
  const flowInputValue = document.getElementById("flow-input-value");
  const flowGValue = document.getElementById("flow-g-value");
  const flowFValue = document.getElementById("flow-f-value");

  if (!flowInputValue || !flowGValue || !flowFValue) return;

  const xValue = Number(elements.evalX.value);
  const fExpression = elements.inputF.value.trim();
  const gExpression = elements.inputG.value.trim();

  flowInputValue.textContent = `x = ${formatNumber(xValue)}`;

  if (activeEvaluators) {
    try {
      const gResult = activeEvaluators.gEvaluator.evaluate(xValue);
      const fResult = activeEvaluators.fEvaluator.evaluate(gResult);

      flowGValue.textContent = `${gExpression} = ${formatNumber(gResult)}`;
      flowFValue.textContent = `f(${formatNumber(gResult)}) = ${formatNumber(fResult)}`;
    } catch (error) {
      flowGValue.textContent = `${gExpression}`;
      flowFValue.textContent = `f(g(x))`;
    }
  } else {
    flowGValue.textContent = `${gExpression || "g(x)"}`;
    flowFValue.textContent = `f(g(x))`;
  }
}

/* ============================================
   MOBILE NAVIGATION
   ============================================ */

function initializeMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
  const mobileNavClose = document.getElementById("mobile-nav-close");
  const mobileNavLinks = document.querySelectorAll("[data-mobile-link]");

  if (!mobileMenuToggle || !mobileNav || !mobileNavOverlay) return;

  // Open mobile menu
  function openMobileMenu() {
    mobileNav.classList.add("is-open");
    mobileNavOverlay.classList.add("is-visible");
    mobileMenuToggle.classList.add("is-active");
    mobileMenuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  // Close mobile menu
  function closeMobileMenu() {
    mobileNav.classList.remove("is-open");
    mobileNavOverlay.classList.remove("is-visible");
    mobileMenuToggle.classList.remove("is-active");
    mobileMenuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  // Toggle mobile menu
  mobileMenuToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.contains("is-open");
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  // Close button
  if (mobileNavClose) {
    mobileNavClose.addEventListener("click", closeMobileMenu);
  }

  // Overlay click
  mobileNavOverlay.addEventListener("click", closeMobileMenu);

  // Mobile nav links - close menu and smooth scroll
  mobileNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      
      // Close menu first
      closeMobileMenu();
      
      // Handle smooth scroll
      if (href && href.startsWith("#")) {
        e.preventDefault();
        
        // Small delay to allow menu close animation
        setTimeout(() => {
          if (href === "#" || href === "#top") {
            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });
          } else {
            const target = document.querySelector(href);
            if (target) {
              const headerOffset = 96;
              const elementPosition = target.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

              window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
              });
            }
          }
        }, 150);
      }
    });
  });

  // Close menu on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNav.classList.contains("is-open")) {
      closeMobileMenu();
    }
  });

  // Close menu on window resize if open
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 968 && mobileNav.classList.contains("is-open")) {
        closeMobileMenu();
      }
    }, 250);
  });
}

boot();
