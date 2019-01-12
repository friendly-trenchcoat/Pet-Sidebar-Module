// ==UserScript==
// @name           Neopets - Pets Sidebar Module
// @namespace      https://github.com/friendly-trenchcoat
// @version        1.2.6
// @description    Display any number of pets. Moves stats to a div which slides out on hover and adds a navbar for each pet.
// @author         friendly-trenchcoat
// @include        http://www.neopets.com/*
// @grant          none
// ==/UserScript==
/*jshint multistr: true */

/** TODOs:
 * 
 *  fix slider spacing
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
//localStorage.removeItem("NEOPET_SIDEBAR_PETDATA");

(function() {
    'use strict';
    
    // INITIAL GLOBALS
    var SPECTRUM = false;
    var USER, PETS, DATA, $MODULE, FLASH, THEME, BG;
    var STR, U_STR, DEF, U_DEF, MOV; // static
    (function() {
        var username = document.querySelector('.user a:first-child') ? document.querySelector('.user a:first-child').innerHTML : '';
        if (username == "Log in") localStorage.setItem("NEOPET_SIDEBAR_USER", ''); // record logout
        else {
            var last_user = localStorage.getItem("NEOPET_SIDEBAR_USER") || '';
            USER = username || last_user; // not all pages have the header
            if (USER) {
                PETS = JSON.parse(localStorage.getItem("NEOPET_SIDEBAR_PETDATA")) || {};
                DATA = JSON.parse(localStorage.getItem("NEOPET_SIDEBAR_USERDATA_"+USER)) || {
                    showNav:true,
                    showStats:true,
                    showAnim:false,
                    allAccts:false,
                    stickyActive:false,
                    showPetpet:true,
                    hp_mode:2, // 0: max only | 1: current / max   | 2:  plus color
                    bd_mode:0, // 0: num only | 1: 'str (num)' all | 2: 'str (num)' high | 3: str only
                    i:10,      // increment for subcolor when it's relative to color
                    color:'',
                    subcolor:'',
                    bgcolor:'',
                    collapsed:false,
                    shown:[],
                    hidden:[],
                    active:''
                };
                console.log('USER',last_user,'>',USER);
                if (USER != last_user) {
                    clean_pets();
                    localStorage.setItem("NEOPET_SIDEBAR_USER", USER);
                }

                if (window.jQuery) main();
                else load_jQuery();
            }
        }

    })();


    // MAIN
    function main() {
        console.log(DATA);
        console.log(PETS);
        setStatics();

        // UPDATE PETS
        // primary sources
        if (document.URL.indexOf("quickref") != -1) QuickRef();
        else if (document.URL.indexOf("status") != -1 && ( document.URL.indexOf("training") != -1 || document.URL.indexOf("academy") != -1 ) ) Training();

        // permanent changes
        //else if (document.URL.indexOf("process_training") != -1) EndTraining();
        else if (document.URL.indexOf("quests") != -1) FaerieQuest();           // BD stats
        else if (document.URL.indexOf("coincidence") != -1) Coincidence();      // BD stats, int
        else if (document.URL.indexOf("desert/shrine") != -1) Coltzan();        // BD stats, int
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
            createCSS();
            buildMenus();
            main_functionality();
        }

        // STORE DATA
        localStorage.setItem("NEOPET_SIDEBAR_PETDATA", JSON.stringify(PETS));
        localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        //console.log(Object.keys(PETS));
        //console.log(DATA);
    }
    function setStatics() {
        STR = ['not yet born','pathetic','very weak','weak','weak','frail','average','quite strong','quite strong','quite strong','strong','strong','very strong','very strong','great','immense','immense','titanic','titanic','titanic','herculean'];
        U_STR = ['weak','quite strong','strong','very strong','immense','titanic'];
        DEF = ['not yet born','defenceless','naked','vulnerable','very poor','poor','below average','below average','average','armoured','tough','heavy','heavy','very heavy','very heavy','steel plate','bulletproof','semi deadly godly','demi godly','godly','beyond godly'];
        U_DEF = ['below average','heavy','very heavy'];
        MOV = ['not yet born','barely moves','snail pace','lazy','very slow','slow','quite slow','average','average','fast','speedy','super fast','super speedy','breakneck','cheetah','lightning','mach 1','mach 1','mach 2','mach 3','mach 4'];
    }
    function setGlobals() {
        $MODULE = $('.sidebarModule:first-child tbody');
        FLASH = ($('.sidebar').length && document.body.innerHTML.search('swf') !== -1 && document.URL.indexOf("bank") == -1 && document.URL.indexOf("quickref") == -1 && document.URL.indexOf("petlookup") == -1);
        THEME = String($('.sidebarHeader').css('background-color')) || "#000";
        BG = "rgba(255, 255, 255, 0.93)";

        DATA.active = $MODULE.children().eq(0).find('b').text() || "";
    }

    // BUILDER FUNCTIONS
    function buildModule(){
        if (Object.keys(PETS).length > 0) { // if no pets, do nothin
            // get pets to display
            var shown = [];
            var petname;
            if (DATA.allAccts) shown = DATA.shown;
            else {
                for (var i=0; i<DATA.shown.length; i++) {
                    petname = DATA.shown[i];
                    if (PETS[petname].owner==USER) shown.push(petname);
                }
            }
            if (DATA.stickyActive) { // put active pet at the top
                if (shown.includes(DATA.active))
                    array_move(shown,shown.indexOf(DATA.active),0); // move to front of array
                else
                    shown.unshift(DATA.active); // add to front of array
            }
            var len = shown.length;

            // if 0, add back last hidden
            if (len<1) {
                var last = DATA.hidden.pop();
                if (last) {
                    shown.push(last);
                    DATA.shown.push(last);
                }
                else return; // how
            }

            // clear module
            var dir = DATA.collapsed ? 'down' : 'up';
            $MODULE.html( // replace contents with only top bar
                '<tr> \
                    <td id="petsHeader" valign="middle" class="sidebarHeader medText"> \
                        <a href="/quickref.phtml"><b>Pets</b></a> \
                        <span id="fold_button"><i class="fas fa-caret-'+dir+'"></i></span> \
                        <span id="settings_button"><i class="fas fa-cog"></i></span> \
                        <span id="info_button"><i class="fas fa-info-circle"></i></span> \
                    </td> \
                </tr>'
            );

            // add pets
            if (DATA.collapsed) {
                add_pet(shown[0]);
            }
            else {
                for (var i=0; i<len; i++) {
                    petname = shown[i];
                    add_pet(petname);

                    // disable buttons
                    if (i==0)       $('#nav_'+petname).find('.move').eq(0).addClass('disabled');                // move up
                    if (i==(len-1)) $('#nav_'+petname).find('.move').eq(1).addClass('disabled');                // move down
                    if (PETS[petname].isUC) $('#nav_'+petname).find('a').eq(2).addClass('disabled');            // customize
                }
            }
            $('#nav_'+DATA.active).find('a').eq(1).addClass('disabled');                                        // make active
            if (DATA.stickyActive) $('#nav_'+DATA.active).find('.move').addClass('disabled');                   // move up/down
            if (DATA.collapsed) $('#nav_'+shown[0]).find('.move').addClass('disabled');                         // move up/down
        }
    }
    function add_pet(petname) {
        var inactive_id = petname == DATA.active ? '' : 'in';
        var inactive_arrow = petname == DATA.active ? '' : '<i class="fas fa-sign-out-alt fa-5x" petname="'+petname+'"></i>';
        var image = (DATA.showAnim && FLASH) ? 
            '<embed type=\"application/x-shockwave-flash\" src=\"http://images.neopets.com/customise/customNeopetViewer_v35.swf\" width=\"150\" height=\"150\" style=\"undefined\" id=\"CustomNeopetView\" name=\"CustomNeopetView\" bgcolor=\"white\" quality=\"high\" scale=\"showall\" menu=\"false\" allowscriptaccess=\"always\" swliveconnect=\"true\" wmode=\"opaque\" flashvars=\"webServer=http%3A%2F%2Fwww.neopets.com&amp;imageServer=http%3A%2F%2Fimages.neopets.com&amp;gatewayURL=http%3A%2F%2Fwww.neopets.com%2Famfphp%2Fgateway.php&amp;pet_name=%s&amp;lang=en&amp;pet_slot=\">'
            .replace("%s", petname) : '<img src="'+PETS[petname].image+'" width="150" height="150" border="0">';

            
        // for some reason children must be added seperately
        $MODULE.append('<tr id="'+inactive_id+'active_'+petname+'" ></tr> style="position: relative;"');
        $('#'+inactive_id+'active_'+petname).append(
            '<div class="remove_button">'+inactive_arrow+'</div> \
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

    }
    function createStatsHTML(petname) {
        if (!DATA.showStats) return '';  // if stats=false return empty
        var stats = PETS[petname];
        var petpetTD = '', petpetStyle='';
        if (DATA.showPetpet && stats.petpet_image) { // if showPetpet=true and there is a petpet
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
        if (!DATA.showNav) return ''; // if nav=false return empty
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
        $('#info_menu').append(info_HTML());
        $('#settings_menu').append(settings_HTML());
        $('#toggle_settings input[type="checkbox"]').each(function() {
            $(this).prop('checked',DATA[$(this).attr('name')]);
        });
        $('#hp_mode').val(DATA.hp_mode);
        $('#bd_mode').val(DATA.bd_mode);
        $('#info_key').show();
    }
    function info_HTML() {
        var html = 
            '<div class="menu_header">  <div class="menu_close"><i class="fas fa-times"></i></div>  <h1>Info</h1>  <div id="info_nav">  <button name="key">key</button>  <button name="gather">gathering</button>  <button name="about">about</button>  </div> </div> <div class="menu_inner">  <div class="section" id="info_key">  <span>header</span>  <table name="header">  <tr>  <td>Pets</td>  <td>Link to pets quick-ref, the main collection source for the script.</td>  </tr>  <tr>  <td><i class="fas fa-info-circle"></i></td>  <td>This panel</td>  </tr>  <tr>  <td><i class="fas fa-cog"></i></td>  <td>The Settings panel</td>  </tr>  <tr>  <td><i class="fas fa-caret-down"></i></td>  <td>Show only active or all selected pets</td>  </tr>  </table>  <span>pet navigation</span>  <table name="nav">  <tr>  <td><i class="fas fa-chevron-up"></i><i class="fas fa-chevron-down"></i></td>  <td>Move pet up or down one.</td>  </tr>  <tr>  <td><i class="fas fa-splotch"></i></td>  <td>Make active. Directs to quick-ref. <b>Middle click</b> to open it in a new tab if you don\'t want  to leave the page you\'re on.</td>  </tr>  <tr>  <td><i class="fas fa-mask"></i></td>  <td>Customize</td>  </tr>  <tr>  <td><i class="fas fa-id-card"></i></td>  <td>Pet lookup</td>  </tr>  <tr>  <td><i class="fas fa-paw"></i></td>  <td>Petpage</td>  </tr>  <tr>  <td><i class="fas fa-pencil-alt"></i></td>  <td>Edit page</td>  </tr>  </table>  <span>settings</span>  <table name="settings">  <tr>  <td><i class="fas fa-sign-out-alt"></i></td>  <td>Remove pet from sidebar. They will be added to the dropdown in Settings.</td>  </tr>  <tr>  <td><i class="fas fa-plus"></i></td>  <td>Add pet back to sidebar.</td>  </tr>  <tr>  <td><i class="fas fa-trash-alt"></i></td>  <td>Remove pet from data. If you still have them, they will be added back upon visiting quick-ref.</td>  </tr>  <tr>  <td>Color</td>  <td>Click the <b class="box">☒</b> to use your site theme\'s color. </td>  </tr>  <tr>  <td>Accent Color</td>  <td>Click the <b class="box">☒</b> to use a color 10 shades lighter than your main Color. Press the  arrows to raise or lower from 10.</td>  </tr>  <tr>  <td>Animated Pets</td>  <td>On pages that include flash, use animated pet image. Long image-load time.</td>  </tr>  </table>  </div>  <div class="section" id="info_gather">  <span>passive data gathering</span>  <p>All data for the module is gathered from the following pages when you visit them, and stored locally on your  web browser.<br><br>Your settings and pet configuration is account-specific; but pet data is shared,  allowing you to display pets from other accounts in your sidebar.</p>  <span>all pets, all data</span>  <table>  <tr>  <td><a href="http://www.neopets.com/quickref.phtml">Quickref</a></td>  <td>Everything except exact stats numbers</td>  </tr>  <tr>  <td><a href="http://www.neopets.com/island/training.phtml?type=status">Training</a></td>  <td>Exact stats numbers</td>  </tr>  </table>  <span>permanent changes</span>  <table>  <tr>  <td>Faerie/Kitchen Quest</td>  <td>Affected stats numbers</td>  </tr>  <tr>  <td>Coincidence</td>  <td>Affected stats numbers</td>  </tr>  <tr>  <td>Lab Ray</td>  <td>Affected attributes and stats numbers</td>  </tr>  <tr>  <td>Petpet Lab Ray</td>  <td>Affected petpet info</td>  </tr>  <tr>  <td>Coltzan</td>  <td>Affected stats numbers, current HP</td>  </tr>  <tr>  <td>Random Event</td>  <td>Affected stats numbers</td>  </tr>  </table>  <span>temporary changes</span>  <table>  <tr>  <td>Healing Springs</td>  <td>Current HP (illness is not tracked)</td>  </tr>  <tr>  <td>Snowager</td>  <td>Current HP</td>  </tr>  <tr>  <td>Food / Soup Kitchen</td>  <td>Hunger</td>  </tr>  <tr>  <td>Certain Items</td>  <td>Current HP</td>  </tr>  </table>  <h3 style="margin-top: -30px;">* I can\'t gather data from flash elements such as wheels or the battledome.</h3>  </div>  <div class="section" id="info_about">  <span>Pet Sidebar Module version 1.2.6</span>  <h3>https://github.com/friendly-trenchcoat/Pet-Sidebar-Module</h3>  <p>This script is written and tested in Chrome. Listed browser support is theoretical.</p>  <table>  <tbody>  <tr>  <th>Chrome</th>  <th>Firefox</th>  <th>Safari</th>  <th>IE</th>  <th>Opera</th>  </tr>  <tr>  <td>4.0+</td>  <td>3.6+</td>  <td>4.0+</td>  <td>8.0+</td>  <td>11.5+</td>  </tr>  </tbody>  </table><br><span>Questions, concerns, bugs, requests?</span>  <p>If it don\'t work, throw me a line.<br>  Find me on reddit or github as <b>friendly-trenchcoat</b> <i class="fas fa-user-secret fa-2x"></i>  <br>  Your friendly neighborhood trenchcoat.  </p>  </div> </div>';
        return html;
    }
    function settings_HTML() {
        var removed = '';
        for (var i=0; i < DATA.hidden.length; i++)
            if (DATA.allAccts || PETS[DATA.hidden[i]].owner==USER)
                removed += '<option value="'+DATA.hidden[i]+'">'+DATA.hidden[i]+'</option>';
        var html =
            '<div class="menu_header">  <div class="menu_close"><i class="fas fa-times"></i></div>  <h1>Settings</h1> </div> <div class="menu_inner">  <div class="section">  <table id="color_settings">  <tr>  <td>  <div>Color:</div>  <input class="picker" id="colorpicker">  <input class="picker_text" id="colorpicker_text">  </td>  <td>  <div>Accent<br>Color:</div>  <input class="picker" id="subcolorpicker">  <input class="picker_text" id="subcolorpicker_text">  <div id="increment">  <i class="fas fa-caret-up"></i>  <i class="fas fa-caret-down"></i>  </div>  </td>  <td>  <div>Background<br>Color:</div>  <input class="picker" id="bgcolorpicker">  <input class="picker_text" id="bgcolorpicker_text">  </td>  </tr>  </table>  </div>  <div class="section">  <table id="toggle_settings">  <tr>  <td>  <table>  <tr>  <td><div>navigation menu</div></td>  <td><div class="pretty p-switch p-fill"><input type="checkbox" name="showNav"/><div class="state p-success"><label> ‏‏‎ </label></div></div></td>  </tr>  <tr>  <td><div>pet sats slider</div></td>  <td><div class="pretty p-switch p-fill"><input type="checkbox" name="showStats"/><div class="state p-success"><label> ‏‏‎ </label></div></div></td>  </tr>  <tr>  <td><div>flash animated pet images</div></td>  <td><div class="pretty p-switch p-fill"><input type="checkbox" name="showAnim"/><div class="state p-success"><label> ‏‏‎ </label></div></div></td>  </tr>  <tr>  <td><div>all accounts</div></td>  <td><div class="pretty p-switch p-fill"><input type="checkbox" name="allAccts"/><div class="state p-success"><label> ‏‏‎ </label></div></div></td>  </tr>  </table>  </td>  <td>  <table>  <tr>  <td><div>keep active pet at top</div></td>  <td><div class="pretty p-switch p-fill"><input type="checkbox" name="stickyActive"/><div class="state p-success"><label> ‏‏‎ </label></div></div></td>  </tr>  <tr>  <td><div>include petpet in slider</div></td>  <td><div class="pretty p-switch p-fill"><input type="checkbox" name="showPetpet"/><div class="state p-success"><label> ‏‏‎ </label></div></div></td>  </tr>  <tr>  <td><div>HP display mode</div></td>  <td>  <select id="hp_mode">  <option value="0">#</option>  <option value="1">#/#</option>  <option value="2" style="color: green;">#/# (color)</option>  </select>  </td>  </tr>  <tr>  <td><div>BD stats display mode</div></td>  <td>  <select id="bd_mode">  <option value="0">#</option>  <option value="1">str (#)</option>  <option value="2">neo default</option>  <option value="3">str</option>  </select>  </td>  </tr>  </table>  </td>  </tr>  </table>  </div>  <div class="section">  <table id="settings_footer">  <tr>  <td>  <select id="removed_pets" name="removed">'+removed+'</select>  <div id="addback_button"><i class="fas fa-plus"></i></div>  <div id="delete_button"><i class="fas fa-trash-alt"></i></div>  </td>  <td>  <button id="clear_button">clear all pet data</button>  </td>  </tr>  </table>  </div> </div>';
        return html;
    }
    function createCSS() {
        var color = getColor();
        var subcolor = getSubcolor();
        var bgcolor = getBgColor();
        var statsCSS = document.createElement("style");
        var theme = color == THEME;
        var h1color = theme ? $('.sidebarHeader a').css('color') : "#fff";
        var h2color = theme ? $('.sidebarHeader').css('color') : "#fff";
        statsCSS.type = "text/css";
        statsCSS.innerHTML = // shut up.
            '/* menus - general */ #sidebar_menus > div {  position: fixed;  display: none;  height: 400px;  width: 700px;  margin: 52px;  background-color: '+bgcolor+';  border: 4px solid '+color+';  border-radius: 20px;  z-index: 100; } .menu_header {  background-color: '+color+';  padding: 1px;  margin-top: -1px;  border-radius: 10px 10px 0px 0px; } .menu_header h1 {  color: '+h1color+';  font-family: Verdana, Arial, Helvetica, sans-serif;  font-size: 35px;  margin: 1px 5px;  letter-spacing: -1px;  display: inline-block; } .menu_close {  float: right;  cursor: pointer;  font-size: 30px;  color: '+h2color+';  margin: 5.5px 14px; } .menu_close:hover {  font-size: 31px;  margin: 5.25px 13.5px; } .menu_inner {  width: 90%;  height: 75%;  margin: 20px auto; } .section {  width: 100%;  min-height: 20%;  max-height: 100%;  margin: 14px auto; } .section:nth-child(2) {  border: 5px dotted #0003;  margin-top: 20px; } .section > span {  display: inline-block;  text-align: left;  padding: 5px 15px 0px; } .section > table {  margin: auto;  width: 100%;  text-align: left;  padding: 15px 10px; } .section td span {  padding: 5px;  display: block; } .section p {  margin: 5px 0px 20px 60px;  font-size: 13px;  width: 80%; }   /* menus - info */ #info_key, #info_gather {  overflow: auto; } #info_nav {  display: inline; } #info_nav button {  background-color: '+color+';  border: none;  padding: 0px 25px;  margin: 0px -5px 0px -1.5px;  cursor: pointer;  color: '+h2color+';  font-size: 17px; } #info_nav button:focus {  outline: none;  font-weight: bold; } #info_menu .section {  display: none; } #info_menu span {  margin-left: 50px;  font-weight: bold;  font-size: 18px;  letter-spacing: -0.5px;  color: '+color+'; } #info_menu table {  border-collapse: collapse;  width: 80%;  margin-bottom: 30px; } #info_menu tr:nth-child(odd) {  background-color: #f2f2f2; } #info_menu tr:nth-child(even) {  background-color: #fff; } #info_menu .section:not(#info_about) td:first-child {  text-align: center;  width: 150px;  font-size: 14px;  font-weight: bold; } #info_menu td:first-child {  padding: 8px; } #info_menu td:first-child i {  font-size: 18px; } .box {  font-size: 18px;  font-weight: normal; } #info_menu h3 {  margin: -3px 0px 0px 66px;  font-weight: lighter;  font-size: 8px; } #info_about .fas {  margin-top: 6px; }   /* menus - settings */ /* color */ #color_settings {  table-layout: fixed;  border-spacing: 45px 0px;  padding: 0px; } #color_settings td:first-child>div:first-child {  font-size: 24;  margin-bottom: 6.75px; } #color_settings div, #color_settings input {  margin-bottom: 2px;  letter-spacing: -1px;  font-weight: 600;  font-size: 14; } #color_settings div:not(#increment) {  display: inline-block !important;  color: '+color+'; } #color_settings input {  width: 100%;  text-align: center;  font-size: 12;  letter-spacing: -1.5px;  padding: 2px 0px;  color: '+subcolor+'; } .picker_button {  background: none;  border: none;  float: right; } .picker_popup {  background: '+bgcolor+';  border-color: '+color+'; } #increment {  position: absolute;  margin: -21px 0px 0px 153px; } #increment i {  display: block;  margin: -6px auto;  font-size: 16px;  cursor: pointer;  color: '+color+'; } /* toggles */ #toggle_settings table td {  padding: 5px; } #toggle_settings table td:nth-child(odd) {  text-align: right; } #toggle_settings div {  font-size: 14px; } #toggle_settings select {  width: 100px; } #hp_mode option {  font-weight: bold; } /* remove */ .remove_button {  background: #0006;  width: 150px;  height: 115px;  position: absolute;  text-align: center;  padding-top: 35px;  z-index: 100;  display: none; } .remove_button i {  color: #fffd;  cursor: pointer; } .remove_button i:hover {  color: #fff;  font-size: 81;  margin-top: -0.5px; } #removed_pets {  width: 200px;  font-size: 16px;  color: '+subcolor+';  border-color: #0003;  margin-left: 50px; } /* buttons */ #settings_menu button {  background-color: '+subcolor+';  border: none;  padding: 10px 16px;  margin: 4px 2px;  cursor: pointer;  border-radius: 100px;  color: #fff;  font-weight: 300;  font-size: 16px; } #settings_footer {  padding: 0px; } #settings_footer td div {  display: inline;  font-size: 22px;  padding-left: 10px;  color: '+subcolor+';  cursor: pointer; } #clear_button {  float: right; }   /* pets */ .placeholder {  width: 150px;  height: 150px;  position: absolute;  z-index: 98;  background-color: #fff; } .petGlam {  position: relative;  z-index: 99; }  /* nav bar */ #petsHeader span {  float: right;  font-size: 12px; } #petsHeader span i {  cursor: pointer;  padding: 0px 4px; } .petnav:hover, .leftHover:hover ~ .petnav, .leftSubHover:hover ~ .petnav {  margin-left: -30px; } .petnav a:hover {  cursor: pointer;  margin-left: -5px; } .petnav a:hover .sub {  margin-left: -25px; } .leftHover {  position: absolute;  z-index: 100;  height: 150px;  width: 50px;  margin-left: 3px; } .leftSubHover {  position: absolute;  z-index: 80;  height: 150px;  width: 25px;  margin-left: -22px; } .petnav {  position: absolute;  width: 42px;  z-index: 97;  background-color: '+color+';  border-radius: 12px 0px 0px 12px;  -webkit-transition-property: margin-left;  -webkit-transition-duration: .5s;  transition-property: margin-left;  transition-duration: .5s; } .petnav a {  position: relative;  display: block;  height: 25px;  font-size: 18px;  color: #fff;  background-color: '+color+';  border-radius: 12px 0px 0px 12px;  z-index: 98; } .disabled {  color: #fffa !important; } .disabled:hover {  margin-left: 0px !important; } .petnav span {  float: left;  width: 32px;  background-color: inherit;  border-radius: 12px 0px 0px 12px; } .petnav i {  padding: 3px; } .sub {  position: absolute !important;  width: 30px;  z-index: -1 !important;  -webkit-transition-property: margin-left;  -webkit-transition-duration: .2s;  transition-property: margin-left;  transition-duration: .2s; } .sub i {  padding: 5.5px; }   /* stats slider */ .rightHover {  position: absolute;  z-index: 100;  height: 150px;  width: 50px;  margin-left: 103px; } .hover {  position: absolute;  border-radius: 25px;  background-color: '+bgcolor+';  border: 3px solid '+color+';  padding: 20px;   height: 104px;  width: 5px;  margin-left: 95px;  overflow: hidden;  z-index: 98; } .inner {  height: 100%;  width: 90%;  float: right;  display: inline; } .inner table {  font: 7pt Verdana;  vertical-align: top; } .inner img {  border: 2px #ccc dashed; }  .inner i {  font: 6.5pt Verdana; } .stats td:nth-child(2) { min-width: 80px; } /* checkboxes .pretty.p-switch.p-slim input:checked~.state.p-info:before {  border-color: <on slim bar>;  background-color: <on slim bar>; } .pretty input:checked~.state.p-info label:after, .pretty.p-toggle .state.p-info label:after {  background-color: <on slim knob> !important; } .pretty.p-switch.p-slim .state:before {  background: <off slim bar> !important; } .pretty.p-switch .state label:after {  background-color: <off slim knob> !important; }  */';
        document.body.appendChild(statsCSS);
    }

    // GATHERER FUNCTIONS
    function QuickRef() {
        console.log('QuickRef');
        console.log(DATA);
        console.log(PETS);
        // All data except exact stat numbers
        $('.contentModuleTable tbody').each(function(k,v) {
            if(k%2 === 0) { // even indexed elements are the relevant ones
                var names = $(v).find('th').first().text();
                var namesMatch = names.match(new RegExp(/(.+) with (.+) the (.+) and its .+|(.+) with (.+) the (.+)|(.+)/)); // allow for presence/absence of petpet/petpetpet
                //if (namesMatch) console.log(namesMatch);
                var petpet = [namesMatch[2] || namesMatch[5], namesMatch[3] || namesMatch[6]];
                var petname = namesMatch[1] || namesMatch[4] || namesMatch[7];
                if( !(petname in PETS) ) { // if pet isn't recorded, add it to shown and pets
                    DATA.shown.push(petname);
                    PETS[petname] = {isUncertain: false};
                }
                else if ( !(PETS[petname].species.length) ) { // add pets with only bd stats to shown
                    DATA.shown.push(petname);
                }
                var stats = PETS[petname];

                var lines = $(v).find('.pet_stats td');
                var health = $(lines).eq(5).text().match(new RegExp(/(\d+) \/ (\d+)/));
                //if (health) console.log(health);
                stats.owner         = USER;
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

                PETS[petname] = stats;
            }
        });
    }
    function Training() {
        console.log('Training');
        $("table[width='500'] tbody tr").each(function(k,v) {
            if(k%2 === 0) {
                // get name and retreive data (if any)
                var petname = $(v).children().first().text().split(" ")[0];
                if( !(petname in PETS) ) { // if pet isn't recorded, add it only to pets (since incomplete data)
                    PETS[petname] = {
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
                var stats = PETS[petname];

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

                PETS[petname] = stats;
            }
        });
    }
    function EndTraining() { // incomplete
        console.log('EndTraining');
        var blurb = $('p').first().text();
        blurb = blurb.match(new RegExp(' (.+) now has increased (.+)!!!'));
        if (blurb) {
            var petname = blurb[1];
            if(petname in PETS) { // ignore pets not stored
                var stats = PETS[petname];

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

                PETS[petname] = stats;
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

            if(petname in PETS) { // ignore pets not stored
                var stats = PETS[petname];
                console.log('before:\nlv',stats.level,'\nHP: ',stats.max_hp,'\nstr:',stats.strength,'\ndef:',stats.defence,'\nmov:',stats.movement);
                PETS[petname] = questSwitch(faerie,stats);
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
                var stats = PETS[match[1]];
                var n = (match == 'up') ? match[4]*1 : match[4]*(-1);
                if (match[2] == 'hit') {
                    stats.current_hp += n;
                    stats.max_hp += n;
                }
                else if (match[2] == 'intelligence') console.log('not recording this I guess.'); // uhh
                else if (match[2] == 'attack') stats.strength += n;
                else stats[match[2]] += n;
            }
        }
    }
    function Coltzan() {
        console.log('Coltzan');
        var blurb = $('div[align="center"] p').eq(0).text();
        if (blurb.length) {
            /**
             *  stats:
             *      level
             *      hit
             *      defence
             *      attack
             *      intelligence
             *
             *  PETNAME has gained 1 point(s) of defence!
             *  PETNAME has gained 1 level(s)! 
             *  PETNAME gains 1 level! ?
             *  PETNAME feels stronger! 
             *  PETNAME feels faster! 
             *  PETNAME feels more intelligent! 
             *  All your Neopets are healed to full health!
             *  
             */
            var match = new RegExp(/^([^ ]+) (has gained (\d+)|feels|your).* (\w+)(\(|!)/g).exec(blurb);
            if (match) {
                console.log('matches:',match[1],match[4]); // petname, stat
                var petname = match[1];
                if (petname == "All")
                    for (petname in PETS) if (PETS[petname].owner == USER)
                        PETS[petname].current_hp = PETS[petname].max_hp;
                else if (petname in PETS) {
                    switch (match[4]) {
                        case 'level':
                            console.log(match[3]);
                            PETS[petname].level +=match[3];
                            break;
                        case 'defence':
                            console.log(match[3]);
                            PETS[petname].defence +=match[3];
                            break;
                        case 'stronger':
                            PETS[petname].strength +=1;
                            break;
                        case 'faster':
                            PETS[petname].movement +=1;
                            break;
                    }
                }
            }
            else console.log('No change.');
        }
    }
    function KitchenQuest() {
        console.log('Kitchen Quest');
        /**
         *  +1 hp:          PETNAME has gained a hit point!!!
         *  +1 mov:         PETNAME has gained a level!!! (?)
         *  +1 def:         PETNAME has become better at Defence!!!
         *  +1 str:         PETNAME has become better at Attack!!!
         *  +1 mov:         PETNAME has become better at Agility!!!
         */
        var blurb = $('p>b').eq(1).text();
        var match = new RegExp(/([^ ]+) has .+ ([^ !]+)!/g).exec(blurb);
        if (match) {
            console.log('matches:',match[1],match[2]);
            if (match[1] in PETS) {
                switch (match[2]){
                    case 'point':
                        PETS[match[1]].current_hp += 1;
                        PETS[match[1]].max_hp += 1;
                        break;
                    case 'level':
                        PETS[match[1]].level += 1;
                        break;
                    case 'Defence':
                        PETS[match[1]].defence += 1;
                        break;
                    case 'Attack':
                        PETS[match[1]].strength += 1;
                        break;
                    case 'Agility':
                        PETS[match[1]].movement += 1;
                        break;
                    default:
                        console.log('unknown');
                }
            }
        }
    }
    function SecretLab() {
        /**
         *  ... and she changes into a Green Nimmo!!
         */
        console.log('Lab Ray');
        var petname = $('p').eq(0).find('b').text();
        console.log(petname);
        if(petname in PETS) { // ignore pets not stored
            var blurb = $('p').eq(2).text();
            var match = new RegExp(/and s?he ([^ ]+) ([^ ]+) a? ?([^ ]+[^ s])s? ?([^!]+)/g).exec(blurb);
            if (match) {
                var number_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15};
                var stats = PETS[petname];
                var n = Number(number_map[match[2]]) || Number(match[2]);
                console.log('matches:',match[1],n,match[3],match[4])
                switch (match[1]) {
                    case "changes":
                        if (match[2]=="color") { // color change
                            // [4] is color
                            stats.color = match[4];
                        } else { // species change
                            // match [4] to /(.+) (.+)/g where [1] is color and [2] is species
                            //var morph = new RegExp(/(.+) (.+)/g).exec(match[4]);
                            stats.color = match[3];
                            stats.species = match[4];
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
                    default:
                        console.log('No change'); // or gender change
                }
                PETS[petname] = stats;
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
        else console.log('no change?');
    }
    function Sidebar() {
        // get name and retreive data (if any)
        var petname = $("a[href='/quickref.phtml']").first().text();
        if(petname in PETS) { // if pet isn't recorded, not worth starting here
            var stats = PETS[petname];

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
            //console.log(stats);

            PETS[petname] = stats;
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
        console.log('Healing Springs');
        var blurb = $('center > p').eq(2).text();
        var match = blurb.match(new RegExp(/^(All|([^ ]+)) .*( hungry| heal| gain)([^ ]+| (\w+))/)); // ^(All|([^ ]+)) .*(fully|gain)s? (\w+)
        if (match) {
            var number_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15};
            var n = number_map[match[5]];
            var petname;
            if (match[1]=="All") {
                console.log('All');
                for (petname in PETS) if (PETS[petname].owner == USER) healPet(petname,match[3],n);
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
        if (petname in PETS) {
            if (match==" gain") {
                console.log('gain',n);
                PETS[petname].current_hp = Number(PETS[petname].current_hp) + Number(n);
            }
            else {
                console.log('fully healed')
                PETS[petname].current_hp = PETS[petname].max_hp;
            }
            if (match==" hungry") {
                console.log('bloated');
                PETS[petname].hunger = 'bloated';
            }
        }
    }
    function Snowager() {
        console.log('Snowager');
    }
    function Soup() {
        console.log('Soup Kitchen')
        $('#bxlist li:not(.bx-clone)').each( function() {
            PETS[$(this).find('b').eq(0).text()].hunger = $(this).find('b').eq(1).text();
        });
    }


    // MISC FUNCTIONS
    function array_move(arr, old_index, new_index) {
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    };
    function color_inc(value) {
        var result = value*1+DATA.i
        return result < 0 ? 0 : result > 255 ? 255 : result;
    }
    function clean_pets() {
        var all = DATA.shown.concat(DATA.hidden);
        var len = all.length;
        var pets = Object.keys(PETS);
        for (var petname in PETS) {
            if (!all.includes(petname)) {
                len += 1;
                DATA.shown.push(petname);
            }
        }
        if (len != pets.length) {
            for(var i=0; i<DATA.shown.length; i++)
                if (!pets.includes(DATA.shown[i])) {
                    DATA.shown.splice(i,1);
                    i -= 1;
                }
            for(var i=0; i<DATA.hidden.length; i++)
                if (!pets.includes(DATA.hidden[i])) {
                    DATA.hidden.splice(i,1);
                    i -= 1;
                }
        }
        localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
    }

    // STAT FUNCTIONS
    function getHP(current, max) {
        if (DATA.hp_mode==0) return max;
        if (DATA.hp_mode==1) return current+' / '+max;
        var p = current/max;
        var color = p<0.2 ? 'red' : p<0.4 ? 'orange' : p<0.6 ? 'yellow' : p<0.8 ? 'blue' : 'green';
        return '<font color="'+color+'">'+current+' / '+max+'</font>';
    }
    function getBDStat(n,arr) {
        if (DATA.bd_mode==0 || (arr!=STR && arr!=DEF && arr!=MOV)) return n; // 'num' <default>
        if (n<21) return DATA.bd_mode==1 ? arr[n]+' ('+n+')' : arr[n];       // 'str (num)' OR 'str'
        var word = n<40 ? 'GREAT' : n<60 ? 'EXCELLENT' : n<80 ? 'AWESOME' : n<100 ? 'AMAZING' : n<150 ? 'LEGENDARY' : 'ULTIMATE';
        return DATA.bd_mode<3 ? word+' ('+n+')' : word;  // 'str (num)'  /  'str', 'str (num)' <neo default> OR 'str'
    }
    function setStrength(word, petname) {
        var n; // = ((STR.indexOf(word) < 0) ? word.match(/\d+/g)[0] : STR.indexOf(word));
        if (STR.indexOf(word) < 0) {
            n = word.match(/\d+/g)[0];
            if (U_STR.indexOf(word) < 0) {
                var current = PETS[petname].strength;
                n = (current-n)>0 && (current-n)<4 ? current : n;
                PETS[petname].isUncertain = true;
            }
        }
        else n = STR.indexOf(word);
        PETS[petname].strength = Number(n);
        //console.log("strength: ",word,n);
    }
    function setDefence(word, petname) {
        var n; // = ((DEF.indexOf(word) < 0) ? word.match(/\d+/g)[0] : DEF.indexOf(word));
        if (DEF.indexOf(word) < 0) {
            n = word.match(/\d+/g)[0];
            if (U_DEF.indexOf(word) < 0) {
                var current = PETS[petname].defence;
                n = (current-n)>0 && (current-n)<4 ? current : n;
                PETS[petname].isUncertain = true;
            }
        }
        else n = DEF.indexOf(word);
        PETS[petname].defence = Number(n);
        //console.log("defence: ",word,n);
    }
    function setMovement(word, petname) {
        var n = ((MOV.indexOf(word) < 0) ? word.match(/\d+/g)[0] : MOV.indexOf(word));
        if (word == "average") {
            var current = PETS[petname].movement;
            n = (current-n)>0 && (current-n)<3 ? current : n;
            PETS[petname].isUncertain = true;
        }
        PETS[petname].movement = Number(n);
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
        if (set) DATA.color = set;
        return String(DATA.color) || THEME;
    }
    function getSubcolor(set) {
        if (set) DATA.subcolor = set;
        if (DATA.subcolor) return String(DATA.subcolor);
        var color = getColor();
        var rgbs = color.match(new RegExp(/rgb\((\d+), ?(\d+), ?(\d+)\)/));
        return rgbs ? 'rgb('+color_inc(rgbs[1])+', '+color_inc(rgbs[2])+', '+color_inc(rgbs[3])+')' : THEME;
    }
    function getBgColor(set) {
        if (set) DATA.bgcolor = set;
        return String(DATA.bgcolor) || BG;
    }
    function changeColor(tinycolor) {
        var color;
        if (tinycolor) {
            $('.menu_header h1, #info_nav button, .menu_close').css('color','#fff');
            color = getColor(tinycolor.toRgbString());
        }
        else { // if none selected, return to theme color
            color = getColor(THEME);
            $('.menu_header h1').css('color',$('.sidebarHeader a').css('color'));
            $('#info_nav button, .menu_close').css('color',$('.sidebarHeader').css('color'));
            $("#colorpicker").spectrum('set',color); // update the picker too
        }
        if (!DATA.subcolor) changeSubcolor(); // maintain relative color
        $('#colorpicker_text').val(color);
        $('#color_settings div, #increment i').css('color',color);
        $('#sidebar_menus > div, .picker_popup, .hover').css('border-color',color);
        $('.menu_header, #info_nav span, .petnav, .petnav a').css('background-color',color);
        localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
    }
    function changeSubcolor(tinycolor) {
        var color;
        if (tinycolor) {
            color = getSubcolor(tinycolor.toRgbString());
            $('#increment').hide();
        }
        else { // if none selected, make it relative to color
            DATA.subcolor = '';
            $('#increment').show();
            color = getSubcolor();
            $("#subcolorpicker").spectrum('set',color); // update the picker too
        }
        $('#subcolorpicker_text').val(color);
        $('#color_settings input, #removed_pets, #settings_footer td div').css('color',color);
        $('#settings_menu button').css('background-color',color);
        localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
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
        localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
    }

    function settings_functionality() {
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
        $('#increment .fa-caret-up').click(function()   { DATA.i += 5; changeSubcolor(); });
        $('#increment .fa-caret-down').click(function() { DATA.i -= 5; changeSubcolor(); });


        // PETS DISPLAYED MANAGEMENT
        $MODULE.on('click', '.remove_button i', function() {
            var petname = $(this).attr('petname');
            DATA.hidden.push(petname);
            DATA.shown.splice( DATA.shown.indexOf(petname), 1);
            $('#removed_pets').append('<option value="'+petname+'">'+petname+'</option>');
            buildModule();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        });
        $('#addback_button i').click(function() {
            var petname = $('#removed_pets').val();
            DATA.shown.push(petname);
            DATA.hidden.splice( DATA.hidden.indexOf(petname), 1);
            buildModule();
            $('#removed_pets option[value="'+petname+'"]').remove();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        });
        $('#delete_button i').click(function() {
            var petname = $('#removed_pets').val();
            DATA.hidden.splice( DATA.hidden.indexOf(petname), 1);
            delete PETS[petname];
            buildModule();
            $('#removed_pets option[value="'+petname+'"]').remove();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        });


        // SETTINGS
        $('#toggle_settings input[type="checkbox"]').change(function() {
            DATA[$(this).attr('name')] = $(this).prop('checked');
            buildModule();
            $('.remove_button').show();
            console.log(DATA);
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        });
        $('#hp_mode,#bd_mode').change(function() {
            var id = $(this).attr('id');
            var val = $(this).val();
            DATA[id] = val;
            buildModule();
            $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        });

        // RESETS
        $('#clear_button').click(function() {
            localStorage.removeItem("NEOPET_SIDEBAR_PETDATA");
            PETS = {};
            DATA.shown = [];
            DATA.hidden = [];
            DATA.active = '';
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        });

        
        $('#settings_menu').toggle();
        $('.remove_button').toggle();
        $('#info_menu').hide();
    }

    function main_functionality() {
        // MENU BUTTONS
        $MODULE.on('click', '#info_button i', function() { // allow for dynamic elements
            $('#info_menu').toggle();
            $('#settings_menu').hide();
            $('.remove_button').hide();
        });
        $MODULE.on('click', '#settings_button i', function() {
            if (SPECTRUM) {
                $('#settings_menu').toggle();
                $('.remove_button').toggle();
                $('#info_menu').hide();
            }
            else load_spectrum();
        });
        $MODULE.on('click', '#fold_button i', function() {
            DATA.collapsed = DATA.collapsed ? false : true;
            buildModule();
            if ($('#settings_menu').is(":visible")) $('.remove_button').show();
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
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
        

        // INFO NAV
        $('#info_nav button').click(function() {
            $('#info_menu .section').hide();
            $('#info_'+$(this).attr('name')).show();
        });


        // HOVER SLIDERS
        $MODULE.on({ // hovering over right hover div exposes stats menu
            mouseenter: function() {
                var pixels = (DATA.showPetpet && ($(this).parent().find('.petpet').length)) ? ['500px','95px'] : ['390px','120px']; // smaller when no petpet
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
                if ($('#settings_menu').is(":visible")) $('.remove_button').show();
                localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
            }
        });
    }

    // LOAD RESOURCES
    function load_jQuery() {
        console.log("sidebar: loading jQuery");
        var jq = document.createElement('script');
        jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js";
        document.getElementsByTagName('head')[0].appendChild(jq);
        setTimeout(main, 500);
    }
    function load_spectrum() {
        //console.log("sidebar: loading spectrum");
        SPECTRUM = true;
        var jq = document.createElement('script');
        jq.src = "http://bgrins.github.com/spectrum/spectrum.js";
        document.getElementsByTagName('head')[0].appendChild(jq);
        setTimeout(settings_functionality, 100);
    }

})();