"use strict";
function adjustImageWidth(image) {
    let dataSize = 1
    if (image.hasAttribute("data-size")) dataSize = image.getAttribute("data-size")
    image.style.maxHeight = (100 * dataSize) + "px";
}

window.addEventListener("load", () => document.querySelectorAll("img.attendees-images").forEach(adjustImageWidth))
