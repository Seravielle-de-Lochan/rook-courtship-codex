globalThis.TIDEGLASS_EDITOR_ASSETS = (() => {
  const elementNames = [
    "book_icon_button", "bottom_panel_1", "bottom_panel_2", "bottom_panel_3",
    "branch_ornament", "chain_banner_decoration", "flower_ornament", "flower_tag_ornament",
    "gear_icon_button", "hanging_charm_decoration", "large_frame_active", "large_frame_content",
    "large_frame_empty", "list_icon_button", "lock_icon_button", "long_divider_1",
    "long_divider_2", "page_dot_1", "page_dot_2", "page_dot_3",
    "pendant_icon_1", "pendant_icon_2", "pendant_icon_3", "pendant_icon_4",
    "pendant_icon_5", "pendant_icon_6", "pendant_icon_7", "pendant_icon_8",
    "pendant_icon_9", "pill_button_disabled_1", "pill_button_disabled_2", "pill_button_disabled_3",
    "pill_button_disabled_4", "pill_button_hover_1", "pill_button_hover_2", "pill_button_hover_3",
    "pill_button_hover_4", "pill_button_normal_1", "pill_button_normal_2", "pill_button_normal_3",
    "pill_button_normal_4", "pill_button_pressed_1", "pill_button_pressed_2", "pill_button_pressed_3",
    "pill_button_pressed_4", "progress_fill_1", "progress_fill_2", "progress_fill_3",
    "progress_track_empty_1", "progress_track_empty_2", "progress_track_empty_3", "round_button_disabled_2",
    "round_button_disabled_3", "round_button_disabled_4", "round_button_disabled_5", "round_button_disabled",
    "round_button_hover_2", "round_button_hover_3", "round_button_hover_4", "round_button_hover",
    "round_button_on_2", "round_button_on_3", "round_button_on", "round_medallion_1",
    "small_button_disabled_1", "small_dot_icon_2", "small_dot_icon", "small_frame_badge",
    "small_star_icon", "star_icon_button", "star_icon", "teardrop_pendant_1",
    "teardrop_pendant_2", "thin_divider_1", "thin_divider_2", "toggle_disabled_1",
    "toggle_disabled_2", "toggle_off_1", "toggle_off_2", "toggle_on_1",
    "toggle_on_2", "wide_frame_empty"
  ];
  const featured = [
    {key:'chain-frame-upper',label:'High-to-frame chain',file:'assets/tideglass/chain_frame_upper.png',width:170,anchor:'frame',category:'new-chains'},
    {key:'chain-frame-lower-star',label:'Medallion-to-frame chain',file:'assets/tideglass/chain_frame_lower_star.png',width:170,anchor:'frame',category:'new-chains'},
    {key:'chain-swag-upper',label:'Shallow chain swag',file:'assets/tideglass/chain_swag_upper.png',width:205,anchor:'frame',category:'new-chains'},
    {key:'chain-swag-lower-star',label:'Star chain swag',file:'assets/tideglass/chain_swag_lower_star.png',width:205,anchor:'frame',category:'new-chains'},
    {key:'inner-frame-jewel',label:'Frame jewel',file:'assets/tideglass/inner-frame-jewel.png',width:92,anchor:'frame',category:'ornaments'},
    {key:'hanging-charm',label:'Side chains',file:'assets/tideglass/hanging_charm_decoration.png',width:190,anchor:'page',category:'ornaments'},
    {key:'teardrop-1',label:'Teardrop I',file:'assets/tideglass/teardrop_pendant_1.png',width:48,anchor:'page',category:'ornaments'},
    {key:'teardrop-2',label:'Teardrop II',file:'assets/tideglass/teardrop_pendant_2.png',width:48,anchor:'page',category:'ornaments'},
    {key:'chain-banner',label:'Chain drape',file:'assets/tideglass/chain_banner_decoration.png',width:300,anchor:'page',category:'ornaments'}
  ];
  const representedFiles = new Set(featured.map(asset => asset.file.split('/').pop().replace('.png','')));
  const labelFor = name => name.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  const categoryFor = name => {
    if (/frame|panel/.test(name)) return 'frames';
    if (/divider/.test(name)) return 'dividers';
    if (/button/.test(name)) return 'buttons';
    if (/progress|toggle/.test(name)) return 'controls';
    if (/dot|badge/.test(name)) return 'indicators';
    if (/ornament|chain|flower|medallion|teardrop|pendant/.test(name)) return 'ornaments';
    return 'icons';
  };
  const widthFor = name => {
    if (/large_frame|wide_frame/.test(name)) return 340;
    if (/bottom_panel/.test(name)) return 320;
    if (/pill_button/.test(name)) return 220;
    if (/progress/.test(name)) return 250;
    if (/long_divider/.test(name)) return 240;
    if (/thin_divider/.test(name)) return 130;
    if (/branch_ornament/.test(name)) return 180;
    if (/flower_ornament/.test(name)) return 170;
    if (/flower_tag/.test(name)) return 70;
    if (/toggle/.test(name)) return 95;
    if (/round_button|icon_button/.test(name)) return 62;
    if (/round_medallion/.test(name)) return 64;
    if (/page_dot|small_dot/.test(name)) return 26;
    if (/pendant_icon|star_icon|badge/.test(name)) return 44;
    return 90;
  };
  const remaining = elementNames.filter(name=>!representedFiles.has(name)).map(name=>({
    key:name,label:labelFor(name),file:`assets/tideglass/${name}.png`,width:widthFor(name),anchor:'page',category:categoryFor(name)
  }));
  return [...featured,...remaining];
})();
