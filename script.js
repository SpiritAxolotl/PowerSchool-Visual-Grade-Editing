// ==UserScript==
// @name         powerschool (visual) grade editing
// @version      1.0
// @description  visually edit your grades in powerschool
// @author       Spax
// @namespace    https://github.com/SpiritAxolotl/PowerSchool-Visual-Grade-Editing
// @homepageURL  https://github.com/SpiritAxolotl/PowerSchool-Visual-Grade-Editing
// @supportURL   https://github.com/SpiritAxolotl/PowerSchool-Visual-Grade-Editing/issues
// @match        https://<your-powerschool-url>/guardian/scores.html*
// @icon         https://raw.githubusercontent.com/SpiritAxolotl/PowerSchool-Visual-Grade-Editing/main/powerschool-icon.png
// ==/UserScript==

"strict mode";

window.moe = 0;

let presets = {
  "SOCS SOCIOLOGY": {
    "Tests": {
      weight: 0.5
    },
    "Test Prep": {
      weight: 0.4
    },
    "PS 1 Habits of Mind": {
      weight: 0.1
    }
  }
};
importPresets = () => {
  if (localStorage.get("presets"))
    presets = JSON.parse(localStorage.get("presets"));
};
const savePresets = () => {
  localStorage.set("presets", presets);
};
window.setPreset = (name, weights) => {
  presets[name] = weights;
  savePresets();
  window.calcGrade();
};
window.removePreset = (name) => {
  if (presets[name])
    delete presets[name];
  savePresets();
  window.calcGrade();
};

window.indexOfCol = (id, table) => {
  return Array.from((table ?? document).querySelectorAll(`tr${table ? "" : `:has(#${id})`} > th`)).reduce((column, th) => {
    if ((th.id && th.id === id) || (!th.id && th.innerText.includes(id)))
      return -column;
    else if (column > 0)
      return column;
    return column - (+th.colSpan ?? 1);
  }, -1);
};

window.calcGrade = (cats) => {
  if (!this.table || !this.desclist) return;
  const moe = window.moe ?? 3;
  this.subject =
    this.desclist.querySelector(`tr:last-of-type > td:nth-of-type(${indexOfCol("Course", this.desclist)})`).innerText;
  const fillProperties = ["percent", "sum", "len"];
  const categories = typeof cats === "object" ? cats : presets[this.subject] ? presets[this.subject] : {};
  for (const category of Object.keys(categories))
    for (const property of fillProperties)
      categories[category][property] = 0;
  this.categoryindex = indexOfCol(`categorycol`);
  this.scoreindex = indexOfCol(`scorecol`);
  this.percentindex = indexOfCol(`percentcol`);
  if (typeof this.originalScores !== "object") {
    this.originalScores = Array.from(document.querySelectorAll(`tr[id^="assignmentsection"]`)).map(e =>
      parseFloat(e.querySelector(`td:nth-of-type(${this.percentindex})`).innerText)
    );
  }
  Array.from(document.querySelectorAll(`tr[id^="assignmentsection"]`)).forEach(e => {
    const index = Array.from(document.querySelectorAll(`tr[id^="assignmentsection"]`)).indexOf(e);
    const cell = e.querySelector(`td:nth-of-type(${this.percentindex})`);
    const scorecell = e.querySelector(`td:nth-of-type(${this.scoreindex})`);
    scorecell.classList.add("clickable");
    scorecell.onclick = () => {
      const split = scorecell.innerText.split("/").map(e=>+e);
      const p = split[0]/split[1] * 100;
      cell.innerText = p%1 > 0 ? p.toFixed(2) : p;
      calcGrade();
    };
    const category = e.querySelector(`td:nth-of-type(${this.categoryindex})`).innerText;
    const percent = parseFloat(cell.innerText);
    if (this.originalScores[index] !== percent)
      cell.classList.add("has-changed")
    else
      cell.classList.remove("has-changed");
    if (!(isNaN(percent) || e.querySelector(`.tt-exempt`))) {
      categories[category] ??= {};
      for (const property of fillProperties)
        categories[category][property] ??= 0;
      categories[category].sum += percent;
      categories[category].len++;
    }
  });
  categories.weightless = Object.keys(categories).reduce((accumulator,cat) => {
    const category = categories[cat];
    const hasWeight = typeof category.weight === "number";
    return {
      weight: accumulator.weight - (category.weight ?? 0),
      sum: accumulator.sum + (!hasWeight ? category.sum : 0),
      len: accumulator.len + (!hasWeight ? category.len : 0),
    };
  }, { weight: 1, len: 0, sum: 0 });
  if (categories.weightless.weight < 0.01)
    delete categories.weightless;
  const finalgrade = Object.keys(categories).reduce((sum,cat) => {
    const category = categories[cat];
    category.percent = !isNaN(category.sum / category.len) ? category.sum / category.len : 0;
    return sum + (category.weight ? category.percent * category.weight : 0);
  }, 0);
  if (cats) console.log(`${finalgrade.toFixed(2)}%`);
  const notPowerschoolGrade = document.querySelector(`#not-powerschool-grade`);
  const letterRange = [
    percentToLetterGrade(finalgrade-moe),
    percentToLetterGrade(finalgrade),
    percentToLetterGrade(finalgrade+moe)
  ];
  if (moe>0)
    notPowerschoolGrade.innerText =
      `${(finalgrade-moe).toFixed(2)} - ${(finalgrade+moe).toFixed(2)}% (${
        letterRange[0] === letterRange[2] ? letterRange[1] : `${letterRange[0]} - ${letterRange[2]}`
      })`;
  else
    notPowerschoolGrade.innerText = `${finalgrade.toFixed(2)}% (${letterRange[1]})`;
  notPowerschoolGrade.style.color =
    finalgrade-moe < 60 && finalgrade+moe >= 60 ?
      "yellow" :
    finalgrade-moe >= 60 ?
      "lightgreen" :
    isNaN(finalgrade-moe) ?
      "white" :
    "red";
  return categories;
};

window.makePercentagesEditable = (editable) => {
  document.querySelectorAll(`tr[id^="assignmentsection"] > td:nth-of-type(${this.percentindex})`)
    .forEach(e => {e.contentEditable = editable ?? true});
};

window.percentToLetterGrade = (p) => {
  if (typeof p !== "number" || isNaN(p))
    return "N/A"
  else if (p < 60)
    return "F";
  else if (p < 70)
    return "D";
  else if (p < 80)
    return "C";
  else if (p < 90)
    return "B";
  return "A";
};

const tableobserver = new MutationObserver((mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "characterData") {
      calcGrade();
      break;
    }
  }
});

