/* ==========================================================================
 JOY START mockup — MINH HOẠ (SVG vẽ tay) chép NGUYÊN từ mockup gốc:
 avatar người (đầu + vai) và 8 cảnh ảnh sự kiện của みんなのフォト.
 Đây là NỘI DUNG mẫu, không phải icon — nên không thuộc bộ Solar.
 ========================================================================== */
function avatarSvg(a){
  var hairBack = '', hairFront = '';
  if(a.style === 'bob'){
    hairBack = '<path d="M17 30c0-11 7-18 15-18s15 7 15 18v11c-3 2-6 2-8 1V30H25v12c-2 1-5 1-8-1z" fill="' + a.hair + '"/>';
    hairFront = '<path d="M20 28c1-9 6-13 12-13s11 4 12 13c-5-1-9-4-11-8-3 5-8 7-13 8z" fill="' + a.hair + '"/>';
  } else if(a.style === 'long'){
    hairBack = '<path d="M16 31c0-12 7-19 16-19s16 7 16 19v20c-4 2-8 2-11 1V31H27v21c-3 1-7 1-11-1z" fill="' + a.hair + '"/>';
    hairFront = '<path d="M20 29c0-9 5-14 12-14s12 5 12 14c-6 0-11-3-13-7-2 4-6 7-11 7z" fill="' + a.hair + '"/>';
  } else if(a.style === 'up'){
    hairFront = '<path d="M20 29c-1-8 3-15 9-16 1-2 4-3 6-2 5 0 10 5 9 18-1-5-4-8-8-9-2 2-6 2-9 1-3 1-6 4-7 8z" fill="' + a.hair + '"/>';
  } else if(a.style === 'crew'){
    hairFront = '<path d="M20.5 27.5c0-8 5-13.5 11.5-13.5s11.5 5.5 11.5 13.5c-1-3-2.2-5-3.4-5.6-3.4-1.2-12.8-1.2-16.2 0-1.2.6-2.4 2.6-3.4 5.6z" fill="' + a.hair + '"/>';
  } else if(a.style === 'bun'){
    hairBack = '<circle cx="32" cy="12.5" r="5.5" fill="' + a.hair + '"/>';
    hairFront = '<path d="M20 29c0-9 5-15 12-15s12 6 12 15c-2-5-5-7-9-7.5-1 1.5-3 2.5-6 2.5-4 0-7 2-9 5z" fill="' + a.hair + '"/>';
  } else if(a.style === 'curly'){
    hairFront = '<path d="M20.5 28c0-8 5-13.5 11.5-13.5s11.5 5.5 11.5 13.5c-2-3-6-5-11.5-5s-9.5 2-11.5 5z" fill="' + a.hair + '"/>' +
      '<circle cx="22" cy="24" r="3.6" fill="' + a.hair + '"/><circle cx="26" cy="19.5" r="4.2" fill="' + a.hair + '"/><circle cx="32" cy="17.5" r="4.6" fill="' + a.hair + '"/><circle cx="38" cy="19.5" r="4.2" fill="' + a.hair + '"/><circle cx="42" cy="24" r="3.6" fill="' + a.hair + '"/>';
  } else if(a.style === 'side'){
    hairFront = '<path d="M20 29c-1-10 5-16 13-16 7 0 12 5 11 14-2-3-5-5-9-5-5 0-10 2-15 7z" fill="' + a.hair + '"/>';
  } else {
    hairFront = '<path d="M20 28c0-9 5-14 12-14s12 5 12 14c-2-4-6-6-12-6s-10 2-12 6z" fill="' + a.hair + '"/>';
  }
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + t('イラストのアバター（サンプル）') + '">' +
    '<circle cx="32" cy="32" r="32" fill="' + a.bg + '"/>' +
    hairBack +
    '<path d="M10 64c1-10 9-16 22-16s21 6 22 16z" fill="' + a.cloth + '"/>' +
    '<path d="M27 42h10v8c-3 2-7 2-10 0z" fill="' + a.skin + '"/>' +
    '<ellipse cx="32" cy="31" rx="11" ry="13" fill="' + a.skin + '"/>' +
    '<ellipse cx="21" cy="32" rx="1.8" ry="2.6" fill="' + a.skin + '"/><ellipse cx="43" cy="32" rx="1.8" ry="2.6" fill="' + a.skin + '"/>' +
    hairFront +
    '<circle cx="27.5" cy="32" r="1.3" fill="#3B2A1D"/><circle cx="36.5" cy="32" r="1.3" fill="#3B2A1D"/>' +
    '<path d="M29 38.5c1.8 1.3 4.2 1.3 6 0" stroke="#9A6A55" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
  '</svg>';
}

