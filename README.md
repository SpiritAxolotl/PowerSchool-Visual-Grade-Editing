# PowerSchool Visual Grade Editing
Amateur userscript that shows you what your final grade *would* be, as well as some nice css fixes.

> [!WARNING]
> This userscript is very experimental. It doesn't take into account a number of things that might affect the final grade. As such, this program can be an [infohazard](https://en.wikipedia.org/wiki/Information_hazard), so please use at your own risk.

## Features
- Calculates final grade based on specified weighting
  - Takes into account exempt and ungraded assignments (as in it doesn't compute them)
- Lets users modify the grades (CLIENT-SIDE) and live-updates the final grade
  - Underlines modified grades (with the ability to click the score on the left to revert)
  - PowerSchool-set grade gets crossed out in red
  - Letter grade is still shown!
  - Calculated final grade turns green on >=60% (a pass in public schools), or red otherwise
- The table that displays the final grade is now `position: sticky;`, and sticks to the top of the screen (takes into account the logout banner)
- Saved presets!

## Setup
Install the userscript with a userscript manager of your choice. I personally use [tampermonkey](https://https://www.tampermonkey.net/). Modify the script such that the 9th line (with the `@match`) has the correct url for your district's powerschool page.

## How to import weighting presets
All weighting will be stored in `localStorage`. I've written two methods to aid in adding and removing them.

### savePreset

```ts
const savePreset(name: string, weight: object)
```

In powerschool, on a `scores.html` page, you should see under "courses". This will be the first argument, `name`.

If you're lazy, you can run the following to get the course name:

```js
document.querySelector(`table.linkDescList tr:last-of-type > td:nth-of-type(${indexOfCol("Course", document.querySelector(`table.linkDescList`))})`).innerText
```

As for the `weight`, you will have to create an object of objects. Each "category" should be the verbatim name of the category in the grades table, and it should have a `weight` property, with a value of 0-1 (inclusive).

I provided one of my own course's weighting as an example in `script.js`:

```json
{
  "Tests": {
    "weight": 0.5
  },
  "Test Prep": {
    "weight": 0.4
  },
  "PS 1 Habits of Mind": {
    "weight": 0.1
  }
}
```

In theory, all of the weights should add up to 1.

If again, you're too lazy to get all of the category names, just run this script:

```js
new Set(Array.from(document.querySelectorAll(`#scoreTable tr > td:nth-of-type(${indexOfCol("categorycol", document.querySelector(`#scoreTable`))})`)).map(e=>e.innerText));
```

### removePreset

```ts
const removePreset(name: string)
```

This will remove a preset under a category name. Instructions to get all categories is above.

## Contributing
Contributions welcome! You'll obviously need access to some sort of powerschool interface, so you'll have to be a student of some sort whose school district uses powerschool.

The code I've written *should* be understandable, but the `calcGrade()` method definitely needs to be split up into many functions, for the sake of readability (and to make debugging less frustrating).

I also need to figure out how specific weighted assignments–rather than weighted *categories*, should be calculated.
