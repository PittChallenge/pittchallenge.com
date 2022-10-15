"use strict";
function adjustImageWidth(image) {
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    image.style.height = "100px";
    image.style.maxWidth = (document.querySelector("#attendees").clientWidth - 32 * 2) + "px";
}

window.addEventListener("resize", () => document.querySelectorAll("img.attendees-images").forEach(adjustImageWidth))
window.addEventListener("load", () => document.querySelectorAll("img.attendees-images").forEach(adjustImageWidth))
