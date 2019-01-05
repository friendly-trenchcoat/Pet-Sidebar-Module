// ==UserScript==
// @name           Neopets - Pets Sidebar Module
// @namespace      https://github.com/friendly-trenchcoat
// @version        1.2.3
// @description    Display any number of pets. Moves stats to div which slides out on hover and adds a navbar for each pet.
// @author         friendly-trenchcoat
// @include        http://www.neopets.com/*
// @grant          none
// @require        http://bgrins.github.com/spectrum/spectrum.js
// ==/UserScript==
/*jshint multistr: true */

/** TODOs:
 *
 *  settings menu:
 *      - tooltips
 *      - main settings:
 *          > put switches on right side
 *          > add propper input method for modes
 *          > functionality
 *          > styling
 *
 *  info menu
 *  multiple accounts
 *  collapse sidebar
 *  do something about the hidden hovers showing before the images load
 *  don't let grave danger image overwrite petpet image
 *
 *
 *  Things I will not gather data from:
 *      flash elements (battledome, wheels, etc.)
 *      items with obscure effects... maybe someday
 *      pound (it sends you to quick ref after)
 *      anything that will reflect change on the original module
 *
 *  Things that I should totally gather from:
 *      rainbow pool/fountain? does it go to quick ref after?
 *      petpet pool
 *      items with standard, rexable output
 *          food
 *          health potions
 *      coltzan
 *          active or all pets
 *          bd stats and int
 *
 *  Things I may one day gather from:
 *      apple bobbing, for "Blurred Vision" if I ever track wellness
 *      books, tdmbgpop, if I ever track int
 *      time, for age/hunger/mood, if i ever care that much
 *      turmaculus, for pet str and petpet... existance, if i ever care that much
 *
 */

//localStorage.removeItem("NEOPET_SIDEBAR_SETTINGS");

