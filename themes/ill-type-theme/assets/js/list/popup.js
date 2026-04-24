import { go } from "./music.js";

let outsideClickHandler = null;
let escapeHandler = null;

dcm = () => {
  const cm = document.querySelector('#CopiedMessage');
  const shareButton = document.querySelector('#share');
  if (!cm) return;
  cm.style.display = (cm.style.display === 'block') ? 'none' : 'block';
  shareButton.style.backgroundColor = (cm.style.display === 'block') ? '#bfb' : '#d7ffff';
};
