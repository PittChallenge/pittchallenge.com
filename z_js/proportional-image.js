"use strict";
function adjustImageWidth(image) {
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    image.style.width = aspectRatio * window.innerWidth * 0.05 + "px";
}

window.addEventListener("resize", () => document.querySelectorAll("img.attendees-images").forEach(adjustImageWidth))
window.addEventListener("load", () => document.querySelectorAll("img.attendees-images").forEach(adjustImageWidth))
