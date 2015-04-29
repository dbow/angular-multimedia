'use strict';

/**
 * Scales an image or video to fill the screen in one dimension, preserving its
 * aspect ratio.
 *
 * Serves as a polyfill for the CSS object-fit: contain property if it is not
 * supported (mostly for IE).
 *
 * Should be applied to an <img> or <video> tag or a <div ng-bind-html> that
 * will load content with either an <img> or <video> tag.
 */
function MediaContainDirective($timeout) {
  return {
    // Must be a class since this depends on CSS classes. ("-directive" is in
    // the classname to differentiate a class-based directive from normal CSS).
    restrict: 'C',

    // Execute last.
    priority: -1,

    link: function ($scope, $element, $attrs) {

      // If object-fit is supported, no need for rest of the directive.

      // TODO(dbow): Make sure this is actually a viable feature detect...
      //     Could use Modernizr with non-core detect added.
      if ('objectFit' in document.documentElement.style) {
        return;
      }

      // Add polyfill class to override default object-fit styles.
      $element.addClass('media-contain-directive-polyfill');

      /**
       * The IMG or VIDEO element found within $element.
       * @type {Element}
       */
      var mediaElement;

      /**
       * The angular.element version of mediaElement.
       * @type {Object}
       */
      var $mediaElement;

      // Check if directive is applied directly to IMG or VIDEO element.
      if ($element[0].tagName === 'IMG' || $element[0].tagName === 'VIDEO') {
        $mediaElement = $element;
        mediaElement = $element[0];
      }


      /**
       * Checks an image or video to see if it needs to be adjusted to fill the
       * screen. Media defaults to 100% width with no limit on height. This
       * function checks to see if the image or video's aspect ratio is less
       * than the window's. If so, adds a class that will make it 100% height
       * with no limit on width. If an image or video with height and width
       * cannot be found returns false so we can check again.
       *
       * @return {boolean} Whether a media element with width and height was
       *     found.
       */
      function checkMedia() {
        // If we haven't found the mediaElement yet, try to find an IMG or
        // VIDEO in the $element's children.
        var child;
        if (!mediaElement) {
          child = $element.find('IMG')[0] || $element.find('VIDEO')[0];
          if (child) {
            mediaElement = child;
            $mediaElement = angular.element(mediaElement);
          }
        }

        // If we've found the mediaElement and it has dimensions, adjust the
        // class applied based on aspect ratio of the window and that of the
        // mediaElement.
        if (mediaElement) {
          var mediaHeight = mediaElement.height || mediaElement.videoHeight;
          var mediaWidth = mediaElement.width || mediaElement.videoWidth;
          if (mediaHeight && mediaWidth) {
            var windowAspectRatio = window.innerWidth / window.innerHeight;
            $mediaElement.toggleClass('media-contain-directive-y',
                mediaWidth / mediaHeight < windowAspectRatio);

            // Remove listeners.
            if (mediaElement.tagName === 'IMG') {
              $mediaElement.off('load', checkMedia);
            } else {
              $mediaElement.off('loadedmetadata', checkMedia);
            }
            return true;
          }
        }

        return false;
      }


      /**
       * Checks if a mediaElement has been found yet, and if so, attaches
       * the appropriate load listener ('load' for IMG, 'loadedmetadata' for
       * VIDEO) based on tagName.
       *
       * @return {boolean} Whether a listener was set up.
       */
      function listenForMediaLoad() {
        if (mediaElement) {
          if (mediaElement.tagName === 'IMG') {
            $mediaElement.on('load', checkMedia);
          } else {
            $mediaElement.on('loadedmetadata', checkMedia);
          }
          return true;
        }
        return false;
      }


      /**
       * Initialize the directive.
       *
       * Calls checkMedia to determine if the mediaElement has been found and
       * its media has loaded. If not, tries to set up media load listeners to
       * check again.
       *
       * @return {boolean} Whether either checkMedia or listenForMediaLoad
       *     was successful and the directive was initialized.
       */
      function init() {
        return checkMedia() || listenForMediaLoad();
      }


      // Try to inititalize the directive.
      if (!init() && $attrs.ngBindHtml) {

        // If we can't init yet and there is an ng-bind-html tag, wait for that
        // to populate and then init again.
        $scope.$watch('ngBindHtml', function() {
          $timeout(init, 50); // Give HTML a chance to load.
        });
      }

      // Update on resize (debounced).
      angular.element(window).on('resize', _.debounce(checkMedia, 150));
    }
  };
}

angular
  .module('angular-multimedia')
  .directive('mediaContainDirective', ['$timeout', MediaContainDirective]);

