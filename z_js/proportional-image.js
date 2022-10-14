"use strict";
function adjustImageWidth(image) {
    const scaleFactor = 1.2;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    image.width = imageRatio * scaleFactor * window.innerWidth * 0.05;
}

window.addEventListener("resize", function () {
    const images = document.querySelectorAll("img.attendees-images");
    images.forEach(adjustImageWidth);
})
window.addEventListener("load", function () {
    const images = document.querySelectorAll("img.attendees-images");
    images.forEach(adjustImageWidth);
})
