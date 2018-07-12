var lazyLoad = true

/**
 * Lazy load images the first time the page loads
 */
window.addEventListener('load', (event) => {
  lazyLoadImages();
});

/**
 * Lazy load images
 */
lazyLoadImages = () => {
  [].forEach.call(document.querySelectorAll('img[data-src]'), function(img) {
    img.setAttribute('src', img.getAttribute('data-src'));
    img.onload = function() {
      img.removeAttribute('data-src');
    };
    lazyLoad = false;
  });
};