(function() {
    'use strict';
    
    // INITIAL GLOBALS
    var $MODULE, FLASH, THEME, BG;
    var DATA = JSON.parse(localStorage.getItem("NEOPET_SIDEBAR_DATA")) || {shown:[], hidden:[], pets:{}, active:''};
    var SETTINGS = JSON.parse(localStorage.getItem("NEOPET_SIDEBAR_SETTINGS")) || {
        showNav:true,
        showStats:true,
        showAnim:false,
        stickyActive:false,
        showPetpet:true,
        hpMode:2, // 0: max only | 1: current / max   | 2:  plus color
        bdMode:0, // 0: num only | 1: 'str (num)' all | 2: 'str (num)' high | 3: str only
        i:10,     // increment for subcolor when it's relative to color
        color:'',
        subcolor:'',
        bgcolor:''
    };

    // MAIN
    function main() {
        // UPDATE DATA
        // primary sources
        if (document.URL.indexOf("quickref") != -1) QuickRef();
        else if (document.URL.indexOf("status") != -1 && ( document.URL.indexOf("training") != -1 || document.URL.indexOf("academy") != -1 ) ) Training();

        // permanent changes
        //else if (document.URL.indexOf("process_training") != -1) EndTraining();
        else if (document.URL.indexOf("quests") != -1) FaerieQuest();           // BD stats
        else if (document.URL.indexOf("coincidence") != -1) Coincidence();      // BD stats, int
        else if (document.URL.indexOf("kitchen2") != -1) KitchenQuest();        // BD stats
        else if (document.URL.indexOf("process_lab2") != -1) SecretLab();       // BD stats, color, species, gender
        else if (document.URL.indexOf("process_petpetlab") != -1) PetpetLab();  // petpet name, color, spcies

        // temp changes
        else if (document.URL.indexOf("springs") != -1) HealingSprings();
        else if (document.URL.indexOf("snowager2") != -1) Snowager();
        else if (document.URL.indexOf("soupkitchen") != -1) Soup();

        // default
        else if ($(".sidebar")[0]) Sidebar();


        // ADD ELEMENTS
        if ($(".sidebar")[0]) {
            $("head").append (
                '<link href="https://use.fontawesome.com/releases/v5.5.0/css/all.css" rel="stylesheet" type="text/css">' + // icon images
                '<link href="https://cdn.jsdelivr.net/npm/pretty-checkbox@3.0/dist/pretty-checkbox.min.css" rel="stylesheet" type="text/css">' + // checkboxes
                '<link href="http://bgrins.github.io/spectrum/spectrum.css" rel="stylesheet" type="text/css">' ); // color pickers
            setGlobals();
            buildModule();
            buildMenus();
            createCSS();
            functionality();
        }

        // STORE DATA
        localStorage.setItem("NEOPET_SIDEBAR_DATA", JSON.stringify(DATA));
    }
    function setGlobals() {
        $MODULE = $('.sidebarModule:first-child tbody');
        FLASH = ($('.sidebar').length && document.body.innerHTML.search('swf') !== -1 && document.URL.indexOf("bank") == -1);
        THEME = String($('.sidebarHeader').css('background-color')) || "#000";
        BG = "rgba(255, 255, 255, 0.93)";

        DATA.active = $MODULE.children().eq(0).find('b').text() || "";
    }

    // BUILDER FUNCTIONS
    function buildModule(){
        var len = DATA.shown.length;
        if (len>0) {
            var animstr = '<embed type=\"application/x-shockwave-flash\" src=\"http://images.neopets.com/customise/customNeopetViewer_v35.swf\" width=\"150\" height=\"150\" style=\"undefined\" id=\"CustomNeopetView\" name=\"CustomNeopetView\" bgcolor=\"white\" quality=\"high\" scale=\"showall\" menu=\"false\" allowscriptaccess=\"always\" swliveconnect=\"true\" wmode=\"opaque\" flashvars=\"webServer=http%3A%2F%2Fwww.neopets.com&amp;imageServer=http%3A%2F%2Fimages.neopets.com&amp;gatewayURL=http%3A%2F%2Fwww.neopets.com%2Famfphp%2Fgateway.php&amp;pet_name=%s&amp;lang=en&amp;pet_slot=\">';

            // clear module
            $MODULE.html( // replace contents with only top bar
                '<tr> \
                    <td id="petsHeader" valign="middle" class="sidebarHeader medText"> \
                        <a href="/quickref.phtml"><b>Pets</b></a> \
                        <span id="fold_button"><i class="fas fa-caret-down"></i></span> \
                        <span id="settings_button"><i class="fas fa-cog"></i></span> \
                        <span id="info_button"><i class="fas fa-info-circle"></i></span> \
                    </td> \
                </tr>'
            );

            // add pets
            if (SETTINGS.stickyActive) array_move(DATA.shown,DATA.shown.indexOf(DATA.active),0); // stickyActive: put active pet at the top. TODO: put this in settings block
            for (var i=0; i<len; i++) {
                var petname = DATA.shown[i];
                var stats = DATA.pets[petname];
                var inactive = petname == DATA.active ? '' : 'in';
                var image = (SETTINGS.showAnim && FLASH) ? animstr.replace("%s", petname) : '<img src="'+stats.image+'" width="150" height="150" border="0">';

                // for some reason children must be added seperately
                $MODULE.append('<tr id="'+inactive+'active_'+petname+'" ></tr> style="position: relative;"');
                $('#'+inactive+'active_'+petname).append(
                    '<div class="remove_button"> \
                        <i class="fas fa-sign-out-alt fa-5x" petname="'+petname+'"></i> \
                    </div> \
                    <div class="leftHover" petname="'+petname+'"></div> \
                    <div class="leftSubHover" petname="'+petname+'"></div> \
                    <div class="rightHover" petname="'+petname+'"></div> \
                    '+createNavHTML(petname)+' \
                    '+createStatsHTML(petname)+' \
                    <div class="placeholder"></div> \
                    <a class="petGlam" href="/quickref.phtml">'+image+'</a>');
                $('#nav_'+petname).find('.lookup').append(
                    '<a class="sub" href="http://www.neopets.com/neopet_desc.phtml?edit_petname='+petname+'"><span><i class="fas fa-pencil-alt fa-xs"></i></span></a>');
                $('#nav_'+petname).find('.petpage').append(
                    '<a class="sub" href="http://www.neopets.com/editpage.phtml?pet_name='+petname+'"><span><i class="fas fa-pencil-alt fa-xs"></i></span></a>');

                // disable buttons
                if (i==0)       $('#nav_'+petname).find('.move').eq(0).addClass('disabled');        // move up
                if (i==(len-1)) $('#nav_'+petname).find('.move').eq(1).addClass('disabled');        // move down
                if (stats.isUC) $('#nav_'+petname).find('a').eq(2).addClass('disabled');            // customize
            }
            $('#nav_'+DATA.active).find('a').eq(1).addClass('disabled');                          // make active
            if (SETTINGS.stickyActive) $('#nav_'+DATA.active).find('.move').addClass('disabled'); // move up/down
        }
    }
    function createStatsHTML(petname) {
        var stats = DATA.pets[petname];
        if (!SETTINGS.showStats) return '';
        var petpetTD = '', petpetStyle='';
        if (SETTINGS.showPetpet && stats.petpet_image) { // if showPetpet=true and there is a petpet
            petpetTD =
                '<td align="center" class="petpet"> \
                    <b>'+stats.petpet_name+'</b> the '+stats.petpet_species+'<br><br> \
                    <img src="'+stats.petpet_image+'" width="80" height="80"><br><br> \
                </td>';
            petpetStyle = ' style="margin-top: -15px;"';
        }
        var hp = getHP(stats.current_hp,stats.max_hp);
        var statsHTML =
            '<div id="stats_'+petname+'" class="hover stats"> \
            <div class="inner"'+petpetStyle+'> \
            \
            <table cellpadding="1" cellspacing="0" border="0"><tr> \
            \
            <td vertical-align="top"> \
            <table cellpadding="1" cellspacing="0" border="0"> \
            <tr> \
            <td align="right">Species:</td> \
            <td align="left"><b>'+stats.species+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Color:</td> \
            <td align="left"><b>'+stats.color+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Mood:</td> \
            <td align="left"><b>'+stats.mood+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Hunger:</td> \
            <td align="left"><b>'+stats.hunger+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Age:</td> \
            <td align="left"><b>'+stats.age+'</b></td> \
            </tr> \
            </table> \
            </td> \
            \
            <td> \
            <table cellpadding="1" cellspacing="0" border="0"> \
            <tr> \
            <td align="right">Level:</td> \
            <td align="left"><b>'+stats.level+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Health:</td> \
            <td align="left"><b>'+hp+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Strength:</td> \
            <td align="left"><b>'+getBDStat(stats.strength,STR)+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Defence:</td> \
            <td align="left"><b>'+getBDStat(stats.defence,DEF)+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Movement:</td> \
            <td align="left"><b>'+getBDStat(stats.movement,MOV)+'</b></td> \
            </tr> \
            <tr> \
            <td align="right">Intelligence:</td> \
            <td align="left"><b>'+stats.intelligence+'</b></td> \
            </tr> \
            </table> \
            </td> \
            \
            '+petpetTD+' \
            \
            </tr></table> \
            \
            </div> \
            </div>';
        return statsHTML;
    }
    function createNavHTML(petname) {
        /*
            move up: angle-up caret-up chevron-up
            make active: splotch certificate user-circle sun
            customize: palette mask hat-wizard gem
            lookup: id-card
            petpage: paw window-maximize
            edit: paint-brush pencil-alt
            remove: times sign-out-alt
            trash: trash-alt
            settings: cog
            info: question-circle info-circle info
        */
        if (!SETTINGS.showNav) return ''; // if nav=false return empty
        var buttonsHTML =
            '<div id="nav_'+petname+'" class="petnav"> \
                <a class="move" dir="-1" petname="'+petname+'"><span><i class="fas fa-chevron-up"></i></span></a> \
                <a href="http://www.neopets.com/process_changepet.phtml?new_active_pet='+petname+'"><span><i class="fas fa-splotch"></i></span></a> \
                <a href="http://www.neopets.com/customise/?view='+petname+'"><span><i class="fas fa-mask"></i></span></a> \
                <a class="lookup" href="http://www.neopets.com/petlookup.phtml?pet='+petname+'"><span><i class="fas fa-id-card"></i></span></a> \
                <a class="petpage" href="http://www.neopets.com/~'+petname+'"><span><i class="fas fa-paw"></i></span></a> \
                <a class="move" dir="1" petname="'+petname+'"><span><i class="fas fa-chevron-down"></i></span></a> \
            </div>';
        return buttonsHTML;
    }
    function buildMenus() {
        $('.content').first().prepend(
            '<div id="sidebar_menus"> \
                <div id="info_menu"></div> \
                <div id="settings_menu"></div> \
            </div>');
        $('#info_menu').append(
            '<div class="menu_close"><i class="fas fa-times"></i></div> \
            <div class="innerMenu"> \
                <h1>Info</h1><hr> \
                <div id="info_nav"> \
                    <span><a>usage</a></span> \
                    <span><a>legend</a></span> \
                    <span><a>contact</a></span> \
                </div> \
                <div id="info_pages"> \
                    <div id="info_gather" class="page">page 1</div> \
                    <div id="info_legend" class="page">page 2</div> \
                    <div id="info_contact" class="page">page 3</div> \
                </div> \
            </div>');
        $('#settings_menu').append(settings_HTML());
    }
    function info_HTML() {
        var info =
        '<p>The Pet Sidebar Module is written and tested in Chrome.</p> \
        <p>All data for the module is gathered from the following pages when you visit them, and stored locally on your web browser.</p> \
        <table> \
            <tr> \
                <th>Page</th> \
                <th>Data Updated</th> \
            </tr> \
            <tr> \
                <td><a href="http://www.neopets.com/quickref.phtml">Quickref</a></td> \
                <td>All pets - Everything except exact stats numbers</td> \
            </tr> \
            <tr> \
                <td><a href="http://www.neopets.com/island/training.phtml?type=status">Training</a></td> \
                <td>All pets - Exact stats numbers</td> \
            </tr> \
            <tr> \
                <td></td> \
                <td></td> \
            </tr> \
            <tr> \
                <td>Petpage</td> \
                <td>Everything except exact stats numbers</td> \
            </tr> \
            <tr> \
                <td>Faerie Quest</td> \
                <td>Affected stats numbers</td> \
            </tr> \
            <tr> \
                <td>Coincidence</td> \
                <td>Affected stats numbers</td> \
            </tr> \
            <tr> \
                <td>Lab Ray</td> \
                <td>Affected attributes and stats numbers</td> \
            </tr> \
            <tr> \
                <td>Petpet Lab Ray</td> \
                <td>Affected petpet info</td> \
            </tr> \
            <tr> \
                <td>Random Event</td> \
                <td>Affected stats numbers</td> \
            </tr> \
        </table> \
        <p></p> \
        <div> \
            <span><b>Browser Support for local storage:</b></span> \
            <table> \
                <tr> \
                    <th>Chrome</th> \
                    <th>Firefox</th> \
                    <th>Safari</th> \
                    <th>IE</th> \
                    <th>Opera</th> \
                </tr> \
                <tr> \
                    <td>4.0</td> \
                    <td>3.5</td> \
                    <td>4.0</td> \
                    <td>8.0</td> \
                    <td>11.5</td> \
                </tr> \
            </table> \
        </div>';
        return info;
    }
    function settings_HTML() {
        var removed = '';
        for (var i=0; i < DATA.hidden.length; i++)
            removed += '<option value="'+DATA.hidden[i]+'">'+DATA.hidden[i]+'</option>';
        return ' \
        <div class="menu_header">  \
            <div class="menu_close"><i class="fas fa-times"></i></div>  \
            <h1>Settings</h1>  \
        </div>  \
        <div class="menu_inner">  \
            <div class="section"> \
                <table id="color_settings">  \
                <tr> \
                    <td> \
                        <div>Color:</div> \
                        <input class="picker" id="colorpicker"> \
                        <input class="picker_text" id="colorpicker_text"> \
                    </td> \
                    <td> \
                        <div>Accent<br>Color:</div> \
                        <input class="picker" id="subcolorpicker"> \
                        <input class="picker_text" id="subcolorpicker_text"> \
                        <div id="increment"> \
                            <i class="fas fa-caret-up"></i> \
                            <i class="fas fa-caret-down"></i> \
                        </div> \
                    </td> \
                    <td> \
                        <div>Background<br>Color:</div> \
                        <input class="picker" id="bgcolorpicker"> \
                        <input class="picker_text" id="bgcolorpicker_text"> \
                    </td> \
                </tr>  \
                </table>  \
            </div>  \
            <div class="section">  \
                <table>  \
                <tr>  \
                    <td>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label> ‏‏‎ navigation menu</label></div></div> \
                        </span>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>pet sats slider</label></div></div> \
                        </span>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>flash animated pet images</label></div></div> \
                        </span>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>all accounts</label></div></div> \
                        </span>  \
                    </td>  \
                    <td>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>keep active pet at top</label></div></div> \
                        </span>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>include petpet in slider</label></div></div> \
                        </span>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>HP display mode</label></div></div> \
                        </span>  \
                        <span> \
                            <div class="pretty p-switch p-fill"><input type="checkbox" /><div class="state p-success"><label>BD stats display mode</label></div></div> \
                        </span>  \
                    </td>  \
                </tr>  \
                </table>  \
            </div>  \
            <div class="section">  \
                <table id="settings_footer">  \
                <tr>  \
                    <td>  \
                        <select id="removed_pets" name="removed">'+removed+'</select>  \
                        <div id="addback_button"><i class="fas fa-plus"></i></div> \
                        <div id="delete_button"><i class="fas fa-trash-alt"></i></div>  \
                    </td>  \
                    <td>  \
                        <button id="revert_button">revert to defaults</button>  \
                    </td>  \
                </tr>  \
                </table>  \
            </div>  \
        </div>';
    }
    function createCSS() {
        var color = getColor();
        var subcolor = getSubcolor();
        var bgcolor = getBgColor();
        var statsCSS = document.createElement("style");
        statsCSS.type = "text/css";
        statsCSS.innerHTML = // shut up.
'/* menus - general */ #sidebar_menus > div {  position: absolute;  display: none;  height: 400px;  width: 700px;  margin: 52px;  background-color: '+bgcolor+';  border: 4px solid '+color+';  border-radius: 20px;  z-index: 100; } #sidebar_menus button {  background-color: '+subcolor+';  border: none;  padding: 10px 16px;  margin: 4px 2px;  cursor: pointer;  border-radius: 100px;  color: #fff;  font-weight: 300;  font-size: 16px; } .menu_header {  background-color: '+color+';  padding: 1px;  border-radius: 10px 10px 0px 0px; } .menu_header h1 {  color: #fff;  font-family: Verdana, Arial, Helvetica, sans-serif;  font-size: 35px;  margin: 1px 5px;  letter-spacing: -1px; } .menu_close {  float: right;  cursor: pointer;  font-size: 30px;  color: #fff;  margin: 5.5px 14px; } .menu_close:hover {  font-size: 31px;  margin: 5.25px 13.5px; } .menu_inner {  width: 90%;  height: 70%;  margin: 20px auto; } .section {  width: 100%;  min-height: 20%;  margin: 14px auto;  text-align: center; } .section:nth-child(2) {  border: 5px dotted #0003;  margin-top: 20px; } .section > span {  display: inline-block;  text-align: left;  padding: 5px 15px 0px; } .section > table {  margin: auto;  width: 100%;  text-align: left;  padding: 20px 10px; } .section td span {  padding: 8px 50px;  display: block; }   /* menus - info */ #info_nav {  padding-left: 1.5px; } #info_nav span {  background-color: '+color+';  padding: 4px 80px;  color: #fff; } #info_pages {  position: relative; } .page {  position: absolute;  display: none; }   /* menus - settings */ /* color */ #color_settings {  table-layout: fixed;  border-spacing: 45px 0px;  padding: 0px; } #color_settings td:first-child>div:first-child {  font-size: 24;  margin-bottom: 6.75px; } #color_settings div, #color_settings input {  margin-bottom: 2px;  letter-spacing: -1px;  font-weight: 600;  font-size: 14; } #color_settings div:not(#increment) {  display: inline-block !important;  color: '+color+'; } #color_settings input {  width: 100%;  text-align: center;  font-size: 12;  letter-spacing: -1.5px;  padding: 2px 0px;  color: '+subcolor+'; } .picker_button {  background: none;  border: none;  float: right; } .picker_popup {  background: '+bgcolor+';  border-color: '+color+'; } #increment {  position: absolute;  margin: -21px 0px 0px 153px; } #increment i {  display: block;  margin: -6px auto;  font-size: 16px;  cursor: pointer;  color: '+color+'; } /* toggles */ /* remove */ .remove_button {  background: #0006;  width: 150;  height: 115;  position: absolute;  text-align: center;  padding-top: 35px;  z-index: 100;  display: none; } .remove_button i {  color: #fffd; } .remove_button i:hover {  color: #fff;  font-size: 81;  margin-top: -0.5px; } #removed_pets {  width: 200px;  font-size: 16px;  color: '+subcolor+';  border-color: #0003;  margin-left: 50px; } /* buttons */ #settings_footer {  padding: 0px; } #settings_footer td div {  display: inline;  font-size: 22px;  padding-left: 10px;  color: '+subcolor+';  cursor: pointer; } #revert_button {  float: right; }   /* pets */ .placeholder {  width: 150px;  height: 150px;  position: absolute;  z-index: 98;  background-color: #fff; } .petGlam {  position: relative;  z-index: 99; }  /* nav bar */ #petsHeader span {  float: right;  font-size: 12px; } #petsHeader span i {  cursor: pointer;  padding: 0px 4px; } .petnav:hover, .leftHover:hover ~ .petnav, .leftSubHover:hover ~ .petnav {  margin-left: -30px; } .petnav a:hover {  cursor: pointer;  margin-left: -5px; } .petnav a:hover .sub {  margin-left: -25px; } .leftHover {  position: absolute;  z-index: 100;  height: 150px;  width: 50px;  margin-left: 3px; } .leftSubHover {  position: absolute;  z-index: 80;  height: 150px;  width: 25px;  margin-left: -22px; } .petnav {  position: absolute;  width: 42px;  z-index: 97;  background-color: '+color+';  border-radius: 12px 0px 0px 12px;  -webkit-transition-property: margin-left;  -webkit-transition-duration: .5s;  transition-property: margin-left;  transition-duration: .5s; } .petnav a {  position: relative;  display: block;  height: 25px;  font-size: 18px;  color: #fff;  background-color: '+color+';  border-radius: 12px 0px 0px 12px;  z-index: 98; } .disabled {  color: #fffa !important; } .disabled:hover {  margin-left: 0px !important; } .petnav span {  float: left;  width: 32px;  background-color: inherit;  border-radius: 12px 0px 0px 12px; } .petnav i {  padding: 3px; } .sub {  position: absolute !important;  width: 30px;  z-index: -1 !important;  -webkit-transition-property: margin-left;  -webkit-transition-duration: .2s;  transition-property: margin-left;  transition-duration: .2s; } .sub i {  padding: 5.5px; }   /* stats slider */ .rightHover {  position: absolute;  z-index: 100;  height: 150px;  width: 50px;  margin-left: 103px; } .hover {  position: absolute;  border-radius: 25px;  background-color: '+bgcolor+';  border: 3px solid '+color+';  padding: 20px;   height: 104px;  width: 5px;  margin-left: 95px;  overflow: hidden;  z-index: 98; } .inner {  height: 100%;  width: 90%;  float: right;  display: inline; } .inner table {  font: 7pt Verdana;  vertical-align: top; } .inner img {  border: 2px #ccc dashed; }  .inner i {  font: 6.5pt Verdana; }  /* checkboxes .pretty.p-switch.p-slim input:checked~.state.p-info:before {  border-color: <on slim bar>;  background-color: <on slim bar>; } .pretty input:checked~.state.p-info label:after, .pretty.p-toggle .state.p-info label:after {  background-color: <on slim knob> !important; } .pretty.p-switch.p-slim .state:before {  background: <off slim bar> !important; } .pretty.p-switch .state label:after {  background-color: <off slim knob> !important; }  */';    }

    // GATHERER FUNCTIONS
    var number_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15};
    function QuickRef() {
        console.log('QuickRef');
        // All data except exact stat numbers
        $('.contentModuleTable tbody').each(function(k,v) {
            if(k%2 === 0) { // even indexed elements are the relevant ones
                var names = $(v).find('th').first().text();
                var namesMatch = names.match(new RegExp(/(.+) with (.+) the (.+) and its .+|(.+) with (.+) the (.+)|(.+)/)); // allow for presence/absence of petpet/petpetpet
                //if (namesMatch) console.log(namesMatch);
                var petpet = [namesMatch[2] || namesMatch[5], namesMatch[3] || namesMatch[6]];
                var petname = namesMatch[1] || namesMatch[4] || namesMatch[7];
                if( !(petname in DATA.pets) ) { // if pet isn't recorded, add it to shown and pets
                    DATA.shown.push(petname);
                    DATA.pets[petname] = {isUncertain: false};
                }
                else if ( !(DATA.pets[petname].species.length) ) { // add pets with only bd stats to shown
                    DATA.shown.push(petname);
                }
                var stats = DATA.pets[petname];

                var lines = $(v).find('.pet_stats td');
                var health = $(lines).eq(5).text().match(new RegExp(/(\d+) \/ (\d+)/));
                //if (health) console.log(health);
                stats.species       = $(lines).eq(0).text();
                stats.color         = $(lines).eq(1).text();
                stats.age           = $(lines).eq(3).text();
                stats.level         = Number($(lines).eq(4).text());
                stats.current_hp    = Number(health[1]);
                stats.max_hp        = Number(health[2]);
                stats.mood          = $(lines).eq(6).text();
                stats.hunger        = $(lines).eq(7).text();
                stats.intelligence  = $(lines).eq(11).text();
                stats.petpet_name   = petpet[0];
                stats.petpet_species= petpet[1];
                stats.petpet_image  = $(lines).eq(12).find('img').attr('src');
                stats.image         = $(v).find('.pet_image').attr('style').split("'")[1];
                stats.isUC          = $(v).find('.pet_notices:contains(converted)').length ? true : false;
                setStrength($(lines).eq(8).text(),petname);
                setDefence( $(lines).eq(9).text(),petname);
                setMovement($(lines).eq(10).text(),petname);
                //console.log(stats);

                DATA.pets[petname] = stats;
            }
        });
    }
    function Training() {
        console.log('Training');
        $("table[width='500'] tbody tr").each(function(k,v) {
            if(k%2 === 0) {
                // get name and retreive data (if any)
                var petname = $(v).children().first().text().split(" ")[0];
                if( !(petname in DATA.pets) ) { // if pet isn't recorded, add it only to pets (since incomplete data)
                    DATA.pets[petname] = {
                        species: '',
                        color: '',
                        mood: '',
                        hunger: '',
                        age: '',
                        level: 0,
                        current_hp: 0,
                        max_hp: 0,
                        strength: 0,
                        defence: 0,
                        movement: 0,
                        intelligence: '',
                        petpet_name: '',
                        petpet_species: '',
                        petpet_image: '',
                        image: '',
                        isUC: false,
                        isUncertain: true
                    };
                }
                var stats = DATA.pets[petname];

                // get stats
                var dStats = $(v).next().children().first().text();
                dStats = dStats.match(new RegExp('Lvl : (.+)Str : (.+)Def : (.+)Mov : (.+)Hp  : (.+) / (.+)'));

                if (dStats) {
                    stats.level         = Number(dStats[1]);
                    stats.strength      = Number(dStats[2]);
                    stats.defence       = Number(dStats[3]);
                    stats.strength      = Number(dStats[4]);
                    stats.current_hp    = Number(dStats[5]);
                    stats.max_hp        = Number(dStats[6]);
                    stats.isUncertain   = false;
                }
                //console.log(stats);

                DATA.pets[petname] = stats;
            }
        });
    }
    function EndTraining() { // incomplete
        console.log('EndTraining');
        var blurb = $('p').first().text();
        blurb = blurb.match(new RegExp(' (.+) now has increased (.+)!!!'));
        if (blurb) {
            var petname = blurb[1];
            if(petname in DATA.pets) { // ignore pets not stored
                var stats = DATA.pets[petname];

                // get stats
                //var dStats = $(v).next().children().first().text();
                //dStats = dStats.match(new RegExp('Lvl : (.+)Str : (.+)Def : (.+)Mov : (.+)Hp  : (.+)'));

                if (dStats) {
                    stats.level         = Number(dStats[1]);
                    stats.strength      = Number(dStats[2]);
                    stats.defence       = Number(dStats[3]);
                    stats.strength      = Number(dStats[4]);
                    stats.current_hp    = Number(dStats[5]);
                    stats.max_hp        = Number(dStats[6]);
                }
                //console.log(stats);

                DATA.pets[petname] = stats;
            }
        }
        else console.log('regex is incorrect');
    }
    function FaerieQuest() {
        console.log('FaerieQuest');
        var petname = $('.pet-name').text().slice(0, -2);
        if (petname.length) { // make sure on right page
            var faerie = $('.description_top').text().match(new RegExp(/for [^A-Z]*([A-Z][^ ]+) /))[1];
            console.log(petname, faerie);

            if(petname in DATA.pets) { // ignore pets not stored
                var stats = DATA.pets[petname];
                console.log('before:\nlv',stats.level,'\nHP: ',stats.max_hp,'\nstr:',stats.strength,'\ndef:',stats.defence,'\nmov:',stats.movement);
                DATA.pets[petname] = questSwitch(faerie,stats);
                console.log('\nafter:\nlv',stats.level,'\nHP: ',stats.max_hp,'\nstr:',stats.strength,'\ndef:',stats.defence,'\nmov:',stats.movement);
            }
        }
    }
    function questSwitch(faerie,stats) {
        switch (faerie) {
            case 'Air':
                stats.movement += 3;
                break;
            case 'Dark':
                stats.current_hp += 3;
                stats.max_hp += 3;
                break;
            case 'Earth':
                // 3 (mov OR def OR str)
                break;
            case 'Fire':
                stats.strength += 3;
                break;
            case 'Light':
                stats.level += 1;
                break;
            case 'Water':
                stats.defence += 3;
                break;
            case 'Battle':
                stats.current_hp += 3;
                stats.max_hp += 3;
                stats.strength += 3;
                stats.defence += 3;
                break;
            case 'Queen':
                stats.level += 2;
                stats.current_hp += 5;
                stats.max_hp += 5;
                stats.strength += 5;
                break;
            case 'Space':
                stats.level += 5;
                break;
            case 'Soup':
                // 2*2 (HP OR def OR str OR mov OR lv)
                var blurb = $('.pet-name').parent().text().match(new RegExp(/gained 2 (\w+)s? .*and 2 (\w+)s?/));
                stats[blurb[1]] += 2;
                stats[blurb[2]] += 2;
                break;
            case 'Gray':
                // leaches off of elemental or fountain faerie. she's a poser.
                var newFaeire = $('.pet-name').parent().text().match(new RegExp(/another faerie. (\w+) .aerie, come/));
                if (newFaeire != "Earth") questSwitch(newFaeire,stats);
                break;
        }
        return stats;
    }
    function Coincidence() {
        console.log('Coincidence');
        var blurb = $('.randomEvent > .copy').text();
        if (blurb.length) {
            /**
             *  stats:
             *      level
             *      hit
             *      defence
             *      attack
             *      intelligence
             *
             *  + 1 to 10 stat:
             *      An electric current seems to fill the room. When everything has settled, you see that there is something different about ACTIVE NEOPET NAME. It looks like their STAT NAME have gone up by X!
             *      A strong electric current fills the room, crackling with powerful energy. When everything has settled, you see that there is something quite different about ACTIVE NEOPET NAME. It looks like their STAT NAME have gone up by X! Wow!
             *
             *  - 1 to 3 stat:
             *      An electric current starts to fill the room, but quickly leads to smoke. When everything has settled, you see that there is something different about ACTIVE PET NAME. Oh, no... It looks like their STAT NAME has gone down by X!
             */
            var match = new RegExp(/about ([^\.]+).+their (\w+).+gone (\w+).+by (\d+)/g).exec(blurb);
            if (match) {
                console.log('matches:',match[1],match[2],match[3],match[4]);
                var stats = DATA.pets[match[1]];
                var n = (match == 'up') ? match[4]*1 : match[4]*(-1);
                if (match[2] == 'hit') {
                    stats.current_hp += n;
                    stats.max_hp += n;
                }
                else if (match[2] == 'intelligence') console.log('not recording this I guess.'); // uhh
                else stats[match[2]] += n;
            }
        }
    }
    function KitchenQuest() {
        console.log('Kitchen Quest');
        /**
         *  +1 hp:          PETNAME has gained a hit point!!!
         *  +1 def:         PETNAME has become better at Defence!!!
         */
        var blurb = $('p>b').eq(1).text();
        var match = new RegExp(/([^ ]+) has .+ ([^ !]+)!/g).exec(blurb);
        if (match) {
            console.log('matches:',match[1],match[2]);
            if (match[1] in DATA.pets) {
                switch (match[2]){
                    case 'point':
                        DATA.pets[match[1]].current_hp += 1;
                        DATA.pets[match[1]].max_hp += 1;
                        break;
                    case 'Defence':
                        DATA.pets[match[1]].defence += 1;
                        break;
                    default:
                        console.log('unknown');
                }
            }
        }
    }
    function SecretLab() {
        console.log('Lab Ray');
        var petname = $('p').eq(0).find('b').text();
        console.log(petname);
        if(petname in DATA.pets) { // ignore pets not stored
            var blurb = $('p').eq(2).text();
            var match = new RegExp(/and s?he ([^ ]+) ([^ ]+) ([^ ]+[^s])s? ([^!]+)/g).exec(blurb);
            if (match) {
                var stats = DATA.pets[petname];
                var n = Number(number_map[match[2]]) || Number(match[2]);
                console.log('matches:',match[1],n,match[3],match[4])
                switch (match[1]) {
                    case "changes":
                        if (match[2]=="color") { // color change
                            // [4] is color
                            stats.color = match[4];
                        } else { // species change
                            // match [4] to /(.+) (.+)/g where [1] is color and [2] is species
                            var morph = new RegExp(/(.+) (.+)/g).exec(match[4]);
                            stats.color = morph[1];
                            stats.species = morph[2];
                        }
                        break;
                    case "gains": // stat change
                        // [2] is quantity, [3] is stat
                        if (match[3]=='maximum') {
                            stats.current_hp += n;
                            stats.max_hp += n;
                        }
                        else stats[match[3]] += n;
                        break;
                    case "loses": // stat change
                        // [2] is quantity, [3] is stat
                        if (match[3]=='maximum') {
                            stats.current_hp -= n;
                            stats.max_hp -= n;
                        }
                        else stats[match[3]] -= n;
                        break;
                    case "goes": // level 1
                        stats.level = 1;
                        break;
                    // else nothing happens or gender change
                }
                DATA.pets[petname] = stats;
            }
            else console.log('no regex match');
        }
    }
    function PetpetLab() {
        console.log("Petpet Lab");
        /**
         *  name change:    b/Bobo shall now be known as b/OMGROFL. How nice.       $('div[align="center"]').find('b').eq(1).text();
         *  color change:   ?
         *  species change: ?
         *  soot:           ?
         *  disappear:      ?
         */
        var newname = $('div[align="center"]').find('b').eq(1).text(); // can also be new level, which should be ignored
        if (newname) console.log('new name:',newname);
    }
    function Sidebar() {
        // get name and retreive data (if any)
        var petname = $("a[href='/quickref.phtml']").first().text();
        if(petname in DATA.pets) { // if pet isn't recorded, not worth starting here
            var stats = DATA.pets[petname];

            // get stats
            var activePetStats = $("td[align='left']");
            var health = $(activePetStats).eq(1).text().match(new RegExp(/(\d+) \/ (\d+)/));
            stats.species       = $(activePetStats).eq(0).text();
            stats.mood          = $(activePetStats).eq(2).text();
            stats.hunger        = $(activePetStats).eq(3).text();
            stats.age           = $(activePetStats).eq(4).text();
            stats.level         = $(activePetStats).eq(5).text();
            stats.current_hp    = health[1];
            stats.max_hp        = health[2];
            stats.image         = $('.activePet a img').attr('src').slice(0,-5)+'4.png'; // pet image (use larger version)
            console.log(stats);

            DATA.pets[petname] = stats;
        }
    }
    function Anywhere() {
        // "<name> loses <amount> <stat> and says" lose 1 or 2 of given stat
        // "<name> has suddenly gotten stronger"   gain 1 strength point
        console.log("I'll get to it eventually.");
    }
    function Age() {
        console.log("I'll get to it eventually.");
    }
    function HealingSprings() {
        /**
         * All of your Neopets gain seven hit points.  I hope that helps! :)
         * All your Neopets have their health completely restored
         * petname regains their hit points and is not hungry any more
         * petname is fully healed
         *
         * 1 3 5
         */
        console.log('Healing Springs')
        var blurb = $('center > p').eq(2).text();
        console.log(blurb)
        var match = blurb.match(new RegExp(/^(All|([^ ]+)) .*( hungry| heal| gain)([^ ]+| (\w+))/)); // ^(All|([^ ]+)) .*(fully|gain)s? (\w+)
        if (match) {
            var n = number_map[match[5]];
            var petname;
            if (match[1]=="All") {
                console.log('All');
                for (petname in DATA.pets) healPet(petname,match[3],n);
            }
            else {
                petname = match[1];
                console.log('pet',petname);
                healPet(petname,match[3],n);
            }
        }
        else console.log('No change.');
    }
    function healPet(petname,match,n) {
        if (petname in DATA.pets) {
            if (match==" gain") {
                console.log('gain',n);
                DATA.pets[petname].current_hp = Number(DATA.pets[petname].current_hp) + Number(n);
            }
            else {
                console.log('fully healed')
                DATA.pets[petname].current_hp = DATA.pets[petname].max_hp;
            }
            if (match==" hungry") {
                console.log('bloated');
                DATA.pets[petname].hunger = 'bloated';
            }
        }
    }
    function Snowager() {
        console.log('Snowager');
    }
    function Soup() {
        console.log('Soup Kitchen')
        $('#bxlist li:not(.bx-clone)').each( function() {
            DATA.pets[$(this).find('b').eq(0).text()] = $(this).find('b').eq(1).text();
        });
    }


    // MISC FUNCTIONS
    function array_move(arr, old_index, new_index) {
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    };
    function color_inc(value) {
        var result = value*1+SETTINGS.i
        return result < 0 ? 0 : result > 255 ? 255 : result;
    }

    // STAT FUNCTIONS
    var STR = ['not yet born','pathetic','very weak','weak','weak','frail','average','quite strong','quite strong','quite strong','strong','strong','very strong','very strong','great','immense','immense','titanic','titanic','titanic','herculean'];
    var U_STR = ['weak','quite strong','strong','very strong','immense','titanic'];
    var DEF = ['not yet born','defenceless','naked','vulnerable','very poor','poor','below average','below average','average','armoured','tough','heavy','heavy','very heavy','very heavy','steel plate','bulletproof','semi deadly godly','demi godly','godly','beyond godly'];
    var U_DEF = ['below average','heavy','very heavy'];
    var MOV = ['not yet born','barely moves','snail pace','lazy','very slow','slow','quite slow','average','average','fast','speedy','super fast','super speedy','breakneck','cheetah','lightning','mach 1','mach 1','mach 2','mach 3','mach 4'];
    function getHP(current, max) {
        if (SETTINGS.hpMode==0) return max;
        if (SETTINGS.hpMode==1) return current+' / '+max;
        var p = current/max;
        var color = p<0.2 ? 'red' : p<0.4 ? 'orange' : p<0.6 ? 'yellow' : p<0.8 ? 'blue' : 'green';
        return '<font color="'+color+'">'+current+' / '+max+'</font>';
    }
    function getBDStat(n,arr) {
        if (SETTINGS.bdMode==0 || (arr!=STR && arr!=DEF && arr!=MOV)) return n; // 'num' <default>
        if (n<21) return SETTINGS.bdMode==1 ? arr[n]+' ('+n+')' : arr[n];       // 'str (num)' OR 'str'
        var word = n<40 ? 'GREAT' : n<60 ? 'EXCELLENT' : n<80 ? 'AWESOME' : n<100 ? 'AMAZING' : n<150 ? 'LEGENDARY' : 'ULTIMATE';
        return SETTINGS.bdMode<3 ? word+' ('+n+')' : word;  // 'str (num)'  /  'str', 'str (num)' <neo default> OR 'str'
    }
    function setStrength(word, petname) {
        var n; // = ((STR.indexOf(word) < 0) ? word.match(/\d+/g)[0] : STR.indexOf(word));
        if (STR.indexOf(word) < 0) {
            n = word.match(/\d+/g)[0];
            if (U_STR.indexOf(word) < 0) {
                var current = DATA.pets[petname].strength;
                n = (current-n)>0 && (current-n)<4 ? current : n;
                DATA.pets[petname].isUncertain = true;
            }
        }
        else n = STR.indexOf(word);
        DATA.pets[petname].strength = Number(n);
        //console.log("strength: ",word,n);
    }
    function setDefence(word, petname) {
        var n; // = ((DEF.indexOf(word) < 0) ? word.match(/\d+/g)[0] : DEF.indexOf(word));
        if (DEF.indexOf(word) < 0) {
            n = word.match(/\d+/g)[0];
            if (U_DEF.indexOf(word) < 0) {
                var current = DATA.pets[petname].defence;
                n = (current-n)>0 && (current-n)<4 ? current : n;
                DATA.pets[petname].isUncertain = true;
            }
        }
        else n = DEF.indexOf(word);
        DATA.pets[petname].defence = Number(n);
        //console.log("defence: ",word,n);
    }
    function setMovement(word, petname) {
        var n = ((MOV.indexOf(word) < 0) ? word.match(/\d+/g)[0] : MOV.indexOf(word));
        if (word == "average") {
            var current = DATA.pets[petname].movement;
            n = (current-n)>0 && (current-n)<3 ? current : n;
            DATA.pets[petname].isUncertain = true;
        }
        DATA.pets[petname].movement = Number(n);
        //console.log("movement: ",word,n);
    }
    /*function int_toInt(word) {
        var n = word.match(/\d+/g);
        n = n ? n[0] : word;
        console.log("intelligence: ",word,n);
        return n;
    }*/


    // COLOR FUNCTIONS
    function getColor(set) {
        if (set) SETTINGS.color = set;
        return String(SETTINGS.color) || THEME;
    }
    function getSubcolor(set) {
        if (set) SETTINGS.subcolor = set;
        if (SETTINGS.subcolor) return String(SETTINGS.subcolor);
        var color = getColor();
        var rgbs = color.match(new RegExp(/rgb\((\d+), ?(\d+), ?(\d+)\)/));
        return rgbs ? 'rgb('+color_inc(rgbs[1])+', '+color_inc(rgbs[2])+', '+color_inc(rgbs[3])+')' : THEME;
    }
    function getBgColor(set) {
        if (set) SETTINGS.bgcolor = set;
        return String(SETTINGS.bgcolor) || BG;
    }
    function changeColor(tinycolor) {
        var color;
        if (tinycolor)
            color = getColor(tinycolor.toRgbString());
        else { // if none selected, return to theme color
            color = getColor(THEME);
            $("#colorpicker").spectrum('set',color); // update the picker too
        }
        if (!SETTINGS.subcolor) changeSubcolor(); // maintain relative color
        $('#colorpicker_text').val(color);
        $('#color_settings div, #increment i').css('color',color);
        $('#sidebar_menus > div, .picker_popup, .hover').css('border-color',color);
        $('.menu_header, #info_nav span, .petnav, .petnav a').css('background-color',color);
        localStorage.setItem("NEOPET_SIDEBAR_SETTINGS", JSON.stringify(SETTINGS));
    }
    function changeSubcolor(tinycolor) {
        var color;
        if (tinycolor) {
            color = getSubcolor(tinycolor.toRgbString());
            $('#increment').hide();
        }
        else { // if none selected, make it relative to color
            SETTINGS.subcolor = '';
            $('#increment').show();
            color = getSubcolor();
            $("#subcolorpicker").spectrum('set',color); // update the picker too
        }
        $('#subcolorpicker_text').val(color);
        $('#color_settings input, #removed_pets, #settings_footer td div').css('color',color);
        $('#sidebar_menus button').css('background-color',color);
        localStorage.setItem("NEOPET_SIDEBAR_SETTINGS", JSON.stringify(SETTINGS));
    }
    function changeBgColor(tinycolor) {
        var color;
        if (tinycolor)
            color = getBgColor(tinycolor.toRgbString());
        else { // if none selected, return to theme color
            color = getBgColor(BG);
            $("#bgcolorpicker").spectrum('set',color); // update the picker too
        }
        $('#bgcolorpicker_text').val(color);
        $('#sidebar_menus > div, .hover, .picker_popup').css('background-color',color);
        localStorage.setItem("NEOPET_SIDEBAR_SETTINGS", JSON.stringify(SETTINGS));
    }

    function functionality(){
        // COLOR PICKERS
        $("#colorpicker").spectrum({
            color: getColor(),
            containerClassName: 'picker_popup',
            replacerClassName: 'picker_button',
            preferredFormat: "hex3",
            showButtons: false,
            allowEmpty:true,
            move: function(tinycolor) { changeColor(tinycolor); }
        });
        $("#subcolorpicker").spectrum({
            color: getSubcolor(),
            containerClassName: 'picker_popup',
            replacerClassName: 'picker_button',
            preferredFormat: "hex3",
            showButtons: false,
            allowEmpty:true,
            move: function(tinycolor) { changeSubcolor(tinycolor); }
        });
        $("#bgcolorpicker").spectrum({
            color: getBgColor(),
            showAlpha: true,
            containerClassName: 'picker_popup',
            replacerClassName: 'picker_button',
            preferredFormat: "rgb",
            showButtons: false,
            allowEmpty:true,
            move: function(tinycolor) { changeBgColor(tinycolor) }
        });
        $(".picker").each(function() { $(this).next().next().val($(this).spectrum('get').toRgbString()); }); // initial fill text fields
        $('.petnav a:not(.disabled)').hover( // here rather than in css because hover can't be changed in 'move'
            function() { $(this).css("background-color",getSubcolor()); },
            function() { $(this).css("background-color",getColor()); }
        );
        $('#colorpicker_text').blur(function() {
            var $picker = $('#colorpicker');
            $picker.spectrum('set', $(this).val()); // doesn't fire event due to infinite loops
            changeColor($picker.spectrum('get'));   // use the picker's' color validation
        });
        $('#subcolorpicker_text').blur(function() {
            var $picker = $('#subcolorpicker');
            $picker.spectrum('set', $(this).val());
            changeSubcolor($picker.spectrum('get'));
        });
        $('#bgcolorpicker_text').blur(function() {
            var $picker = $('#bgcolorpicker');
            $picker.spectrum('set', $(this).val());
            changeBGColor($picker.spectrum('get'));
        });
        $('#increment .fa-caret-up').click(function()   { SETTINGS.i += 5; changeSubcolor(); });
        $('#increment .fa-caret-down').click(function() { SETTINGS.i -= 5; changeSubcolor(); });


        // MENU BUTTONS
        $MODULE.on('click', '#info_button i', function() { // allow for dynamic elements
            $('#info_menu').toggle();
            $('#settings_menu').hide();
            $('.remove_button').hide();
        });
        $MODULE.on('click', '#settings_button i', function() {
            $('#settings_menu').toggle();
            $('.remove_button').toggle();
            $('#info_menu').hide();
        });
        $('.menu_close').click(function() {
            $(this).parent().parent().hide();
            $('.remove_button').hide();
        });
        $(document).keyup(function(e) {
            if (e.key === "Escape") { // escape key maps to keycode `27`
                $('#info_menu').hide();
                $('#settings_menu').hide();
                $('.remove_button').hide();
            }
        });


        // PETS DISPLAYED MANAGEMENT
        $MODULE.on('click', '.remove_button i', function() {
            var petname = $(this).attr('petname');
            DATA.hidden.push(petname);
            DATA.shown.splice( DATA.shown.indexOf(petname), 1);
            $('#removed_pets').append('<option value="'+petname+'">'+petname+'</option>');
            buildModule();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_DATA", JSON.stringify(DATA));
        });
        $('#addback_button i').click(function() {
            var petname = $('#removed_pets').val();
            DATA.shown.push(petname);
            DATA.hidden.splice( DATA.hidden.indexOf(petname), 1);
            buildModule();
            $('#removed_pets option[value="'+petname+'"]').remove();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_DATA", JSON.stringify(DATA));
        });
        $('#delete_button i').click(function() {
            var petname = $('#removed_pets').val();
            DATA.hidden.splice( DATA.hidden.indexOf(petname), 1);
            delete DATA.pets[petname];
            buildModule();
            $('#removed_pets option[value="'+petname+'"]').remove();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_DATA", JSON.stringify(DATA));
        });


        // HOVER SLIDERS
        $MODULE.on({ // hovering over right hover div exposes stats menu
            mouseenter: function() {
                var pixels = (SETTINGS.showPetpet && ($(this).parent().find('.petpet').length)) ? ['500px','95px'] : ['325px','115px']; // smaller when no petpet
                $('#stats_'+$(this).attr('petname')).stop(true).animate({width: pixels[0], marginLeft: pixels[1]}, 800);
            },
            mouseleave: function() {
                $('#stats_'+$(this).attr('petname')).stop(true).animate({width: '5px', marginLeft: '95px'}, 500);
            }
        }, '.rightHover');
        $MODULE.on('click', '.move', function() { // arrow buttons
            if (!$(this).hasClass('disabled')) {
                var i = DATA.shown.indexOf($(this).attr('petname'));
                array_move(DATA.shown,i,i+Number($(this).attr('dir')));
                buildModule();
                localStorage.setItem("NEOPET_SIDEBAR_DATA", JSON.stringify(DATA));
            }
        });
    }

    if (window.jQuery) 
        main();
    else {
        console.log("sidebar: loading jQuery");
        var jq = document.createElement('script');
        jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js";
        document.getElementsByTagName('head')[0].appendChild(jq);
        setTimeout(main, 1000);
    }

})();