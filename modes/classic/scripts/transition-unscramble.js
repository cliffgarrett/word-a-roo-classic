// modes/classic/scripts/transition-unscramble.js
import { startUnscrambleRound } from "./unscramble.js";
import { SoundManager } from "../../../scripts/sound.js";

// export function animateLettersToUnscramble(jumble) {
//   const { word, sourceLetters, transition } = jumble;
//   const wordList = document.querySelectorAll("#wordList span");
//   const grid = document.getElementById("grid");
//   if (!grid || !wordList.length) return;

//   // dim or blur the grid if requested
//   if (transition.dimWordList) {
//     grid.classList.add("blurred");
//     setTimeout(() => grid.classList.remove("blurred"), 1600);
//   }

//   // pick the source spans (letters of jumble.word)
//   const letterMap = {};
//   sourceLetters.forEach(l => {
//     const match = Array.from(wordList).find(span => span.textContent.includes(l) && !letterMap[l]);
//     if (match) letterMap[l] = match;
//   });

//   // prepare target slots
//   const unscrambleArea = document.createElement("div");
//   unscrambleArea.id = "unscrambleArea";
//   unscrambleArea.className = "unscramble-area";
//   document.querySelector("#gameCard").appendChild(unscrambleArea);

//   sourceLetters.forEach(() => {
//     const slot = document.createElement("div");
//     slot.className = "slot";
//     unscrambleArea.appendChild(slot);
//   });

//   // perform the fall animation
//   Object.entries(letterMap).forEach(([l, el], i) => {
//     const clone = el.cloneNode(true);
//     const rect = el.getBoundingClientRect();
//     clone.classList.add("falling-letter");
//     clone.style.left = rect.left + "px";
//     clone.style.top = rect.top + "px";
//     clone.textContent = l;
//     document.body.appendChild(clone);

//     requestAnimationFrame(() => {
//       clone.style.transform = `translateY(${window.innerHeight / 3 + i * 10}px)`;
//       clone.style.opacity = "1";
//     });

//     clone.addEventListener(
//       "transitionend",
//       () => {
//         clone.remove();
//         const target = unscrambleArea.children[i];
//         target.textContent = l;
//         target.classList.add("filled");
//         if (i === sourceLetters.length - 1)
//           setTimeout(() => startUnscrambleRound(jwordumble), 500);
//       },
//       { once: true }
//     );
//   });

//   // optional sfx
//   SoundManager.play("fall", false);
// }
export function createUnscrambleSlots(targetWord) {
  // Remove any old zone
  document.getElementById("unscrambleZone")?.remove();

  const zone = document.createElement("div");
  zone.id = "unscrambleZone";
  Object.assign(zone.style, {
    position: "absolute",
    left: "50%",
    top: "60%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "8px",
    zIndex: 20,
    pointerEvents: "none"
  });

  for (let i = 0; i < targetWord.length; i++) {
    const slot = document.createElement("div");
    slot.className = "jumble-slot";
    Object.assign(slot.style, {
      fontSize: "2rem",
      minWidth: "40px",
      textAlign: "center",
      fontWeight: "900",
      color: "#333",
      opacity: 0.6,
      transition: "opacity 0.3s ease, transform 0.3s ease",
    });
    slot.textContent = "_";
    zone.appendChild(slot);
  }

  document.body.appendChild(zone);
  return zone;
}

export async function transitionToUnscramble() {
  const layer = document.getElementById("monsterTransition");
  const topTeeth = document.getElementById("monsterTeethTop");
  const bottomTeeth = document.getElementById("monsterTeethBottom");
  const eyes = document.getElementById("monsterEyes");
  const banner = document.getElementById("monsterBanner");

    // fade out puzzle
  grid.classList.add('fade-out');
  wordList.classList.add('fade-out');

  if (!layer) return;
  layer.style.display = "block";
  ensureMonsterTeeth()
  
  // 👀 Step 1: Eyes appear
  eyes.style.opacity = "0";
  eyes.style.transition = "opacity 0.5s ease";
  requestAnimationFrame(() => eyes.style.opacity = "1");

  // 🦷 Step 2: Teeth slide open
  setTimeout(() => {
    topTeeth.style.transform = "translateY(0)";
    bottomTeeth.style.transform = "translateY(0)";
    navigator.vibrate?.(80); // <-- Haptic pulse when jaws snap open
  }, 600);
    
//   setTimeout(() => {
//     SoundManager.play('growl_open');
//     navigator.vibrate?.(60);
//     }, 400);

setTimeout(unscrambleTitle, 1100);

  // 📣 Step 3: Banner reveal
  setTimeout(() => {
    banner.style.opacity = "1";
    SoundManager.play('victory'); // reuse sound
  }, 1200);

  // 🕒 Step 4: Hold, then fade to Roo-A-Range
  setTimeout(() => {
    topTeeth.style.transform = "translateY(-100%)";
    bottomTeeth.style.transform = "translateY(100%)";
    eyes.style.opacity = "0";
    banner.style.opacity = "0";
    setTimeout(() => {
      layer.style.display = "none";
      startUnscrambleRound?.(); // 👈 if implemented
    }, 800);
  }, 3500);
}

function unscrambleTitle() {
  const el = document.getElementById("rooTitle");
  const final = "ROO-A-RANGE";
  let current = el.textContent.split("");
  let i = 0;
  const interval = setInterval(() => {
    current[i] = final[i];
    el.textContent = current.join("");
    i++;
    if (i >= final.length+2) clearInterval(interval);
  }, 100); // change every 100 ms per letter
}
function openMonsterMouth() {
  document.getElementById("teethTop")?.classList.add("open");
  document.getElementById("teethBottom")?.classList.add("open");
  navigator.vibrate?.([30, 50, 30]);
  SoundManager.play("monster_open"); // optional chomp or growl sound
}

function closeMonsterMouth() {
  document.getElementById("teethTop")?.classList.remove("open");
  document.getElementById("teethBottom")?.classList.remove("open");
}

function ensureMonsterTeeth() {
  if (!document.getElementById("teethTop")) {
    const top = document.createElement("img");
    top.id = "teethTop";
    top.src = "modes/classic/assets/img/monster-top.svg";
    top.className = "monster-teeth";
    document.body.appendChild(top);
  }

  if (!document.getElementById("teethBottom")) {
    const bottom = document.createElement("img");
    bottom.id = "teethBottom";
    bottom.src = "modes/classic/assets/img/monster-bottom.svg";
    bottom.className = "monster-teeth";
    document.body.appendChild(bottom);
  }
}

