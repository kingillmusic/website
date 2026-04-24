import { go } from "./music.js";

let outsideClickHandler = null;
let escapeHandler = null;

dcm = () => {
  const cm = document.querySelector('#CopiedMessage');
  if (!cm) return;
  cm.style.display = (cm.style.display === 'block') ? 'none' : 'block';
};
