/* T1 info panel for the VR360 slide in index.html.
 * The tour runs in a same-origin iframe (#tour-embedded = the self-hosted Panoee
 * export), so this page reads and drives it directly:
 * - the panel follows the scene id Panoee writes into the iframe URL;
 * - picker buttons tap the matching item in Panoee's own scene list.
 */
(function () {
  'use strict';

  // label must equal the scene title shown in Panoee's scene list.
  // Array order = visit order along the bunker route.
  var ROOMS = [
    {
      id: 'loi-vao-ham',
      sceneId: '6adae083d0c79fd855bd6843',
      label: 'Lối vào hầm',
      title: 'Lối vào hầm',
      description: 'Giữa không gian linh thiêng của Hoàng thành Thăng Long nghìn năm, có một công trình nằm sâu dưới lòng đất, lặng lẽ mang trong mình nhịp đập của lịch sử. Đó là hầm chỉ huy tác chiến T1 (hầm T1) — nơi được ví như bộ não của Bộ Tổng Tham mưu, phát đi những mệnh lệnh đanh thép, góp phần tạc nên một “Điện Biên Phủ trên không” lẫy lừng.'
    },
    {
      id: 'phong-giao-ban',
      sceneId: '6add62edcbd304e554d2a906',
      label: 'Phòng Giao ban',
      title: 'Phòng giao ban',
      description: 'Phòng giao ban tác chiến rộng khoảng 20 m², là chỗ làm việc của trực ban trưởng. Đây cũng là nơi các lãnh đạo cao cấp của Đảng, Nhà nước, quân đội đến làm việc, chỉ huy trong suốt hai cuộc chiến tranh phá hoại miền Bắc của đế quốc Mỹ.'
    },
    {
      id: 'phong-truc-ban-khang-chien',
      sceneId: '6adae27bd0c79fd855bd8223',
      label: 'Phòng Trực ban',
      title: 'Phòng trực ban tác chiến và hệ thống thông tin liên lạc',
      description: 'Phòng trực ban tác chiến rộng hơn 40 m² là nơi làm việc liên tục 24/24 của kíp trực ban tác chiến do Cục Tác chiến, Bộ Tổng Tham mưu đảm nhiệm, có nhiệm vụ trực tiếp trả lời Chủ tịch Hồ Chí Minh khi Người gọi.'
    },
    {
      id: 'phong-loc-doc',
      sceneId: '6adae14cd0c79fd855bd7136',
      label: 'Phòng Thông hơi - Lọc độc',
      title: 'Phòng kỹ thuật và lọc độc',
      description: 'Phòng đặt trang thiết bị, động cơ rộng 10 m², gần cửa hầm ở hướng Nam. Đây là nơi vận hành các hệ thống thông hơi, lọc độc, làm mát, điện đàm… đảm bảo kỹ thuật cho 28 máy điện thoại trong hầm liên lạc thông suốt và kíp trực ban khoảng 10 người sinh hoạt suốt ngày đêm.'
    }
  ];

  // Null until the iframe loads (or if it is ever made cross-origin).
  function viewerDoc() {
    var frame = document.getElementById('tour-embedded');
    return frame && frame.contentDocument;
  }

  function setRoom(room) {
    var root = document.getElementById('t1-room-info-panel');
    root.querySelector('.t1-room-title').textContent = room.title;
    root.querySelector('.t1-room-description').textContent = room.description;
    document.querySelectorAll('.t1-room-option, .t1-mm-room').forEach(function (button) {
      button.setAttribute('aria-current', button.getAttribute('data-room-id') === room.id ? 'true' : 'false');
    });
  }

  // Fast path: tap the matching item in Panoee's scene list (Flickity only
  // reacts to a pointerdown/pointerup pair). On touch-capable browsers Flickity
  // listens for touchstart instead and ignores these events, so if the viewer
  // URL has not switched to the scene shortly after, reload the export on that
  // scene; the export reads ?scene=<id> on load.
  // ponytail: the fallback costs a full tour reload (a few seconds).
  var TOUR_PAGE = 'index-panoee-export-original.html';
  function viewerHref() {
    var doc = viewerDoc();
    return doc ? doc.location.href : '';
  }
  function goToScene(room) {
    if (viewerHref().indexOf(room.sceneId) !== -1) return;
    var doc = viewerDoc();
    var items = doc ? doc.querySelectorAll('#themeListScene .itemScene') : [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].textContent.trim() !== room.label) continue;
      var item = items[i], win = doc.defaultView, r = item.getBoundingClientRect();
      var o = { bubbles: true, cancelable: true, clientX: r.left + 5, clientY: r.top + 5,
        pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 };
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
        item.dispatchEvent(new (type.indexOf('pointer') === 0 ? win.PointerEvent : win.MouseEvent)(type, o));
      });
      break;
    }
    setTimeout(function () {
      var frame = document.getElementById('tour-embedded');
      if (frame && viewerHref().indexOf(room.sceneId) === -1) frame.src = TOUR_PAGE + '?scene=' + room.sceneId;
    }, 900);
  }

  // ---- Mini map ----------------------------------------------------------
  // 2D cross-section, viewBox 300 x 160, ground surface at y = 50. Three rooms
  // sit in a concrete shell underground. The entrance stair runs from the
  // ground down to the briefing room; the exit shaft rises from the hall shared
  // by the duty room and the technical room, then a stair climbs to the ground.
  // ponytail: layout follows the user's sketch, not a surveyed plan.
  // Room boxes: [x, y, width, height, label lines].
  var MM_ROOMS = {
    'phong-giao-ban': [66, 102, 60, 34, ['Phòng', 'giao ban']],
    'phong-truc-ban-khang-chien': [132, 102, 70, 34, ['Phòng', 'trực ban']],
    'phong-loc-doc': [216, 102, 40, 34, ['Phòng', 'kỹ thuật', 'và lọc độc']]
  };
  var ENTRY = [[18, 50], [64, 126]], EXIT = [[209, 90], [282, 50]];

  function f1(v) { return String(Math.round(v * 10) / 10); }

  // Inclined stair from a to b, half width w: tunnel band plus tread lines.
  function stair(a, b, w) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / l * w, ny = dx / l * w, treads = '';
    var band = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
    for (var t = 0.12; t < 0.95; t += 0.08) {
      var x = a[0] + dx * t, y = a[1] + dy * t;
      treads += 'M' + f1(x + nx * 0.8) + ' ' + f1(y + ny * 0.8) + 'L' + f1(x - nx * 0.8) + ' ' + f1(y - ny * 0.8);
    }
    return '<polygon class="t1-mm-stair" points="' + band.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join(' ') + '"/>' +
      '<path class="t1-mm-tread" d="' + treads + '"/>';
  }

  // Small stone gate over a stair mouth at ground level.
  function portal(x) {
    return '<path class="t1-mm-portal" d="M' + (x - 9) + ' 50V43Q' + x + ' 35 ' + (x + 9) + ' 43V50Z"/>' +
      '<path class="t1-mm-door" d="M' + (x - 5) + ' 50V45Q' + x + ' 40 ' + (x + 5) + ' 45V50Z"/>';
  }

  function badge(x, y, n) {
    return '<g class="t1-mm-badge"><circle cx="' + x + '" cy="' + y + '" r="4.6"/><text x="' + x + '" y="' + (y + 2) + '">' + n + '</text></g>';
  }

  function tree(x, s) {
    return '<g class="t1-mm-tree"><rect x="' + f1(x - 0.8) + '" y="' + f1(50 - 7 * s) + '" width="1.6" height="' + f1(7 * s) + '"/>' +
      '<circle cx="' + x + '" cy="' + f1(50 - 9 * s) + '" r="' + f1(4.6 * s) + '"/>' +
      '<circle cx="' + f1(x - 2.6 * s) + '" cy="' + f1(50 - 6.5 * s) + '" r="' + f1(3.2 * s) + '"/>' +
      '<circle cx="' + f1(x + 2.8 * s) + '" cy="' + f1(50 - 6.8 * s) + '" r="' + f1(3.4 * s) + '"/></g>';
  }

  function roomAttrs(room) {
    return ' class="t1-mm-room" data-room-id="' + room.id + '" tabindex="0" role="button" aria-label="' + room.title + '"';
  }

  // Room titles and labels are fixed strings in this file, safe to inline.
  function buildMap() {
    var rooms = ROOMS.slice(1).map(function (room, i) {
      var b = MM_ROOMS[room.id], cx = b[0] + b[2] / 2, lines = b[4];
      var text = lines.map(function (l, k) {
        return '<tspan x="' + f1(cx) + '" dy="' + (k ? '1.15em' : f1(-(lines.length - 1) * 0.575) + 'em') + '">' + l + '</tspan>';
      }).join('');
      return '<g' + roomAttrs(room) + '>' +
        '<rect class="t1-mm-box" x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="2"/>' +
        '<circle class="t1-mm-lamp" cx="' + f1(cx) + '" cy="' + (b[1] + 3.5) + '" r="1.3"/>' +
        '<text class="t1-mm-label' + (lines.length > 2 ? ' t1-mm-small' : '') + '" x="' + f1(cx) + '" y="' + f1(b[1] + b[3] / 2 + 3) + '">' + text + '</text>' +
        badge(b[0] + 6, b[1] + 6, i + 2) +
      '</g>';
    }).join('');

    var rungs = '';
    for (var y = 92; y < 116; y += 4) rungs += 'M204 ' + y + 'H214';

    var stars = [[12, 8], [40, 16], [74, 6], [128, 12], [170, 5], [214, 14], [252, 7], [292, 18]].map(function (p) {
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r=".7"/>';
    }).join('');

    // Visit route: ground, entrance stair, rooms 2-4, back to the hall, shaft, exit stair.
    var route = [ENTRY[0], ENTRY[1], [96, 133], [167, 133], [236, 133], [209, 133], EXIT[0], EXIT[1]];

    return '<svg viewBox="0 0 300 160">' +
      '<defs>' +
        '<linearGradient id="t1mmSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140608"/><stop offset="1" stop-color="#4a1712"/></linearGradient>' +
        '<linearGradient id="t1mmSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4e2a"/><stop offset=".45" stop-color="#4f3019"/><stop offset="1" stop-color="#22130a"/></linearGradient>' +
        '<linearGradient id="t1mmShell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a948a"/><stop offset="1" stop-color="#5f5a52"/></linearGradient>' +
        '<linearGradient id="t1mmRoom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4422"/><stop offset="1" stop-color="#3b1d0d"/></linearGradient>' +
        '<linearGradient id="t1mmOn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#e8a810"/></linearGradient>' +
        '<linearGradient id="t1mmBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></linearGradient>' +
        '<pattern id="t1mmGrain" width="9" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".55"/><circle cx="6.5" cy="5" r=".4"/></pattern>' +
      '</defs>' +
      // Sky and ground surface.
      '<rect class="t1-mm-sky" width="300" height="50"/>' +
      '<g class="t1-mm-stars">' + stars + '</g>' +
      '<polygon class="t1-mm-beam" points="96,50 100,50 132,0 118,0"/>' +
      '<polygon class="t1-mm-beam" points="226,50 230,50 214,0 200,0"/>' +
      // Soil with grain and strata.
      '<rect class="t1-mm-soil" y="50" width="300" height="110"/>' +
      '<rect class="t1-mm-grain" y="50" width="300" height="110"/>' +
      '<path class="t1-mm-strata" d="M0 66Q50 62 100 67T200 66T300 64M0 150Q60 146 120 151T240 149T300 152"/>' +
      // Concrete shell, shaft collar, hall and doorway.
      '<rect class="t1-mm-shell" x="58" y="94" width="206" height="50" rx="5"/>' +
      '<rect class="t1-mm-shell" x="199" y="84" width="20" height="14" rx="2"/>' +
      '<rect class="t1-mm-hall" x="202" y="86" width="14" height="50"/>' +
      '<path class="t1-mm-rung" d="' + rungs + '"/>' +
      '<rect class="t1-mm-hall" x="126" y="118" width="6" height="18"/>' +
      // Exit stair (not a tour scene) and entrance stair (scene 1).
      '<g class="t1-mm-exit">' + stair(EXIT[0], EXIT[1], 6) + '</g>' +
      '<g' + roomAttrs(ROOMS[0]) + '>' + stair(ENTRY[0], ENTRY[1], 6.5) + badge(41, 88, 1) + '</g>' +
      rooms +
      // Ground line drawn over the stair mouths, then the gates on top.
      '<rect class="t1-mm-grass" y="48" width="300" height="3.5"/>' +
      tree(52, 1) + tree(78, 0.8) + tree(186, 0.9) + tree(250, 1.1) +
      portal(ENTRY[0][0]) + portal(EXIT[1][0]) +
      '<polyline class="t1-mm-route" points="' + route.map(function (p) { return p.join(','); }).join(' ') + '"/>' +
      '<text class="t1-mm-tag" x="' + ENTRY[0][0] + '" y="31">Lối vào</text>' +
      '<text class="t1-mm-tag" x="' + EXIT[1][0] + '" y="31">Lối ra</text>' +
      '<text class="t1-mm-zone t1-mm-zone-top" x="150" y="44">MẶT ĐẤT</text>' +
      '<text class="t1-mm-zone" x="150" y="80">LÒNG ĐẤT</text>' +
    '</svg>';
  }

  // Panoee writes ?scene=<id> into the iframe URL on every scene change
  // (control bar, scene list or in-pano hotspot).
  // ponytail: 500 ms polling; the Panoee router emits no event we can hook.
  var lastViewerRoom = null;
  function syncFromViewer() {
    var href = viewerHref();
    var room = ROOMS.find(function (r) { return href.indexOf(r.sceneId) !== -1; });
    if (room && room !== lastViewerRoom) {
      lastViewerRoom = room;
      setRoom(room);
    }
  }

  function start() {
    var panel = document.createElement('aside');
    panel.id = 't1-room-info-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Thông tin khu di tích hầm T1');
    panel.innerHTML =
      '<div class="t1-panel-head">' +
        '<span class="t1-pin" aria-hidden="true"></span>' +
        '<h2 class="t1-room-title"></h2>' +
      '</div>' +
      '<div class="t1-divider" aria-hidden="true"></div>' +
      '<p class="t1-room-description" aria-live="polite"></p>' +
      '<details class="t1-room-picker">' +
        '<summary>Chọn nội dung thuyết minh</summary>' +
        '<div class="t1-room-options"></div>' +
      '</details>';

    var options = panel.querySelector('.t1-room-options');
    ROOMS.forEach(function (room) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 't1-room-option';
      button.setAttribute('data-room-id', room.id);
      button.innerHTML = '<span class="t1-option-dot" aria-hidden="true"></span><span class="t1-option-label"></span>';
      button.querySelector('.t1-option-label').textContent = room.title;
      button.addEventListener('click', function () { setRoom(room); goToScene(room); });
      options.appendChild(button);
    });

    // Mini map, top-right. Each room shape is a focusable button.
    var map = document.createElement('nav');
    map.id = 't1-minimap';
    map.setAttribute('aria-label', 'Sơ đồ hầm T1');
    map.innerHTML = '<div class="t1-mm-title">Sơ đồ mặt cắt hầm T1</div>' + buildMap();
    map.querySelectorAll('.t1-mm-room').forEach(function (g) {
      var room = ROOMS.find(function (r) { return r.id === g.getAttribute('data-room-id'); });
      var go = function () { setRoom(room); goToScene(room); };
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });

    // Mount inside the tour frame box so the slide CSS can position it.
    var frame = document.getElementById('tour-embedded');
    (frame ? frame.parentNode : document.body).appendChild(panel);
    (frame ? frame.parentNode : document.body).appendChild(map);
    setRoom(ROOMS[0]);
    setInterval(syncFromViewer, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
