(function() {

    "use strict";
  
    window.onload = function() {
  
      var images = document.querySelectorAll(".media-images.media-images--config-dynamic .media-images__image");

      function adjustImageWidth(image) {
        var widthBase   = 70;
        var scaleFactor = 1.2;
        var imageRatio  = image.naturalWidth / image.naturalHeight;
  
        image.width = Math.pow(imageRatio, scaleFactor) * widthBase;
      }

  
      images.forEach(adjustImageWidth);

    };
  
  }());