function pxFig(x, y, body, s, hair, skin){
  s = s || 1; skin = skin || '#F0CDB0'; hair = hair || '#3B2A1D';
  function n(v){ return (+v).toFixed(1); }
  return '<path d="M' + n(x - 6*s) + ' ' + n(y + 19*s) + 'v' + n(-8*s) + 'c0 ' + n(-3.5*s) + ' ' + n(2.7*s) + ' ' + n(-6*s) + ' ' + n(6*s) + ' ' + n(-6*s) + 's' + n(6*s) + ' ' + n(2.5*s) + ' ' + n(6*s) + ' ' + n(6*s) + 'v' + n(8*s) + 'z" fill="' + body + '"/>' +
    '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(4.3*s) + '" fill="' + skin + '"/>' +
    '<path d="M' + n(x - 4.3*s) + ' ' + n(y - 0.3*s) + 'a' + n(4.3*s) + ' ' + n(4.3*s) + ' 0 0 1 ' + n(8.6*s) + ' 0c' + n(-2*s) + ' ' + n(-1.6*s) + ' ' + n(-6*s) + ' ' + n(-1.6*s) + ' ' + n(-8.6*s) + ' 0z" fill="' + hair + '"/>';
}
function pxBack(x, y, body, s, hair){
  // 後ろ姿（頭と肩）
  s = s || 1;
  function n(v){ return (+v).toFixed(1); }
  return '<path d="M' + n(x - 7*s) + ' ' + n(y + 16*s) + 'c0 ' + n(-5*s) + ' ' + n(3*s) + ' ' + n(-8*s) + ' ' + n(7*s) + ' ' + n(-8*s) + 's' + n(7*s) + ' ' + n(3*s) + ' ' + n(7*s) + ' ' + n(8*s) + 'z" fill="' + body + '"/>' +
    '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(4.6*s) + '" fill="' + (hair || '#3B2A1D') + '"/>';
}
function photoSvg(scene){
  var S = '';
  if(scene === 'allhands'){ // 全社会
    S = '<rect width="160" height="120" fill="#F4E6D4"/><rect y="78" width="160" height="42" fill="#E2C9A8"/>' +
      '<rect x="34" y="12" width="92" height="52" rx="3" fill="#fff" stroke="#6B4A33" stroke-width="2"/>' +
      '<rect x="42" y="20" width="36" height="5" rx="2" fill="#5B8DB8"/><rect x="42" y="29" width="24" height="3" rx="1.5" fill="#C9B79F"/>' +
      '<rect x="44" y="48" width="8" height="10" fill="#E8821E"/><rect x="56" y="42" width="8" height="16" fill="#5B8DB8"/><rect x="68" y="36" width="8" height="22" fill="#E8821E"/>' +
      '<circle cx="104" cy="44" r="12" fill="#F4C79A"/><path d="M104 44V32a12 12 0 0 1 11 16z" fill="#5B8DB8"/>' +
      pxFig(140, 50, '#6B4A33', 1.1) + '<rect x="132" y="66" width="16" height="12" fill="#8A6B3F"/>' +
      pxBack(18, 88, '#5B8DB8', 1, '#2B2119') + pxBack(40, 88, '#C07A45', 1, '#4A3322') + pxBack(62, 88, '#7C98B0') + pxBack(84, 88, '#E8821E', 1, '#5A3F28') + pxBack(106, 88, '#6F8A76') + pxBack(128, 88, '#B98A7A', 1, '#2B2119') + pxBack(150, 88, '#5B8DB8') +
      pxBack(28, 104, '#8A6B3F', 1.3) + pxBack(62, 104, '#5B8DB8', 1.3, '#4A3322') + pxBack(96, 104, '#E8821E', 1.3) + pxBack(130, 104, '#6B4A33', 1.3, '#5A3F28');
  } else if(scene === 'welcome'){ // 歓迎会・乾杯
    S = '<rect width="160" height="120" fill="#F3DCC0"/>' +
      '<path d="M40 0v14M80 0v10M120 0v14" stroke="#6B4A33" stroke-width="1.2"/>' +
      '<path d="M32 22l8-8 8 8z" fill="#F2B53A"/><path d="M72 18l8-8 8 8z" fill="#F2B53A"/><path d="M112 22l8-8 8 8z" fill="#F2B53A"/>' +
      '<circle cx="40" cy="24" r="6" fill="#FCE6A8" opacity=".55"/><circle cx="120" cy="24" r="6" fill="#FCE6A8" opacity=".55"/>' +
      pxFig(26, 60, '#C07A45', 1.2, '#2B2119') + pxFig(58, 56, '#7C98B0', 1.2) + pxFig(102, 56, '#E8821E', 1.2, '#5A3F28') + pxFig(134, 60, '#6F8A76', 1.2) +
      '<path d="M32 70L62 44M62 68L74 44M98 68L86 44M128 70L98 44" stroke="#F0CDB0" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M60 34h9l-1.5 12h-6z" fill="#F2B53A"/><path d="M71 32h9l-1.5 12h-6z" fill="#F2B53A"/><path d="M81 32h9l-1.5 12h-6z" fill="#F2B53A"/><path d="M92 34h9l-1.5 12h-6z" fill="#F2B53A"/>' +
      '<path d="M60 34h9v2.5h-9zM71 32h9v2.5h-9zM81 32h9v2.5h-9zM92 34h9v2.5h-9z" fill="#fff"/>' +
      '<path d="M80 18l1.6 5 5 1.6-5 1.6L80 31l-1.6-4.8-5-1.6 5-1.6z" fill="#fff"/>' +
      '<rect x="0" y="86" width="160" height="34" fill="#8A5A36"/><rect x="0" y="86" width="160" height="4" fill="#6B4A33"/>' +
      '<circle cx="40" cy="98" r="7" fill="#FBF6EF"/><circle cx="40" cy="98" r="4" fill="#E8821E"/><circle cx="80" cy="100" r="8" fill="#FBF6EF"/><circle cx="80" cy="100" r="5" fill="#6F8A76"/><circle cx="120" cy="98" r="7" fill="#FBF6EF"/><circle cx="120" cy="98" r="4" fill="#C8463C"/>';
  } else if(scene === 'booth'){ // 学会出展ブース
    S = '<rect width="160" height="120" fill="#EEF0EA"/><rect y="92" width="160" height="28" fill="#D9D3C4"/>' +
      '<rect x="26" y="12" width="108" height="72" rx="3" fill="#3E9A96"/>' +
      '<rect x="34" y="18" width="92" height="14" rx="2" fill="#fff"/><rect x="40" y="23" width="30" height="4" rx="2" fill="#E8821E"/><rect x="74" y="23" width="46" height="4" rx="2" fill="#C9B79F"/>' +
      '<rect x="94" y="38" width="32" height="22" rx="2" fill="#2B2119"/><rect x="97" y="41" width="26" height="16" fill="#9FD3CF"/><path d="M100 54l6-6 5 4 8-8" stroke="#E8821E" stroke-width="1.6" fill="none"/>' +
      pxFig(62, 50, '#2F6F6C', 1.1, '#2B2119') +
      '<rect x="42" y="68" width="76" height="26" rx="2" fill="#fff" stroke="#C9B79F"/><rect x="42" y="68" width="76" height="4" fill="#E8821E"/><rect x="50" y="78" width="26" height="3" rx="1.5" fill="#3E9A96"/>' +
      pxBack(22, 92, '#6B4A33', 1.4, '#4A3322') + pxBack(138, 92, '#B98A7A', 1.4);
  } else if(scene === 'bbq'){ // ハノイ拠点 BBQ
    S = '<rect width="160" height="120" fill="#FBE3C4"/><rect y="74" width="160" height="46" fill="#9DBF7A"/>' +
      '<circle cx="18" cy="56" r="16" fill="#5E8F4E"/><circle cx="146" cy="52" r="18" fill="#5E8F4E"/><rect x="16" y="60" width="4" height="18" fill="#6B4A33"/><rect x="144" y="58" width="4" height="20" fill="#6B4A33"/>' +
      '<path d="M0 14Q80 40 160 14" stroke="#6B4A33" stroke-width="1" fill="none"/>' +
      '<ellipse cx="22" cy="21" rx="4" ry="5" fill="#C8463C"/><ellipse cx="50" cy="28" rx="4" ry="5" fill="#E8821E"/><ellipse cx="80" cy="30" rx="4" ry="5" fill="#C8463C"/><ellipse cx="110" cy="28" rx="4" ry="5" fill="#F2B53A"/><ellipse cx="138" cy="21" rx="4" ry="5" fill="#C8463C"/>' +
      '<path d="M70 58c-4-5 4-8 0-13M82 58c-4-5 4-8 0-13M94 58c-4-5 4-8 0-13" stroke="#B9AFA3" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      pxFig(44, 62, '#C8463C', 1.2, '#181311', '#E3B993') + pxFig(120, 62, '#3E9A96', 1.2, '#15110F', '#D9AE88') +
      '<rect x="58" y="64" width="46" height="12" rx="3" fill="#3B2A1D"/><path d="M62 76l-4 22M100 76l4 22" stroke="#3B2A1D" stroke-width="2.5"/>' +
      '<ellipse cx="68" cy="63" rx="5" ry="2.5" fill="#E8821E"/><ellipse cx="80" cy="63" rx="5" ry="2.5" fill="#C8463C"/><ellipse cx="92" cy="63" rx="5" ry="2.5" fill="#E8821E"/>' +
      pxFig(20, 88, '#F2B53A', 1.3, '#181311', '#E3B993') + pxFig(142, 90, '#6F8A76', 1.3, '#15110F', '#D9AE88');
  } else if(scene === 'futsal'){ // フットサル部
    S = '<rect width="160" height="120" fill="#6FB26F"/><rect y="0" width="160" height="30" fill="#CFE6F2"/>' +
      '<path d="M0 30h160" stroke="#fff" stroke-width="2"/><circle cx="96" cy="84" r="20" stroke="#fff" stroke-width="2" fill="none"/><path d="M96 30v90" stroke="#fff" stroke-width="2"/>' +
      '<rect x="6" y="20" width="34" height="30" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<path d="M12 20v30M18 20v30M24 20v30M30 20v30M36 20v30M6 27h34M6 34h34M6 41h34" stroke="#fff" stroke-width=".6" opacity=".8"/>' +
      pxFig(62, 50, '#E8821E', 1.4, '#2B2119') + pxFig(118, 58, '#4E7FB0', 1.4, '#5A3F28') + pxFig(142, 42, '#E8821E', 1.1, '#3B2A1D') +
      '<path d="M56 77l-6 16M68 77l8 14M112 85l-4 16M124 85l4 16" stroke="#3B2A1D" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="86" cy="96" r="7" fill="#fff" stroke="#3B2A1D"/><path d="M86 92l3 2.5-1 3.5h-4l-1-3.5z" fill="#3B2A1D"/>';
  } else if(scene === 'birthday'){ // 誕生日のお祝い
    S = '<rect width="160" height="120" fill="#FBE7E4"/>' +
      '<path d="M0 10Q80 30 160 10" stroke="#8A6B3F" stroke-width="1" fill="none"/>' +
      '<path d="M12 13l6 12 6-10zM38 18l6 12 6-10zM66 20l6 12 6-12zM94 20l6 12 6-12zM122 18l6 11 6-12z" fill="#E07A94"/>' +
      '<path d="M25 15l6 12 6-11zM52 20l6 12 6-12zM80 21l6 12 6-12zM108 19l6 12 6-12zM136 16l6 11 5-12z" fill="#F2B53A"/>' +
      pxFig(26, 50, '#E07A94', 1.25, '#3B2A1D') + pxFig(134, 50, '#7C98B0', 1.25, '#5A3F28') + pxFig(80, 36, '#C07A45', 1.1, '#2B2119') +
      '<rect x="0" y="86" width="160" height="34" fill="#C9A27E"/>' +
      '<rect x="54" y="66" width="52" height="22" rx="4" fill="#FFF6EE"/><rect x="54" y="74" width="52" height="5" fill="#E07A94"/>' +
      '<rect x="60" y="54" width="40" height="14" rx="3" fill="#FFF6EE"/><path d="M60 58q5 4 10 0t10 0 10 0 10 0" stroke="#E07A94" stroke-width="2" fill="none"/>' +
      '<rect x="68" y="44" width="3" height="10" fill="#7C98B0"/><rect x="79" y="42" width="3" height="12" fill="#F2B53A"/><rect x="90" y="44" width="3" height="10" fill="#6F8A76"/>' +
      '<path d="M69.5 38q2 3 0 5-2-2 0-5zM80.5 36q2 3 0 5-2-2 0-5zM91.5 38q2 3 0 5-2-2 0-5z" fill="#E8821E"/>' +
      '<rect x="48" y="86" width="64" height="4" rx="2" fill="#fff"/>';
  } else if(scene === 'lunch'){ // ランチ会
    S = '<rect width="160" height="120" fill="#F3E7D3"/>' +
      '<rect x="104" y="8" width="46" height="36" rx="2" fill="#DCEBF2" stroke="#8A6B3F" stroke-width="2"/><path d="M127 8v36M104 26h46" stroke="#8A6B3F" stroke-width="1.5"/>' +
      '<circle cx="18" cy="24" r="12" fill="#8BA34A"/><circle cx="28" cy="16" r="9" fill="#A5BD62"/><rect x="14" y="34" width="12" height="12" rx="2" fill="#C07A45"/>' +
      pxFig(40, 50, '#8BA34A', 1.2, '#2B2119') + pxFig(72, 48, '#E8821E', 1.2, '#181311', '#E3B993') + pxFig(104, 52, '#7C98B0', 1.2, '#5A3F28') + pxFig(134, 54, '#B98A7A', 1.2) +
      '<path d="M0 80h160v40H0z" fill="#B98556"/><path d="M0 80h160v4H0z" fill="#8A5A36"/>' +
      '<circle cx="30" cy="98" r="10" fill="#fff"/><circle cx="30" cy="98" r="6" fill="#8BA34A"/><circle cx="28" cy="96" r="2" fill="#C8463C"/>' +
      '<circle cx="64" cy="100" r="10" fill="#fff"/><path d="M58 100a6 6 0 0 0 12 0z" fill="#F2B53A"/>' +
      '<circle cx="98" cy="98" r="10" fill="#fff"/><circle cx="98" cy="98" r="6" fill="#E8821E"/>' +
      '<circle cx="132" cy="100" r="10" fill="#fff"/><circle cx="132" cy="100" r="6" fill="#C9A27E"/><circle cx="134" cy="98" r="2" fill="#8BA34A"/>' +
      '<rect x="46" y="88" width="3" height="16" rx="1.5" fill="#6B4A33"/><rect x="114" y="88" width="3" height="16" rx="1.5" fill="#6B4A33"/>';
  } else { // オフィスの朝会
    S = '<rect width="160" height="120" fill="#F4EADB"/><rect y="88" width="160" height="32" fill="#D8C2A2"/>' +
      '<rect x="12" y="10" width="72" height="50" rx="2" fill="#BFDDF2" stroke="#8A6B3F" stroke-width="2"/><path d="M48 10v50M12 35h72" stroke="#8A6B3F" stroke-width="1.5"/>' +
      '<circle cx="30" cy="24" r="7" fill="#F2B53A"/><path d="M58 50l8-10 8 10z" fill="#9DBF7A"/>' +
      '<rect x="96" y="12" width="52" height="34" rx="2" fill="#fff" stroke="#C9B79F"/><rect x="102" y="18" width="26" height="3" rx="1.5" fill="#6FA8D6"/><rect x="102" y="25" width="36" height="2.5" rx="1.2" fill="#C9B79F"/><rect x="102" y="31" width="30" height="2.5" rx="1.2" fill="#C9B79F"/><rect x="102" y="37" width="20" height="2.5" rx="1.2" fill="#E8821E"/>' +
      '<rect x="140" y="70" width="12" height="18" rx="2" fill="#C07A45"/><circle cx="146" cy="64" r="9" fill="#6F8A76"/>' +
      pxFig(28, 64, '#6FA8D6', 1.2, '#2B2119') + pxFig(56, 60, '#E8821E', 1.2, '#5A3F28') + pxFig(84, 58, '#6B4A33', 1.2, '#181311', '#E3B993') + pxFig(112, 62, '#8BA34A', 1.2) +
      '<rect x="88" y="74" width="10" height="8" rx="1" fill="#2B2119" transform="rotate(-12 93 78)"/>' +
      '<path d="M22 87v10M34 87v10M50 83v14M62 83v14M78 81v16M90 81v16M106 85v12M118 85v12" stroke="#3B2A1D" stroke-width="3" stroke-linecap="round"/>';
  }
  return '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + t('社内イベントのイラスト（サンプル）') + '">' + S + '</svg>';
}