const init = () => {
  if (this.initiated) return;
  this.initiated = true;
  this.table = document.querySelector(`#scoreTable`);
  this.desclist = document.querySelector(`.linkDescList`);
  const finalGradeBox =
    this.desclist.querySelector(`tr:last-of-type > td:nth-of-type(${indexOfCol("Final Grade", this.desclist)})`);
  const powerschoolGrade = document.createElement("s");
  powerschoolGrade.id = "powerschool-grade";
  powerschoolGrade.style.textDecorationColor = "red";
  const powerschoolGradeFormatted = finalGradeBox.innerText.trim().split(/\s+/g);
  powerschoolGrade.innerText = `${powerschoolGradeFormatted[1]} (${powerschoolGradeFormatted[0]})`;
  finalGradeBox.innerHTML = "";
  finalGradeBox.appendChild(powerschoolGrade);
  const notPowerschoolGrade = document.createElement("b");
  notPowerschoolGrade.id = "not-powerschool-grade";
  notPowerschoolGrade.style.marginLeft = "15px";
  this.styles = document.createElement("style");
  this.styles.id = "customStyles";
  this.styles.innerHTML =
  `table.linkDescList {
    position: sticky;
    top: 0;
    background-color: ${getComputedStyle(document.body).backgroundColor};
    z-index: 5;
  }
  .security-overlay.ui-front.ui-widget-overlay.signedout {
    display: none;
  }
  #validationIcons {
    flex-wrap: wrap;
  }
  .has-changed {
    text-decoration: underline red;
  }
  .clickable {
    cursor: pointer;
  }`;
  document.body.append(styles);
  finalGradeBox.appendChild(notPowerschoolGrade);
  calcGrade();
  makePercentagesEditable(true);
  tableobserver.observe(this.table, {
    characterData: true,
    subtree: true
  });
};

const timeoutobserver = new MutationObserver((mutationsList, observer) => {
  const table = document.querySelector(`table.linkDescList`);
  const timeout = document.querySelector(`#sessiontimeoutwarning`);
  if (getComputedStyle(timeout).visibility === "visible")
    table.style.top = getComputedStyle(timeout).height;
  else
    table.style.top = null;
});

timeoutobserver.observe(document.querySelector(`#sessiontimeoutwarning`), {
  attributes: true,
});

const topobserver = new MutationObserver((mutationsList, observer) => {
  if (document.querySelector(`#scoreTable`)) {
    init();
    observer.disconnect();
  }
});

topobserver.observe(document, {
  childList: true,
  subtree: true
});

window.getBackPercentCredit = (originalscore, newscore, percent) => {
  return ((newscore ?? 100)-(originalscore ?? 0))*(percent ?? 0.5) + originalscore;
};