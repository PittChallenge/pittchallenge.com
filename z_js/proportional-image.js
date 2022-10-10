(function () {
    "use strict";
    function adjustImageWidth(image) {
        const widthBase = 70;
        const scaleFactor = 1.2;
        const imageRatio = image.naturalWidth / image.naturalHeight;

        image.width = Math.pow(imageRatio, scaleFactor) * widthBase;
    }

    window.onload = function () {
        const images = document.querySelectorAll("img.attendees-images");
        images.forEach(adjustImageWidth);
    };

}());