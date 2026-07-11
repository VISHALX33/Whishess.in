/* =============================================================
   whishess — 3D Vertical Spine Gallery (GSAP ScrollTrigger)
   ============================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var POSITION_CYCLE = ['left', 'right', 'left', 'behind', 'front', 'right', 'left'];

  var POSITION_CONFIG = {
    left:   { x: -340, z: 90,  rotateY: 28,  scale: 1,    blur: 0,  layer: 'side' },
    right:  { x: 340,  z: 90,  rotateY: -28, scale: 1,    blur: 0,  layer: 'side' },
    behind: { x: 0,    z: -220, rotateY: 0,   scale: 0.84, blur: 3,  layer: 'back' },
    front:  { x: 0,    z: 200,  rotateY: 0,   scale: 1.1,  blur: 0,  layer: 'front' },
  };

  var GALLERY_ITEMS = [
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782741853/gallery-1_tqjgia.jpg', alt: 'Assortment of tulle-wrapped gift hampers in woven baskets with gold ribbon roses', tag: 'Wedding', title: 'Wedding Hamper Sets', desc: 'Tulle-wrapped baskets and trays finished with satin bows and floral accents.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742012/gallery-2_lyf86h.jpg', alt: "Men's grooming gift hamper in a bamboo basket with navy ribbon", tag: 'Hamper', title: 'Grooming Gift Hamper', desc: 'Structured basket styling with layered products and a tailored ribbon finish.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742089/gallery-3_wmh3jx.jpg', alt: 'Wrapped festive outfit with pearls and a fresh floral arrangement', tag: 'Trousseau', title: 'Outfit Trousseau Wrap', desc: 'Elegant fabric wrapping with pearls, ribbon, and a curated flower cluster.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742247/gallery-4_wicn9x.jpg', alt: 'Bridal makeup gift tray with fairy lights and a painted bride veil backdrop', tag: 'Bridal', title: 'Bridal Makeup Tray', desc: 'Themed presentation tray with delicate bows, lights, and a statement backdrop.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742296/gallery-5_avzqc5.jpg', alt: 'Festive gift hampers with chocolates, perfume and flowers', tag: 'Festive', title: 'Festive Gift Spread', desc: 'Mixed hampers with chocolates, fragrance, and soft floral detailing.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742369/gallery-6_io0gp2.jpg', alt: 'Decorated red wedding gift trays with bride illustration and florals', tag: 'Wedding', title: 'Wedding Gift Trays', desc: 'Coordinated tray set with hand-styled florals and a regal red theme.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742618/gallery-7_qbzcok.jpg', alt: 'Bridal lehenga gift wrapped on a stand with pearls and roses', tag: 'Bridal', title: 'Bridal Lehenga Display', desc: 'Showcase wrapping for heavy outfits with pearl drapes and rose accents.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782743004/gallery-8_ihv4nh.jpg', alt: 'Burlap Nikkah Mubarak favor pouches with pearls and gold tags', tag: 'Favors', title: 'Favor Pouches', desc: 'Custom return-gift pouches with personalized tags and pearl detailing.' },
    { img: 'https://res.cloudinary.com/dwq5qifuk/image/upload/v1782742791/gallery-9_enfvoe.jpg', alt: 'Chocolate tower with gift trays, dry fruits, jewelry and roses', tag: 'Celebration', title: 'Celebration Showcase', desc: 'Statement chocolate tower paired with curated trays and fresh roses.' },
  ];

  function getPosition(index) {
    return POSITION_CYCLE[index % POSITION_CYCLE.length];
  }

  function buildCard(item, index) {
    var pos = getPosition(index);
    var num = String(index + 1).padStart(2, '0');
    var article = document.createElement('article');
    article.className = 'wf-spine-card wf-spine-card--' + pos;
    article.setAttribute('data-index', index);
    article.setAttribute('data-position', pos);
    article.innerHTML =
      '<div class="wf-spine-card-inner">' +
        '<figure class="wf-spine-figure"><img src="' + item.img + '" alt="' + item.alt + '" loading="' + (index < 2 ? 'eager' : 'lazy') + '" /></figure>' +
        '<div class="wf-spine-caption">' +
          '<span class="wf-spine-index">' + num + ' · ' + item.tag + '</span>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.desc + '</p>' +
        '</div>' +
      '</div>';
    return article;
  }

  function spawnParticles(container) {
    if (!container || reduceMotion || typeof gsap === 'undefined') return;
    for (var i = 0; i < 32; i++) {
      var p = document.createElement('span');
      p.className = 'wf-spine-particle';
      var size = 1.5 + Math.random() * 3;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random() * 100) + '%';
      p.style.top = (Math.random() * 100) + '%';
      p.style.opacity = (0.12 + Math.random() * 0.4).toFixed(2);
      container.appendChild(p);

      gsap.to(p, {
        y: gsap.utils.random(-60, -180),
        x: gsap.utils.random(-30, 30),
        opacity: 0,
        duration: gsap.utils.random(5, 10),
        repeat: -1,
        delay: gsap.utils.random(0, 7),
        ease: 'none',
        onRepeat: function () {
          gsap.set(p, { y: 0, x: 0, opacity: 0.15 + Math.random() * 0.35 });
        },
      });
    }
  }

  function getMobileScale() {
    return window.matchMedia('(max-width: 860px)').matches ? 0.62 : 1;
  }

  function computeCardTransform(card, index, travel, vh, mobileScale) {
    var pos = getPosition(index);
    var cfg = POSITION_CONFIG[pos];
    var cardGap = vh * 0.62;
    var startY = index * cardGap + vh * 0.95;
    var y = startY - travel;
    var distNorm = Math.abs(y) / (vh * 0.72);
    var orbit = Math.max(0, 1 - distNorm);
    var orbitEase = orbit * orbit * (3 - 2 * orbit);

    var x = cfg.x * mobileScale;
    var z = cfg.z * mobileScale;
    var rotateY = cfg.rotateY;
    var scale = cfg.scale;
    var blur = cfg.blur;
    var zIndex = 10 + index;

    if (pos === 'left' || pos === 'right') {
      var sideSign = pos === 'left' ? 1 : -1;
      rotateY = sideSign * (cfg.rotateY * (0.35 + (1 - orbitEase) * 0.65));
      x = cfg.x * mobileScale * (0.82 + orbitEase * 0.18);
      z = cfg.z * mobileScale * (0.55 + orbitEase * 0.45);

      if (orbitEase < 0.42) {
        zIndex = 8 + index;
      } else {
        zIndex = 22 + Math.round(orbitEase * 12) + index;
      }
    } else if (pos === 'behind') {
      zIndex = 6 + index;
      scale = cfg.scale * (0.94 + orbitEase * 0.06);
      blur = cfg.blur + (1 - orbitEase) * 2.5;
    } else if (pos === 'front') {
      zIndex = 34 + index;
      scale = cfg.scale * (0.96 + orbitEase * 0.06);
    }

    scale = scale * (0.9 + orbitEase * 0.1);
    blur = blur + (1 - orbitEase) * 1.2;

    if (mobileScale < 1) {
      x *= 0.55;
      rotateY *= 0.6;
    }

    return {
      y: y,
      x: x,
      z: z,
      rotateY: rotateY,
      scale: scale,
      blur: blur,
      zIndex: zIndex,
      orbit: orbitEase,
    };
  }

  function init() {
    var scroll = document.querySelector('.wf-spine-scroll');
    var stage = document.querySelector('.wf-spine-stage');
    var cardsWrap = document.querySelector('.wf-spine-cards');
    var particles = document.querySelector('.wf-spine-particles');
    var spark = document.querySelector('.wf-spine-line-spark');

    if (!scroll || !stage || !cardsWrap) return;

    GALLERY_ITEMS.forEach(function (item, i) {
      cardsWrap.appendChild(buildCard(item, i));
    });

    var cards = gsap.utils.toArray('.wf-spine-card');
    var total = cards.length;
    var segmentVh = 72;
    scroll.style.height = (total * segmentVh + 40) + 'vh';

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    spawnParticles(particles);

    ScrollTrigger.create({
      trigger: scroll,
      start: 'top top',
      end: 'bottom bottom',
      pin: stage,
      pinSpacing: true,
      anticipatePin: 1,
    });

    if (reduceMotion) {
      cards.forEach(function (card, i) {
        if (i > 2) card.style.visibility = 'hidden';
        gsap.set(card, { top: '50%', yPercent: -50, y: i * 80, opacity: 1, scale: 1, rotateY: 0, filter: 'none' });
      });
      return;
    }

    gsap.set(cards, { top: '50%', yPercent: -50, opacity: 1, force3D: true });

    function updateStream(progress) {
      var vh = window.innerHeight;
      var mobileScale = getMobileScale();
      var cardGap = vh * 0.62;
      var totalTravel = (total - 1) * cardGap + vh * 1.35;
      var travel = progress * totalTravel;

      cards.forEach(function (card, i) {
        var t = computeCardTransform(card, i, travel, vh, mobileScale);
        var img = card.querySelector('img');

        gsap.set(card, {
          y: t.y,
          x: t.x,
          z: t.z,
          rotateY: t.rotateY,
          scale: t.scale,
          filter: 'blur(' + t.blur.toFixed(1) + 'px)',
          zIndex: t.zIndex,
          opacity: 1,
          force3D: true,
        });

        if (img) {
          gsap.set(img, {
            yPercent: -4 + t.orbit * 8,
            force3D: true,
          });
        }
      });

      if (spark) {
        gsap.set(spark, {
          top: (8 + progress * 84) + '%',
          opacity: 0.5 + Math.sin(progress * Math.PI * 4) * 0.35,
        });
      }
    }

    ScrollTrigger.create({
      trigger: scroll,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: function (self) {
        updateStream(self.progress);
      },
    });

    updateStream(0);

    window.addEventListener('resize', function () {
      ScrollTrigger.refresh();
    });

    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
