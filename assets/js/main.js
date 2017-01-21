/*
    Stellar by HTML5 UP
    html5up.net | @ajlkn
    Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

    skel.breakpoints({
        xlarge: '(max-width: 1680px)',
        large: '(max-width: 1280px)',
        medium: '(max-width: 980px)',
        small: '(max-width: 736px)',
        xsmall: '(max-width: 480px)',
        xxsmall: '(max-width: 360px)'
    });

    $(function() {

        var $window = $(window),
            $body = $('body'),
            $main = $('#main');

        // Disable animations/transitions until the page has loaded.
            $body.addClass('is-loading');

            $window.on('load', function() {
                window.setTimeout(function() {
                    $body.removeClass('is-loading');
                }, 100);
            });

        // Fix: Placeholder polyfill.
            $('form').placeholder();

        // Prioritize "important" elements on medium.
            skel.on('+medium -medium', function() {
                $.prioritize(
                    '.important\\28 medium\\29',
                    skel.breakpoint('medium').active
                );
            });

        // Nav.
            var $nav = $('#nav');

            if ($nav.length > 0) {

                // Shrink effect.
                    $main
                        .scrollex({
                            mode: 'top',
                            enter: function() {
                                $nav.addClass('alt');
                            },
                            leave: function() {
                                $nav.removeClass('alt');
                            },
                        });

                // Links.
                    var $nav_a = $nav.find('a');

                    $nav_a
                        .scrolly({
                            speed: 1000,
                            offset: function() { return $nav.height(); }
                        })
                        .on('click', function() {

                            var $this = $(this);

                            // External link? Bail.
                                if ($this.attr('href').charAt(0) != '#')
                                    return;

                            // Deactivate all links.
                                $nav_a
                                    .removeClass('active')
                                    .removeClass('active-locked');

                            // Activate link *and* lock it (so Scrollex doesn't try to activate other links as we're scrolling to this one's section).
                                $this
                                    .addClass('active')
                                    .addClass('active-locked');

                        })
                        .each(function() {

                            var $this = $(this),
                                id = $this.attr('href'),
                                $section = $(id);

                            // No section for this link? Bail.
                                if ($section.length < 1)
                                    return;

                            // Scrollex.
                                $section.scrollex({
                                    mode: 'middle',
                                    initialize: function() {

                                        // Deactivate section.
                                            if (skel.canUse('transition'))
                                                $section.addClass('inactive');

                                    },
                                    enter: function() {

                                        // Activate section.
                                            $section.removeClass('inactive');

                                        // No locked links? Deactivate all links and activate this section's one.
                                            if ($nav_a.filter('.active-locked').length == 0) {

                                                $nav_a.removeClass('active');
                                                $this.addClass('active');

                                            }

                                        // Otherwise, if this section's link is the one that's locked, unlock it.
                                            else if ($this.hasClass('active-locked'))
                                                $this.removeClass('active-locked');

                                    }
                                });

                        });

            }

        // Scrolly.
            $('.scrolly').scrolly({
                speed: 1000
            });

    });

})(jQuery);

function vidSwitch(num) {
    var frame = document.getElementById('challenge-vids');
    switch (num) {
        case 'one':
            frame.src = "https://www.youtube.com/embed/TESgXLwI8DU?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'two':
            frame.src = "https://www.youtube.com/embed/mv2RytgqNQU?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'three':
            frame.src = "https://www.youtube.com/embed/X6QBq6H5g00?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'four':
            frame.src = "https://www.youtube.com/embed/2q87tGGafsk?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'five':
            frame.src = "https://www.youtube.com/embed/irW938cqClY?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'six':
            frame.src = "https://www.youtube.com/embed/_I4ba25LJ0k?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'seven':
            frame.src = "https://www.youtube.com/embed/9A892NINBKQ?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'eight':
            frame.src = "https://www.youtube.com/embed/wQJzo32TOa0?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'nine':
            frame.src = "https://www.youtube.com/embed/WhXvRZZ7c98?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'ten':
            frame.src = "https://www.youtube.com/embed/h4k0z8l11tc?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        case 'eleven':
            frame.src = "https://www.youtube.com/embed/u9wNApFFYAQ?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
        default:
            frame.src = "https://www.youtube.com/embed/TESgXLwI8DU?list=PLIi-JVODZkTPptRTj5_Xh-yykA5cttBVl";
            break;
    }
}
