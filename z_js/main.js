(function ($) {
    const $nav = $('#nav');
    if ($nav.length > 0) {
        // Shrink effect.
        $('#main').scrollex({
            mode: 'top',
            enter: function () { $nav.addClass('alt'); },
            leave: function () { $nav.removeClass('alt'); },
        });

        // Links.
        $('#nav a').on('click', function () {
            const $this = $(this);

            // External link? Bail.
            if ($this.attr('href').charAt(0) !== '#')
                return;

            $('#nav a').removeClass('active');
            $this.addClass('active');
        });
    }
})(jQuery);