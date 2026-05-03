/* ── Auto-playing looped video ─────────────────────────────────────────────
   Video plays on loop with auto-play enabled.
   No scroll interaction - video plays continuously regardless of scroll position.
*/
(function () {
    'use strict';

    const video = document.querySelector('.lc-scroll-video-el');

    if (!video) return;

    // Ensure video plays and keeps playing
    function ensurePlaying() {
        if (video.paused) {
            video.play().catch(err => {
                console.debug('[video] Auto-play prevented by browser:', err.message);
            });
        }
    }

    // Try to play when metadata loads
    if (video.readyState >= 1 /* HAVE_METADATA */) {
        ensurePlaying();
    } else {
        video.addEventListener('loadedmetadata', ensurePlaying, { once: true });
    }

    // Ensure video keeps playing if it gets paused
    video.addEventListener('pause', () => {
        // Small delay to avoid conflict with legitimate pause events
        setTimeout(ensurePlaying, 100);
    });
})();
