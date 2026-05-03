/* ── Scroll-scrubbed video ─────────────────────────────────────────────
   Maps scroll progress inside `.lc-scroll-video` to `video.currentTime`,
   so the video plays forward as the user scrolls down and reverses as
   they scroll up.

   Strategy:
   - CSS `position: sticky` pins the inner `.lc-scroll-video-pin` while
     the parent section (220vh tall) scrolls underneath it.
   - GSAP ScrollTrigger reports `progress` (0..1) for the section and we
     set `video.currentTime = progress * duration`.
   - We throttle seek requests: if the decoder is mid-seek we record the
     latest target and re-issue it on the `seeked` event. Without this
     the decoder gets hammered and the video stutters or freezes.
   - Loader shows download progress until `canplaythrough`, then hides.
*/
(function () {
    'use strict';

    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
        // Fail silently — video will still appear, just won't scrub.
        console.warn('[scroll-video] GSAP or ScrollTrigger missing; scroll scrubbing disabled.');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector('.lc-scroll-video');
    const video   = document.querySelector('.lc-scroll-video-el');

    if (!section || !video) return;

    // ── Capture frame at 1 second to poster immediately when metadata loads ─────
    const START_TIME = 1.0; // Start from 0:01
    
    function captureFrameAtTime() {
        try {
            video.currentTime = START_TIME;
            video.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0);
                    const posterDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                    video.poster = posterDataUrl;
                }
            }, { once: true });
        } catch (e) {
            console.debug('[scroll-video] Could not capture frame:', e.message);
        }
    }
    
    // Capture frame as soon as we have metadata
    if (video.readyState >= 1 /* HAVE_METADATA */) {
        captureFrameAtTime();
    } else {
        video.addEventListener('loadedmetadata', captureFrameAtTime, { once: true });
    }

    // ── Seek throttling ─────────────────────────────────────────────────
    let pendingTarget = null;

    function seekTo(target) {
        if (video.seeking) {
            pendingTarget = target;
            return;
        }
        // Clamp to START_TIME minimum and end-0.05 max to keep smooth playback
        const safe = Math.max(START_TIME, Math.min(target, video.duration - 0.05));
        video.currentTime = safe;
    }

    video.addEventListener('seeked', () => {
        if (pendingTarget !== null) {
            const next = pendingTarget;
            pendingTarget = null;
            seekTo(next);
        }
    });

    // ── Build the ScrollTrigger once metadata is in ─────────────────────
    function setupTrigger() {
        if (!video.duration || !isFinite(video.duration)) return;

        ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            // `scrub: 0.5` adds 0.5s of easing between scroll position and
            // playback target — dramatically reduces the rate of seek
            // requests we send to the decoder, which is the #1 cause of
            // stutter with large H.264 files.
            scrub: 0.5,
            onUpdate(self) {
                const target = self.progress * video.duration;
                seekTo(target);
            },
        });
        // Recalculate when the page finishes laying out (fonts, images).
        ScrollTrigger.refresh();
    }

    if (video.readyState >= 1 /* HAVE_METADATA */) {
        setupTrigger();
    } else {
        video.addEventListener('loadedmetadata', setupTrigger, { once: true });
    }
})();
