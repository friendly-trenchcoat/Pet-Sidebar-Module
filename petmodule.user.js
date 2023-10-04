// ==UserScript==
// @name           Neopets - Pets Sidebar Module
// @namespace      https://github.com/friendly-trenchcoat
// @version        1.3.2.1
// @description    Customizable module displaying any number of pets for any number of accounts. Each pet has a navbar and stats info in menus which slide out on hover.
// @author         friendly-trenchcoat
// @match          https://www.neopets.com/*
// @grant          none
// ==/UserScript==
/*jshint multistr: true */
/* globals $ */

/**
 *
 *  Things I will not gather data from:
 *      anything that will reflect change on the original legacy sidebar module, can just be gathered on page reload
 *      anything that redirects you to quick ref
 *
 *  Things I may one day gather from:
 *      apple bobbing, for "Blurred Vision" if I ever track wellness
 *      books, tdmbgpop, if I ever track int
 *      items with obscure effects, if I ever care that much
 *      decaying age/hunger/mood, if I ever care that much
 *      turmaculus, for pet str and petpet... existance, if I ever care that much
 *
 *  TODO:
 *      - UI for when there's no pet data
 *      - Wellness
 *          > Sidebar
 *          > Apple bobbing
 *          > Inventory (looks like they forgot to update the UI for medicine)
 *
 */

(function() {
    'use strict';

    // INITIAL GLOBALS
    // I know I should have made a class but I don't feel like it now
    const VERSION = '1.3.2.1';
    let SPECTRUM = false;
    let USER, PETS, DATA, $CONTAINER, $MODULE, THEME, CSS, BG_CSS, CONTAINER_CSS, BG, IS_BETA;
    const [STR, U_STR, DEF, U_DEF, MOV] = setStatics();
    const DATA_DEFAULTS = {
        showNav:true,
        showStats:true,
        stickyActive:false,
        trueExpression:false,
        allAccts:false,
        neolodge:true,
        training:true,
        gravedanger:true,
        betaBG:false,
        debug:false,
        showName:false,
        showGender:false,
        showPetpet:true,
        showPetpetpet:false,
        hp_mode:2,      // 0: max only | 1: current / max   | 2:  plus color
        bd_mode:0,      // 0: num only | 1: 'str (num)' all | 2: 'str (num)' high | 3: str only
        interactableSlider:false,
        i:10,           // increment for subcolor when it's relative to color
        color:'',
        subcolor:'',
        bgcolor:'',
        collapsed:false,
        shown:[],
        hidden:[],
        active:''
    };

    try { init(); }
    catch(err) {
        console.error(err);
        if (err.message.indexOf('Cannot read property') >= 0) {
            clear_pets(); // this usually solves the issue
            init();
        }
    }
    function init() {
        const username = document.querySelector('.user a:first-child')?.innerHTML || document.querySelector('.nav-profile-dropdown-text > a')?.innerHTML || '';
        if (username == "Log in") localStorage.setItem("NEOPET_SIDEBAR_USER", ''); // record logout
        else {
            const last_user = localStorage.getItem("NEOPET_SIDEBAR_USER") || '';
            USER = username || last_user; // not all pages have the header
            if (USER) {
                PETS = JSON.parse(localStorage.getItem("NEOPET_SIDEBAR_PETDATA")) || {};
                const numbers = ['current_hp','max_hp','level','strength','defence','movement'];
                for (let petname in PETS) for (let i in numbers) PETS[petname][numbers[i]] = Number(PETS[petname][numbers[i]]);
                DATA = {...DATA_DEFAULTS, ...JSON.parse(localStorage.getItem("NEOPET_SIDEBAR_USERDATA_"+USER))};
                psm_debug('USER',last_user,'>',USER);
                if (USER != last_user) {
                    clean_pets();
                    localStorage.setItem("NEOPET_SIDEBAR_USER", USER);
                }

                if (window.jQuery) main();
                else load_jQuery();
            }
        }
    }


    // MAIN
    function main() {
        if (!window.jQuery) {
            psm_debug('...')
            setTimeout(main, 50);
            return;
        }
        psm_debug('DATA',DATA);
        psm_debug('PETS',PETS);

        // UPDATE PETS
        setStatics();
        // primary sources
        if (document.URL.indexOf("quickref") != -1) QuickRef();
        else if (document.URL.indexOf("dome/neopets") != -1) Battledome1();
        else if (document.URL.indexOf("dome/fight") != -1) Battledome2();
        else if (document.URL.indexOf("status") != -1 && ( document.URL.indexOf("training") != -1 || document.URL.indexOf("academy") != -1 ) ) Training();

        // permanent changes
        else if (document.URL.indexOf("island/process_") != -1 || document.URL.indexOf("pirates/process_") != -1) EndTraining(); // BD stats
        else if (document.URL.indexOf("quests") != -1) FaerieQuest();                           // BD stats
        else if (document.URL.indexOf("coincidence") != -1) Coincidence();                      // BD stats, int
        else if (document.URL.indexOf("desert/shrine") != -1) Coltzan();                        // BD stats, int
        else if (document.URL.indexOf("/kitchen") != -1) $(document).ajaxSuccess(KitchenQuest); // BD stats
        else if (document.URL.indexOf("process_lab2") != -1) SecretLab();                       // BD stats, color, species, gender
        else if (document.URL.indexOf("process_petpetlab") != -1) PetpetLab();                  // petpet name, color, spcies, existance
        else if (document.URL.indexOf("neopetpet") != -1) Petpet();                             // petpet name

        // wheels are not completed, just keeping active for logs
        else if (document.URL.indexOf("faerieland/wheel") != -1) spinWheel(Excitement);
        else if (document.URL.indexOf("extravagance") != -1) spinWheel(Extravagance);
        else if (document.URL.indexOf("medieval/knowledge") != -1) spinWheel(Knowledge);
        else if (document.URL.indexOf("halloween/wheel") != -1) spinWheel(Misfortune);
        else if (document.URL.indexOf("mediocrity") != -1) spinWheel(Mediocrity);
        else if (document.URL.indexOf("monotony") != -1) spinWheel(Monotony);

        // other temp changes
        else if (document.URL.indexOf("springs") != -1) HealingSprings();
        else if (document.URL.indexOf("dome/arena") != -1) Battle();
        else if (document.URL.indexOf("snowager") != -1) $(document).ajaxSuccess(Snowager);
        else if (document.URL.indexOf("geraptiku/process_tomb") != -1) Geraptiku();
        else if (document.URL.indexOf("soupkitchen") != -1) Soup();
        else if (document.URL.indexOf("inventory") != -1) Inventory();
        else if (document.URL.indexOf("book_neolodge") != -1) Neolodge();

        // utility
        else if (document.URL.indexOf("gravedanger") != -1) GraveDanger();

        // default
        else if ($(".sidebar")[0]) Sidebar();
        Random();

        // MISC.
        if (document.URL.indexOf("/neolodge") != -1) fill_neolodge();

        // ADD ELEMENTS
        if ($(".sidebar")[0] || $("#container__2020")[0] && document.URL.indexOf('neopets.com/index.phtml') == -1) {
            $("head").append (
                '<link href="https://use.fontawesome.com/releases/v5.15.3/css/all.css" rel="stylesheet" type="text/css">' + // icon images
                '<link href="https://cdn.jsdelivr.net/npm/pretty-checkbox@3.0/dist/pretty-checkbox.min.css" rel="stylesheet" type="text/css">' + // checkboxes
                '<link href="https://bgrins.github.io/spectrum/spectrum.css" rel="stylesheet" type="text/css">' ); // color pickers
            setGlobals();
            buildModule();
            createCSS();
            buildMenus();
            main_functionality();
        }
        if (!IS_BETA && $('#header')[0] && document.URL.indexOf('lookup') == -1) createBackgroundCSS();

        // STORE DATA
        set_items(true,true,false);
    }
    function setStatics() {
        return [
            ['not yet born','pathetic','very weak','weak','weak','frail','average','quite strong','quite strong','quite strong','strong','strong','very strong','very strong','great','immense','immense','titanic','titanic','titanic','herculean'],
            ['weak','quite strong','strong','very strong','immense','titanic'],
            ['not yet born','defenceless','naked','vulnerable','very poor','poor','below average','below average','average','armoured','tough','heavy','heavy','very heavy','very heavy','steel plate','bulletproof','semi-deadly-godly','demi-godly','godly','beyond godly'],
            ['below average','heavy','very heavy'],
            ['not yet born','barely moves','snail pace','lazy','very slow','slow','quite slow','average','average','fast','speedy','super fast','super speedy','breakneck','cheetah','lightning','mach 1','mach 1','mach 2','mach 3','mach 4']
        ]
    }
    function setGlobals() {
        IS_BETA = !!$("#container__2020")[0];
        if (IS_BETA) {
            $('#container__2020').before('<div id="container__psm"><table id="psm"><tbody></tbody></table></div>');
            $CONTAINER = $('div#container__psm');
            $MODULE = $('table#psm tbody');
            THEME = String($('.nav-top__2020>a').css('color')) || "#000";
            BG = "rgba(255, 255, 255, 0.99)";

            DATA.active = $('.profile-dropdown-link').text() || "";
            DATA.betaBG_url = $('body').css('background-image');
        } else {
            $MODULE = $('.sidebarModule:first-child tbody');
            THEME = String($('.sidebarHeader').css('background-color')) || "#000";
            BG = "rgba(255, 255, 255, 0.99)";

            DATA.active = $MODULE.children().eq(0).find('b').text() || "";
        }
    }

    // BUILDER FUNCTIONS
    function buildModule(){
        // psm_debug('Build module');
        if (Object.keys(PETS).length > 0 && DATA.active in PETS) { // if no pets, do nothin
            // get pets to display
            let shown = [];
            let petname;
            if (DATA.allAccts) shown = DATA.shown;
            else {
                for (let i=0; i<DATA.shown.length; i++) {
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
            const len = shown.length;
            if (len>0) {
                // clear module
                const dir = DATA.collapsed ? 'right' : 'down';
                $MODULE.html( // replace contents with only top bar
                    '<tr id="row_petsHeader" > \
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
                    for (let i=0; i<len; i++) {
                        petname = shown[i];
                        add_pet(petname);

                        // disable buttons
                        if (i==0)       $('#nav_'+petname).find('.move').eq(0).addClass('disabled');                        // move up
                        if (i==(len-1)) $('#nav_'+petname).find('.move').eq(1).addClass('disabled');                        // move down
                        // if (PETS[petname].isUC) $('#nav_'+petname).find('a').eq(2).removeAttr('href').addClass('disabled'); // customize
                    }
                }
                $('#nav_'+DATA.active).find('a').eq(1).removeAttr('href').addClass('disabled');                             // make active
                if (DATA.stickyActive) $('#nav_'+DATA.active).find('.move').addClass('disabled');                           // move up/down
                if (DATA.collapsed) $('#nav_'+shown[0]).find('.move').addClass('disabled');                                 // move up/down
            }
        }
    }
    function add_pet(petname) {
        const inactive = petname == DATA.active ? '' : 'in';
        const neolodge = DATA.neolodge && PETS[petname].owner == USER && (new Date).getTime() > PETS[petname].neolodge ?
            ' style="display: flex;"' : '';
        const training = DATA.training && PETS[petname].training >= 0 && PETS[petname].owner == USER && (new Date).getTime() > PETS[petname].training ?
        ' style="display: flex;"' : '';
        const gravedanger = DATA.gravedanger && PETS[petname].petpet_danger >= 0 && PETS[petname].owner == USER && (new Date).getTime() > PETS[petname].petpet_danger ?
        ' style="display: flex;"' : '';
        const expression = DATA.trueExpression ? PETS[petname].expression : '1';

        // for some reason children must be added seperately
        $MODULE.append('<tr id="'+inactive+'active_'+petname+'" ></tr>');
        $('#'+inactive+'active_'+petname).append(
            '<div class="remove_button"><i class="fas fa-sign-out-alt fa-5x" petname="'+petname+'"></i></div> \
            <div class="timers"> \
                <div class="neolodge"'+neolodge+'> \
                    <a href="https://www.neopets.com/neolodge.phtml"><i class="fas fa-concierge-bell fa-lg"></i></a> \
                </div> \
                <div class="training"'+training+'> \
                    <a href="'+PETS[petname].training_url+'"><i class="fas fa-dumbbell"></i></a> \
                </div> \
                <div class="grave-danger"'+gravedanger+'> \
                    <a href="https://www.neopets.com/halloween/gravedanger/index.phtml"><i class="fas fa-skull fa-lg"></i></a> \
                </div> \
            </div> \
            <div class="leftHover" petname="'+petname+'"></div> \
            <div class="leftSubHover" petname="'+petname+'"></div> \
            <div class="rightHover" petname="'+petname+'"></div> \
            '+createNavHTML(petname)+' \
            '+createStatsHTML(petname)+' \
            <div class="placeholder"></div> \
            <a class="petGlam"><img src="https://pets.neopets.com/cp/'+PETS[petname].id+'/'+expression+'/4.png" width="150" height="150" border="0"></a>');
        $('#nav_'+petname).find('.activate').on('auxclick',() => {
            psm_debug('New active:',petname)
            DATA.active = petname;
            buildModule();
        })
        $('#nav_'+petname).find('.lookup').append(
            '<a class="sub" href="https://www.neopets.com/neopet_desc.phtml?edit_petname='+petname+'"><span><i class="fas fa-pencil-alt fa-xs"></i></span></a>');
        $('#nav_'+petname).find('.petpage').append(
            '<a class="sub" href="https://www.neopets.com/editpage.phtml?pet_name='+petname+'"><span><i class="fas fa-pencil-alt fa-xs"></i></span></a>');

    }
    function createStatsHTML(petname) {
        if (!DATA.showStats) return '';  // if stats=false return empty
        const stats = PETS[petname];
        let petpetTD = '', petpetStyle='', petpetpetTD = '';
        if (DATA.showPetpet && stats.petpet_image) { // if showPetpet=true and there is a petpet
            const a1 = DATA.interactableSlider ? `<a href="https://www.neopets.com/neopetpet.phtml?neopet_name=${petname}">` : '';
            const a2 = DATA.interactableSlider ? `</a>` : '';
            petpetTD =
                `<td align="center" class="petpet">${a1}
                    <b>${stats.petpet_name}</b> the<br>${stats.petpet_species}<br><br>
                    <img src="${stats.petpet_image}" width="80" height="80"><br><br>
                    ${a2}</td>`;
            petpetStyle = ' style="margin-top: -15px;"';

            if (DATA.showPetpetpet && stats.petpetpet_image) { // if showPetpetpet=true and there is a petpetpet
                petpetpetTD =
                    `<td align="center" class="petpetpet"><div>${a1}
                        and its<br>${stats.petpetpet_species}<br><br>
                        <img src="${stats.petpetpet_image}" width="80" height="80"><br><br>
                    ${a2}</div></td>`;
            }
        }
        const name = DATA.showName ? `<div class="petname">${petname}</div>` : '';
        const gender = DATA.showGender ? `
            <tr>
                <td align="right">Gender:</td>
                <td align="left"><b style="color: ${stats.gender === 'Female' ? '#FD9AFF' : 'blue'}">${stats.gender}</b></td>
            </tr>
        ` : '';
        const hp = getHP(stats.current_hp,stats.max_hp);
        const int = DATA.interactableSlider
            ? `<a href="https://www.neopets.com/books_read.phtml?pet_name=${petname}"><b>${stats.intelligence}</b></a>`
            : `<b>${stats.intelligence}</b>`;
        const statsHTML =
            '<div id="stats_'+petname+'" class="hover stats" petname="'+petname+'"> \
            <div class="inner"'+petpetStyle+'> \
            \
            '+name+'\
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
            '+gender+'\
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
            <td align="left">'+int+'</td> \
            </tr> \
            </table> \
            </td> \
            \
            '+petpetTD+' \
            '+petpetpetTD+' \
            \
            </tr></table> \
            \
            </div> \
            </div>';
        return statsHTML;
    }
    function createNavHTML(petname) {
        if (!DATA.showNav) return ''; // if nav=false return empty
        const buttonsHTML =
            '<div id="nav_'+petname+'" class="petnav"> \
                <a class="move" dir="-1" petname="'+petname+'"><span><i class="fas fa-chevron-up"></i></span></a> \
                <a class="activate" href="https://www.neopets.com/process_changepet.phtml?new_active_pet='+petname+'" target="_blank"><span><i class="fas fa-splotch"></i></span></a> \
                <a class="customize" href="https://www.neopets.com/customise/?view='+petname+'"><span><i class="fas fa-hat-cowboy-side"></i></span></a> \
                <a class="lookup" href="https://www.neopets.com/petlookup.phtml?pet='+petname+'"><span><i class="fas fa-id-card"></i></span></a> \
                <a class="petpage" href="https://www.neopets.com/~'+petname+'"><span><i class="fas fa-paw"></i></span></a> \
                <a class="move" dir="1" petname="'+petname+'"><span><i class="fas fa-chevron-down"></i></span></a> \
            </div>';
        return buttonsHTML;
    }
    function buildMenus() {
        $(IS_BETA ? '#container__2020' : '.content').first().prepend(
            '<div id="sidebar_menus"> \
                <div id="info_menu"></div> \
                <div id="settings_menu"></div> \
            </div>');
        $('#info_menu').append(info_HTML());
        $('#settings_menu').append(settings_HTML());
        $('#toggle_settings_tabs>div').on('click', (e) => {
            e.preventDefault();
            if (!$(e.target).hasClass('tab-active')) {
                $('#toggle_settings_tabs>div, #toggle_settings_bodies>table').toggleClass('tab-active');
            }
        })
        $('#toggle_settings_bodies input[type="checkbox"]').each(function() {
            $(this).prop('checked',DATA[$(this).attr('name')]);
        });
        $('#hp_mode').val(DATA.hp_mode);
        $('#bd_mode').val(DATA.bd_mode);
        $('#info_key').show();
    }
    function info_HTML() {
        const html =
            '<div class="menu_header"> <div class="menu_close"><i class="fas fa-times"></i></div> <h1>Info</h1> <div id="info_nav"> <button name="key" class="active-section">key</button> <button name="gather">gathering</button> <button name="about">about</button> </div> </div> <div class="menu_inner"> <div class="section" id="info_key"> <span>header</span> <table name="header"> <tr> <td>Pets</td> <td>Link to pets quick-ref, the main collection source for the script.</td> </tr> <tr> <td><i class="fas fa-info-circle"></i></td> <td>This panel</td> </tr> <tr> <td><i class="fas fa-cog"></i></td> <td>The Settings panel</td> </tr> <tr> <td><i class="fas fa-caret-up"></i><i class="fas fa-caret-down"></i></td> <td>Show only top or all selected pets</td> </tr> </table> <span>pet navigation</span> <table name="nav"> <tr> <td><i class="fas fa-chevron-up"></i><i class="fas fa-chevron-down"></i></td> <td>Move pet up or down one.</td> </tr> <tr> <td><i class="fas fa-splotch"></i></td> <td>Make active. Directs to quick-ref. <b>Middle click</b> or <b>ctrl+click</b> to open it in a new tab if you don\'t want to leave the page you\'re on.</td> </tr> <tr> <td><i class="fas fa-hat-cowboy-side"></i></td> <td>Customize</td> </tr> <tr> <td><i class="fas fa-id-card"></i></td> <td>Pet lookup</td> </tr> <tr> <td><i class="fas fa-paw"></i></td> <td>Petpage</td> </tr> <tr> <td><i class="fas fa-pencil-alt"></i></td> <td>Edit page</td> </tr> </table> <span>reminders</span> <h2>Reminders will display an icon over a pet linking to the relevant page when it\'s time to perform an action. They can be enabled or disabled in the settings panel. </h2> <table name="reminders"> <tr> <td><i class="fas fa-concierge-bell"></i></td> <td>Neolodge. Appears when your pet is not on holiday.</td> </tr> <tr> <td><i class="fas fa-dumbbell"></i></td> <td>Training School. Appears when your pet has completed their lesson.</td> </tr> <tr> <td><i class="fas fa-skull"></i></td> <td>Grave Danger. Appears when your petpet has returned from the catacombs.</td> </tr> </table> <span>settings</span> <table name="settings"> <tr> <td><i class="fas fa-sign-out-alt"></i></td> <td>Remove pet from sidebar. They will be added to the dropdown in Settings.</td> </tr> <tr> <td><i class="fas fa-plus"></i></td> <td>Add pet back to sidebar.</td> </tr> <tr> <td><i class="fas fa-trash-alt"></i></td> <td>Remove pet from data. If you still have them, they will be added back upon visiting quick-ref.</td> </tr> <tr> <td>Color</td> <td>Click the <b class="box">☒</b> to use your site theme\'s color. </td> </tr> <tr> <td>Accent Color</td> <td>Click the <b class="box">☒</b> to use a color 10 shades lighter than your main Color. Press the arrows to raise or lower from 10.</td> </tr> <tr> <td>Debug Mode</td> <td>Enables console logs which can be helpful in troubleshooting.</td> </tr> </table> </div> <div class="section" id="info_gather"> <span>passive data gathering</span> <p>All data for the module is gathered from the following pages when you visit them, and stored locally on your web browser.<br><br>Your settings and pet configuration is account-specific; but pet data is shared, allowing you to display pets from other accounts in your sidebar.</p> <span>all pets, all data</span> <table> <tr> <td><a href="https://www.neopets.com/quickref.phtml">Quickref</a></td> <td>Everything except exact stats numbers</td> </tr> <tr> <td><a href="https://www.neopets.com/island/training.phtml?type=status">Training</a></td> <td>Exact stats numbers</td> </tr> <tr> <td><a href="https://www.neopets.com/dome/neopets.phtml">Battledome</a></td> <td>Exact stats numbers</td> </tr> </table> <span>permanent changes</span> <table> <tr> <td>Faerie/Kitchen Quests</td> <td>Affected stats numbers</td> </tr> <tr> <td>Coincidence</td> <td>Affected stats numbers</td> </tr> <tr> <td>Lab Ray</td> <td>Affected attributes and stats numbers</td> </tr> <tr> <td>Petpet Lab Ray</td> <td>Affected petpet info</td> </tr> <tr> <td>Coltzan</td> <td>Affected stats numbers, current HP</td> </tr> </table> <span>temporary changes</span> <table> <tr> <td>Healing Springs</td> <td>Current HP (illness is not tracked)</td> </tr> <tr> <td>Snowager</td> <td>Current HP</td> </tr> <tr> <td>Food / Soup Kitchen</td> <td>Hunger</td> </tr> <tr> <td>Certain Items</td> <td>Current HP</td> </tr> </table> <h3 style="margin-top: -30px;">* Wheels haven\'t been added yet, and I don\'t bother with obscure things.</h3> </div> <div class="section" id="info_about"> <span>Pet Sidebar Module version '+VERSION+'</span> <h3><a href="https://github.com/friendly-trenchcoat/Pet-Sidebar-Module">https://github.com/friendly-trenchcoat/Pet-Sidebar-Module</a> </h3> <p>This script is written and tested primarily in Chrome. Listed browser support is more or less theoretical. </p> <table> <tbody> <tr> <th>Chrome</th> <th>Firefox</th> <th>Safari</th> <th>Opera</th> <th>IE/Edge</th> </tr> <tr> <td>4.0+</td> <td>3.6+</td> <td>4.0+</td> <td>11.5+</td> <td>lol no</td> </tr> </tbody> </table><br><span>Questions, concerns, bugs, requests?</span> <p>If it don\'t work, throw me a line. <font style="font-size: 8;">(Ideally with a screenshot and console output.)</font><br> Find me on reddit or github as <b>friendly-trenchcoat</b> <i class="fas fa-user-secret fa-2x"></i> <br> Your friendly neighborhood trenchcoat. </p> </div> </div>';
        return html;
    }
    function settings_HTML() {
        let removed = '';
        for (let i=0; i < DATA.hidden.length; i++)
            if (DATA.allAccts || PETS[DATA.hidden[i]].owner==USER)
                removed += '<option value="'+DATA.hidden[i]+'">'+DATA.hidden[i]+'</option>';
        const html =
            '<div class="menu_header"> <div class="menu_close"><i class="fas fa-times"></i></div> <h1>Settings</h1> </div> <div class="menu_inner"> <div class="section"> <table id="color_settings"> <tr> <td> <div>Color:</div> <input class="picker" id="colorpicker"> <input class="picker_text" id="colorpicker_text"> </td> <td> <div>Accent<br>Color:</div> <input class="picker" id="subcolorpicker"> <input class="picker_text" id="subcolorpicker_text"> <div id="increment"> <i class="fas fa-caret-up"></i> <i class="fas fa-caret-down"></i> </div> </td> <td> <div>Background<br>Color:</div> <input class="picker" id="bgcolorpicker"> <input class="picker_text" id="bgcolorpicker_text"> </td> </tr> </table> </div> <div class="section" id="toggle_settings_section"> <div id="toggle_settings_tabs"> <div name="general" class="tab-active">General</div> <div name="stats">Stats Slider</div> </div> <div id="toggle_settings_bodies"> <table name="general" class="tab-active"> <tr> <td> <table> <tr> <td> <div>navigation menu</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="showNav" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>pet stats slider</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="showStats" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>keep active pet at top</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="stickyActive" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>display true expression</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="trueExpression" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>all accounts</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="allAccts" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> </table> </td> <td> <table> <tr> <td> <div>neolodge reminder</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="neolodge"> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>training reminder</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="training"> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>grave danger reminder</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="gravedanger"> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>always use beta theme bg</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="betaBG"> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>debug mode</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="debug"> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> </table> </td> </tr> </table> <table name="stats"> <tr> <td> <table> <tr> <td> <div>show pet name</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="showName" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>show pet gender</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="showGender" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>show petpet in slider</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="showPetpet" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> <tr> <td> <div>show petpetpet in slider</div> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="showPetpetpet" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> </table> </td> <td> <table> <tr> <td> <div>HP display mode</div> </td> <td> <select id="hp_mode"> <option value="0">#</option> <option value="1">#/#</option> <option value="2" style="color: green;">#/# (color)</option> </select> </td> </tr> <tr> <td> <div>BD stats display mode</div> </td> <td> <select id="bd_mode"> <option value="0">#</option> <option value="1">str (#)</option> <option value="2">neo default</option> <option value="3">str</option> </select> </td> </tr> <tr> <td> <div>interactable slider</div> <h2>stats slider will not disappear on hover, and will include links to books read and petpet interraction</h2> </td> <td> <div class="pretty p-switch p-fill"><input type="checkbox" name="interactableSlider" /> <div class="state p-success"><label> ‏‏‎ </label></div> </div> </td> </tr> </table> </td> </tr> </table> </div> </div> <div class="section"> <table id="settings_footer"> <tr> <td id="removed_pets_container" '+(removed.length ? '' : ' style="display: none;"')+'> <div id="removed_pets_label">Removed Pets:</div> <select id="removed_pets" name="removed">'+removed+'</select> <div class="footer-btn" id="addback_button"><i class="fas fa-plus"></i></div> <div class="footer-btn" id="delete_button"><i class="fas fa-trash-alt"></i></div> </td> <td> <button id="clear_button">clear all pet data</button> </td> </tr> </table> </div> </div>';
        return html;
    }
    function createBackgroundCSS() {
        BG_CSS = BG_CSS || document.createElement("style");
        BG_CSS.innerHTML = `.betaBG { background-image: ${DATA.betaBG_url} !important; }`;
        document.body.appendChild(BG_CSS);
        if (DATA.betaBG) $('body').addClass('betaBG');
    }
    function createCSS() {
        const color = getColor();
        const subcolor = getSubcolor();
        const bgcolor = getBgColor();
        const textcolor = getTextColor(bgcolor);
        const theme = color == THEME;
        const h1color = theme ? $('.sidebarHeader a').css('color') : "#fff";
        const h2color = theme ? $('.sidebarHeader').css('color') : "#fff";
        CSS = CSS || document.createElement("style");
        CSS.innerHTML = '\
            /* BETA */ body { overflow-x: hidden; } .navsub-left__2020 { margin-left: 225px; } .navsub-left__2020 div#toggleNeggsThemeButton { padding: 5px 15px; display: inline-block; vertical-align: top; margin: auto; } .navsub-right__2020 { margin-right: 115px; } #navsub-buffer__2020 { height: 45px !important; } div#footer__2020 { z-index: 97; } #container__2020 { width: calc(95% - 230px); opacity: 95%; border-left: 200px solid transparent; /* border-left: 225px solid transparent; border-right: 115px solid transparent; */ background-clip: padding-box; } #container__psm { position: absolute; left: calc(50% - 150px); /* left: calc(50% - 190px); */ top: 68px; width: 225px; margin-top: 0.5%; background: none; z-index: 96; overflow-x: visible; } #container__psm>table#psm { margin-left: 60px; border: 3px solid #fff; border-radius: 14px; border-spacing: 5px; } #container__psm>table#psm>tbody { position: relative; display: block; border-radius: 15px; } #container__psm>table#psm>tbody>tr { margin-bottom: -4px; display: block; position: relative; } #container__psm>table#psm>tbody>tr#row_petsHeader { display: block; background: #fff; border-radius: 10px 10px 0px 0px; padding: 0px 5px; font-family: "Palanquin", "Arial Bold", sans-serif; line-height: 25px; } #container__psm>table#psm>tbody>tr:last-child>a.petGlam>img, #container__psm>table#psm>tbody>tr:last-child>div.placeholder { border-radius: 0px 0px 10px 10px; } /* menus - general */ #container__2020>#sidebar_menus>div { left: calc(50% - 350px); } #sidebar_menus>div { display: none; position: fixed; width: 700px; height: 462px; margin: 52px; background-color: '+bgcolor+'; border: 4px solid '+color+'; border-radius: 20px; z-index: 100; } .menu_header { background-color: '+color+'; padding: 1px; margin-top: -1px; border-radius: 10px 10px 0px 0px; } .menu_header h1 { color: '+h1color+'; font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 35px; margin: 1px 5px; letter-spacing: -1px; display: inline-block; } .menu_close { float: right; cursor: pointer; font-size: 30px; color: '+h2color+'; margin: 5.5px 14px; } .menu_close:hover { font-size: 31px; margin: 5.25px 13.5px; } .menu_inner { width: 90%; height: 75%; margin: 20px auto; font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 9pt; } .section { width: 100%; min-height: 20%; max-height: 100%; margin: 14px auto; } .section>span { display: inline-block; text-align: left; padding: 5px 15px 0px; } .section>table { margin: auto; width: 100%; text-align: left; padding: 5px 10px; } .section td span { padding: 5px; display: block; } .section p { margin: 5px 0px 20px 60px; font-size: 13px; width: 80%; } /* menus - info */ #info_key, #info_gather { overflow: auto; } #info_gather { border: 5px dotted #ccc; margin-top: 20px; } #info_nav { display: inline; } #info_nav>button { background-color: '+color+'; border: none; padding: 0px 25px; margin: 0px -5px 0px -1.5px; cursor: pointer; color: '+h2color+'; font-size: 17px; } #info_nav>button.active-section { font-weight: bold; } #info_nav>button:focus { outline: none; font-weight: bold; } #info_menu .section { display: none; } #info_menu span { margin-left: 50px; font-weight: bold; font-size: 18px; letter-spacing: -0.5px; color: '+color+'; } #info_menu table { border-collapse: collapse; width: 80%; margin-bottom: 30px; } #info_menu tr:nth-child(odd) { background-color: #f2f2f2; } #info_menu tr:nth-child(even) { background-color: #fff; } #info_menu .section:not(#info_about) td:first-child { text-align: center; width: 150px; font-size: 14px; font-weight: bold; } #info_menu td:first-child { padding: 8px; } #info_menu td:first-child i { font-size: 18px; } .box { font-size: 18px; font-weight: normal; } #info_menu h2 { margin: 0px 60px 10px 66px; font-weight: lighter; font-size: 12px; color: #888; } #info_menu h3 { margin: -3px 0px 0px 66px; font-weight: lighter; font-size: 8px; } #info_about .fas { margin-top: 6px; } /* menus - settings */ /* color */ #color_settings { table-layout: fixed; border-spacing: 45px 0px; padding: 0px; font-family: Verdana, Arial, Helvetica, sans-serif; } #color_settings td:first-child>div:first-child { font-size: 22px; margin-bottom: 6.75px; } #color_settings div, #color_settings input { margin-bottom: 2px; letter-spacing: -1px; font-weight: 600; font-size: 14px; } #color_settings div:not(#increment) { display: inline-block !important; color: '+color+'; } #color_settings input { width: 100%; text-align: center; font-size: 12px; letter-spacing: -1.5px; padding: 2px 0px; color: '+subcolor+'; } .picker_button { background: none; border: none; float: right; } .picker_popup { background: '+bgcolor+'; border-color: '+color+'; } .sp-container { position: fixed !important; } #increment { position: absolute; margin: -21px 0px 0px 153px; } #increment i { display: block; margin: -6px auto; font-size: 16px; cursor: pointer; color: '+color+'; } /* toggles */ #toggle_settings_section { margin: 0px auto 30px; } div#toggle_settings_tabs { display: flex; gap: 5px; margin-bottom: -2px; } div#toggle_settings_tabs>div { font-size: 16px; background-color: #eee; margin: 0; padding: 5px 15px 4px 12px; border-radius: 6px 6px 0 0; color: white; cursor: pointer; } div#toggle_settings_tabs>div.tab-active { font-weight: 600; color: white; background-color: #ccc; } #toggle_settings_bodies { position: relative; z-index: 0; } #toggle_settings_bodies>table { display: none; table-layout: fixed; border: 3px dotted #ccc; width: 100%; border-radius: 0 6px 6px 6px; padding: 5px 0px; height: 172px; } #toggle_settings_bodies>table.tab-active { display: table; } #toggle_settings_bodies>table > tbody > tr > td { vertical-align: top; } #toggle_settings_bodies>table table { margin: auto; } #toggle_settings_bodies>table table td { padding: 5px; vertical-align: baseline; } #toggle_settings_bodies>table table td:nth-child(odd) { text-align: right; } #toggle_settings_bodies>table div { font-size: 14px; } #toggle_settings_bodies>table select { width: 100px; } #toggle_settings_bodies>table h2 { margin: 4px 0px 0px 0px; font-weight: lighter; font-size: 10.5px; color: #888; } #hp_mode option { font-weight: bold; } /* remove */ .remove_button { background: #0006; width: 150px; height: 115px; position: absolute; text-align: center; padding-top: 35px; z-index: 102; display: none; } .remove_button i { color: #fffd; cursor: pointer; } .remove_button i:hover { color: #fff; font-size: 81px; } #removed_pets { width: 200px; font-size: 16px; color: '+subcolor+'; border-color: #0003; margin-left: 50px; } /* buttons */ #settings_menu button { background-color: '+subcolor+'; border: none; padding: 10px 16px; margin: 4px 2px; cursor: pointer; border-radius: 100px; color: #fff; font-weight: 300; font-size: 16px; } #settings_footer { padding: 0px; } #settings_footer td div { color: '+subcolor+'; } #settings_footer td div#removed_pets_label { font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt; font-weight: bold; margin-left: 50px; margin-top: -16px; } #settings_footer td div.footer-btn { font-size: 22px; padding-left: 10px; cursor: pointer; display: inline; } #clear_button { float: right; } /* pets */ .placeholder { width: 150px; height: 150px; position: absolute; z-index: 98; background-color: #fff; } .petGlam { position: relative; z-index: 99; } .timers { position: absolute; height: 100%; display: flex; flex-wrap: wrap; flex-direction: column; align-items: center; } .timers>div { position: relative; z-index: 103; margin: 7px; padding: 6px; background-color: #0003; border-radius: 100px; cursor: pointer; display: none; align-items: center; justify-content: center; width: 22px; height: 22px; font-size: 16px; } .timers>div i { color: #fff !important; display: inline; } .timers>div:hover { animation: shake 0.5s; } @keyframes shake { 0% { transform: rotate(0deg); } 10% { transform: rotate(-5deg); } 20% { transform: rotate(5deg); } 30% { transform: rotate(0deg); } 40% { transform: rotate(5deg); } 50% { transform: rotate(-5deg); } 60% { transform: rotate(0deg); } 70% { transform: rotate(-5deg); } 80% { transform: rotate(5deg); } 90% { transform: rotate(0deg); } 100% { transform: rotate(-5deg); } } /* nav bar */ #psm #petsHeader { display: block; padding: 6px; } #petsHeader span { float: right; font-size: 12px; } #petsHeader span i { cursor: pointer; padding: 0px 4px; } .petnav:hover, .leftHover:hover~.petnav, .leftSubHover:hover~.petnav { margin-left: -30px; } .petnav a:hover { cursor: pointer; margin-left: -5px; } .petnav a:hover .sub { margin-left: -25px; } .leftHover { position: absolute; z-index: 102; height: 150px; width: 50px; margin-left: 3px; } .leftSubHover { position: absolute; z-index: 80; height: 150px; width: 25px; margin-left: -22px; } .petnav { position: absolute; width: 42px; z-index: 97; text-align: center; background-color: '+color+'; border-radius: 12px 0px 0px 12px; box-shadow: -1.5px 1.5px 5px #8882; -webkit-transition-property: margin-left; -webkit-transition-duration: .5s; transition-property: margin-left; transition-duration: .5s; } .petnav a { position: relative; display: block; height: 25px; font-size: 18px; color: #fff; background-color: '+color+'; border-radius: 12px 0px 0px 12px; z-index: 98; } .disabled { color: #fffa !important; cursor: default !important; } .disabled:hover { margin-left: 0px !important; } .petnav span { float: left; width: 30px; background-color: inherit; border-radius: 12px 0px 0px 12px; } .petnav i { padding: 3px; } .petnav .fa-hat-cowboy-side { font-size: 16.5px; padding-top: 4px; } .sub { position: absolute !important; width: 33px; z-index: -1 !important; -webkit-transition-property: margin-left; -webkit-transition-duration: .2s; transition-property: margin-left; transition-duration: .2s; } .sub i { padding: 5.5px; } /* stats slider */ .rightHover { position: absolute; z-index: 102; height: 150px; width: 50px; margin-left: 103px; } .hover { position: absolute; border-radius: 25px; box-shadow: 3px 2px 5px #8882; background-color: '+bgcolor+'; border: 3px solid '+color+'; padding: 20px; height: 104px; width: 5px; margin-left: 95px; overflow: hidden; z-index: 98; } .inner { height: 100%; width: 90%; float: right; display: inline; } .inner table { font: 7pt Verdana; vertical-align: top; white-space: nowrap; } .inner img { border: 2px #ccc dashed; margin: 0px 25px; } .inner i { font: 6.5pt Verdana; } .inner .petname { position: absolute; top: 5px; font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; text-align: left; color: '+subcolor+'; } .inner .petpet>a, .inner .petpetpet>div>a { color: '+textcolor+'; font-weight: normal; } .inner .petpetpet>div { margin-left: -30px; } #sidebar_menus .section td, .hover td { color: '+textcolor+'; } /* MISC. */ img.pa[src^="//images.neopets.com/nq2"] { z-index: 96 !important; } .h5-speaker.speaker-sm { display: none; }'
        document.body.appendChild(CSS);
    }

    // GATHERER FUNCTIONS
    function QuickRef() {
        psm_debug('QuickRef');
        // All data except exact stat numbers
        $('.contentModuleTable tbody').each(function(k,v) {
            if(k%2 === 0) { // even indexed elements are the relevant ones
                const names = $(v).find('th').first().text();
                const namesMatch = names.match(new RegExp(/(.+) with (.+) the (.+) and its (.+)|(.+) with (.+) the (.+)|(.+)/)); // allow for presence/absence of petpet/petpetpet
                //if (namesMatch) psm_debug(namesMatch);
                const petpet = [namesMatch[2] || namesMatch[6], namesMatch[3] || namesMatch[7], namesMatch[4] || null];
                const petname = namesMatch[1] || namesMatch[5] || namesMatch[8];
                if( !(petname in PETS) ) { // if pet isn't recorded, add it to shown and pets
                    DATA.shown.push(petname);
                    PETS[petname] = {isUncertain: false};
                }
                else if ( !(PETS[petname].species.length) ) { // add pets with only bd stats to shown
                    DATA.shown.push(petname);
                }
                const stats = PETS[petname];

                const $lines = $(v).find('.pet_stats td');
                const health = $lines.eq(5).text().match(new RegExp(/(\d+) \/ (\d+)/));
                const image = $(v).find('.pet_image').attr('style').split('/');
                //if (health) psm_debug(health);
                stats.owner             = USER;
                stats.id                = image[4] || 0;
                stats.expression        = image[5] || 1;
                stats.species           = $lines.eq(0).text();
                stats.color             = $lines.eq(1).text();
                stats.gender            = $lines.eq(2).text();
                stats.age               = $lines.eq(3).text();
                stats.level             = Number($lines.eq(4).text());
                stats.current_hp        = Number(health[1]);
                stats.max_hp            = Number(health[2]);
                stats.mood              = $lines.eq(6).text();
                stats.hunger            = $lines.eq(7).text();
                stats.intelligence      = $lines.eq(11).text().replace('E G','E<br>G');
                stats.petpet_name       = petpet[0];
                stats.petpet_species    = petpet[1];
                stats.petpet_image      = $lines.eq(12).find('img').eq(0).attr('src');
                stats.petpetpet_species = petpet[2];
                stats.petpetpet_image   = $lines.eq(12).find('img').eq(1).attr('src');
                stats.isUC              = $(v).find('.pet_notices:contains(converted)').length ? true : false;
                stats.neolodge          = get_checkout(v);
                setStrength($lines.eq(8).text(),petname);
                setDefence( $lines.eq(9).text(),petname);
                setMovement($lines.eq(10).text(),petname);
                //psm_debug(stats);

                PETS[petname] = stats;
            }
        });
    }
    function get_checkout(v) {
        const notice = $(v).find('.pet_notices:contains(Neolodge)').text() || false;
        if (!notice) return 0;
        const now = (new Date).getTime();
        if (notice.includes('currently checking ')) return now + 86400000; // add a day for buffer
        const dif = new RegExp(/in (\d+) days?, (\d+) hours? and (\d+) minutes?/g).exec(notice);
        return dif ? now + dif[1]*86400000 + dif[2]*3600000 + dif[3]*60000 + 86400000 : 0; // add a day for buffer
    }
    function Battledome1() {
        psm_debug('Battledome Pets');
        $('.petContainer').each(function(k,v) {
            const petname = $(v).attr('data-name');
            if (petname in PETS) {
                const stats = PETS[petname];
                const $v = $(v);

                const health = $v.find('.hpValue').text().match(new RegExp(/(\d+)\/(\d+)/));
                stats.current_hp    = Number(health[1]);
                stats.max_hp        = Number(health[2]);
                stats.strength      = Number($v.find('.atkValue').text());
                stats.defence       = Number($v.find('.defValue').text());
                stats.movement      = Number($v.find('.agiValue').text());
                stats.isUncertain   = false;

                PETS[petname] = stats;
            }
        });
    }
    function Battledome2() {
        psm_debug('Battledome Choose');
        $('.petInfoBox').each(function(k,v) {
            const petname = $(v).attr('data-name');
            if (petname in PETS) {
                const stats = PETS[petname];
                const $vals = $(v).find('.statValue');

                const health = $vals.eq(0).text().match(new RegExp(/(\d+)\/(\d+)/));
                stats.current_hp    = Number(health[1]);
                stats.max_hp        = Number(health[2]);
                stats.movement      = Number($vals.eq(1).text());
                stats.strength      = Number($vals.eq(2).text());
                stats.defence       = Number($vals.eq(3).text());
                stats.isUncertain   = false;

                PETS[petname] = stats;
            }
        });
    }
    function Training() {
        psm_debug('Training');
        $("table[width='500']>tbody>tr").each(function(k,v) {
            if(k%2 === 0) {
                // get name and retreive data (if any)
                const petname = $(v).children().first().text().split(" ")[0];
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
                const stats = PETS[petname];

                // get stats
                let dStats = $(v).next().children().first().text();
                dStats = dStats.match(new RegExp('Lvl : (.+)Str : (.+)Def : (.+)Mov : (.+)Hp {2}: (.+) / (.+)'));
                psm_debug(petname, dStats);
                if (dStats) {
                    stats.level         = Number(dStats[1]);
                    stats.strength      = Number(dStats[2]);
                    stats.defence       = Number(dStats[3]);
                    stats.movement      = Number(dStats[4]);
                    stats.current_hp    = Number(dStats[5]);
                    stats.max_hp        = Number(dStats[6]);
                    stats.isUncertain   = false;
                }
                PETS[petname] = stats;

                // get training timer
                let remaining = $(v).next().children().eq(1).find('b').text();
                if (remaining === 'Course Finished!') PETS[petname].training = 0;
                else {
                    remaining = remaining.match(new RegExp(/(\d+) hrs?, (\d+) minutes?, (\d+) seconds?/));
                    if (remaining) {
                        remaining = remaining[1]*3600000+remaining[2]*60000+remaining[3]*1000;
                        psm_debug(petname, 'time remaining', remaining);
                        PETS[petname].training = (new Date).getTime() + remaining;
                        PETS[petname].training_url = document.URL;
                    }
                    else if (!PETS[petname].training_url || PETS[petname].training_url === document.URL) {
                        // reset timer only when at previous school or no recorded school
                        psm_debug(petname, 'not training');
                        PETS[petname].training = -1;
                    }
                }
            }
        });
    }
    function EndTraining() {
        const blurb = $('p').text();
        const match = new RegExp(/ (.+) now has increased (.+)!!!(?:\n*.+up (\d))?/g).exec(blurb);
        if (match) {
            psm_debug('EndTraining');
            const petname = match[1];
            PETS[petname].training = -1;
            if(petname in PETS) {
                const n = Number(match[3]) || 1;
                psm_debug('matches:',petname,match[2],n);
                switch (match[2]) {
                    case 'Endurance':
                        PETS[petname].current_hp += n;
                        PETS[petname].max_hp += n;
                        break;
                    case 'Agility':
                        PETS[petname].movement += n;
                        break;
                    default: // defence, strength, level
                        PETS[petname][match[2].toLowerCase()] += n;
                }
            }
        }
    }
    function FaerieQuest() {
        const petname = $('.pet-name').text().slice(0, -2);
        if (petname.length) { // make sure on right page
            const faerie = $('.description_top').text().match(new RegExp(/for [^A-Z]*([A-Z][^ ]+) /))[1];
            psm_debug('FaerieQuest:', petname, faerie);

            if(petname in PETS) { // ignore pets not stored
                const stats = PETS[petname];
                PETS[petname] = questSwitch(faerie,stats);
            }
        }
    }
    function questSwitch(faerie,stats) {
        let blurb;
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
                blurb = $('.pet-name').parent().text().match(new RegExp(/gained 2 (\w+)s? .*and 2 (\w+)s?/));
                stats[blurb[1] === 'defense' ? 'defence' : blurb[1] === 'hit' ? 'max_hp' : blurb[1]] += 2;
                stats[blurb[2] === 'defense' ? 'defence' : blurb[2] === 'hit' ? 'max_hp' : blurb[2]] += 2;
                break;
            case 'Gray':
                // leaches off of elemental or fountain faerie. she's a poser.
                blurb = $('.pet-name').parent().text().match(new RegExp(/another faerie. (\w+) .aerie, come/));
                if (blurb != "Earth") questSwitch(blurb,stats);
                break;
        }
        return stats;
    }
    function Coincidence() {
        psm_debug('Coincidence');
        const blurb = $('.randomEvent > .copy').text();
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
            const match = new RegExp(/about ([^.]+).+their (\w+).+gone (\w+).+by (\d+)/g).exec(blurb);
            if (match) {
                psm_debug('matches:',match[1],match[2],match[3],match[4]);
                const stats = PETS[match[1]];
                const n = (match == 'up') ? match[4]*1 : match[4]*(-1);
                if (match[2] == 'hit') {
                    stats.current_hp += n;
                    stats.max_hp += n;
                }
                // else if (match[2] == 'intelligence') psm_debug('not recording this I guess.'); // uhh
                else if (match[2] == 'attack') stats.strength += n;
                else stats[match[2]] += n;
            }
        }
    }
    function Coltzan() {
        const blurb = $('div[align="center"]>b+p').eq(0).text();
        if (blurb) {
            psm_debug('Coltzan',blurb);
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
            const match = new RegExp(/^([^ ]+) (has gained (\d+)|feels|your).* (\w+)(\(|!)/g).exec(blurb);
            if (match) {
                psm_debug(match[1], match[3] || 1, match[4]); // petname, stat
                const petname = match[1];
                if (petname == "All")
                    for (let each_petname in PETS) if (PETS[each_petname].owner == USER)
                        PETS[each_petname].current_hp = PETS[each_petname].max_hp;
                else if (petname in PETS) {
                    switch (match[4]) {
                        case 'level':
                            PETS[petname].level +=match[3];
                            break;
                        case 'defence':
                            PETS[petname].defence +=match[3];
                            break;
                        case 'stronger':
                            PETS[petname].strength +=1;
                            break;
                        case 'faster':
                            PETS[petname].movement +=1;
                            break;
                        // int not currently tracked
                        // case 'intelligent':
                        //     PETS[petname].intelligence +=1;
                        //     break;
                    }
                }
            }
            else psm_debug('No change.');
        }
    }
    function KitchenQuest() {
        psm_debug('BETA Kitchen Quest');
        /**
         *  +1 hp:          PETNAME has gained a hit point!!!
         *  +1 mov:         PETNAME has gained a level!!! (?)
         *  +1 def:         PETNAME has become better at Defence!!!
         *  +1 str:         PETNAME has become better at Attack!!!
         *  +1 mov:         PETNAME has become better at Agility!!!
         */
        const blurb = $('p>b').eq(-1).text();
        psm_debug(blurb);
        const match = new RegExp(/([^ ]+) has .+ ([^ !]+)!/g).exec(blurb);
        if (match) {
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
                        psm_debug('unknown');
                }
                set_items(false,true,true);
            }
        }
    }
    function SecretLab() {
        /**
         *  ... and she changes into a Green Nimmo!!
         *  ... and she changes colour to White!!
         */
        psm_debug('Lab Ray');
        const petname = $('p').eq(0).find('b').text();
        psm_debug(petname);
        if(petname in PETS) { // ignore pets not stored
            const blurb = $('p').eq(2).text();
            const match = new RegExp(/and s?he ([^ ]+) ([^ ]+) a? ?([^ ]+[^ s])s? ?([^!]+)/g).exec(blurb);
            if (match) {
                const number_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15};
                const stats = PETS[petname];
                const n = Number(number_map[match[2]]) || Number(match[2]);
                psm_debug('matches:',match[1],n,match[3],match[4]);
                switch (match[1]) {
                    case "changes":
                        if (match[2]=="colour") {   // british color change
                            stats.color = match[4];
                        } else {                    // species change
                            stats.color = match[3];
                            stats.species = match[4];
                        }
                        break;
                    case "gains":                   // stat change
                        if (match[3]=='maximum') {
                            stats.current_hp += n;
                            stats.max_hp += n;
                        }
                        else stats[match[3]] += n;
                        break;
                    case "loses":                   // stat change
                        if (match[3]=='maximum') {
                            stats.current_hp -= n;
                            stats.max_hp -= n;
                        }
                        else stats[match[3]] -= n;
                        break;
                    case "goes":                    // level 1
                        stats.level = 1;
                        break;
                    default:
                        psm_debug('No change');   // or gender change
                }
                PETS[petname] = stats;
            }
            else psm_debug('no regex match');
        }
    }
    function PetpetLab() {
        psm_debug("Petpet Lab");
        const petname = $('b:contains(The Petpet Laboratory) ~ b').eq(1).text();
        if (petname in PETS) {
            const newname = $('div[align="center"]').find('b').eq(1).text();
            if (newname && !Number(newname)) { // can also be new level, which should be ignored
                psm_debug('new name:',newname);
                PETS[petname].petpet_name = newname;
                return;
            }
            const $div = $('b:contains(The Petpet Laboratory) ~ div').eq(1);
            const match = new RegExp(/(transformed|explosion|disappear)/g).exec($div.text());
            if (match) {
                switch (match[1]) {
                    case 'transformed':
                        PETS[petname].petpet_image = $div.find('img').attr('src');
                        PETS[petname].petpet_species = 'Science Experiment'; // idk lol, the image url isnt reliable
                        break;
                    case 'explosion':
                        PETS[petname].petpet_image = $div.find('img').attr('src');
                        PETS[petname].petpet_species = 'Pile of Soot';
                        break;
                    case 'disappear':
                        PETS[petname].petpet_name = null;
                        PETS[petname].petpet_image = null;
                        PETS[petname].petpet_species = null;
                        break;
                }
            }
        }
    }
    function Petpet() {
        const petname = $('.page-title__2020 > h1').text().split("'")[0];
        psm_debug("BETA Petpet Play",petname);
        if (petname && petname in PETS) {
            const blurb = $('.h5-dialogue > p').text();
            const match = new RegExp(/I love ([^,]+), my (\w+)(?:\s*, and its (\w+))?/g).exec(blurb);
            psm_debug(match)
            if (match) {
                PETS[petname].petpet_name = match[1];
                PETS[petname].petpet_species = match[2];
                PETS[petname].petpet_image = $('.h5-grid3 > img[src^="https://images.neopets.com/items/"]').eq(0).attr('src');
                PETS[petname].petpetpet_species = match[3];
                PETS[petname].petpetpet_image = $('.h5-grid3 > img[src^="https://images.neopets.com/items/"]').eq(1).attr('src');
            }
        }
    }
    function Sidebar() {
        // get name and retreive data (if any)
        const petname = $("a[href='/quickref.phtml']").first().text();
        if(petname in PETS) { // if pet isn't recorded, not worth starting here
            const stats = PETS[petname];

            // get stats
            const activePetStats = $("td[align='left']");
            const health = $(activePetStats).eq(1).text().match(new RegExp(/(\d+) \/ (\d+)/));
            stats.species       = $(activePetStats).eq(0).text();
            stats.mood          = $(activePetStats).eq(2).text();
            stats.hunger        = $(activePetStats).eq(3).text();
            stats.age           = $(activePetStats).eq(4).text();
            stats.level         = $(activePetStats).eq(5).text();
            stats.current_hp    = health[1];
            stats.max_hp        = health[2];
            //psm_debug(stats);

            PETS[petname] = stats;
        }
    }
    function Random() {
        /**
         *  == HP ==
         *  You realise all your Neopets are now at full health!    [all full health]
         *  PETNAME gets hit by a snowball .+ takes X damage!       [lose 3 hp]
         *
         *  == STATS ==
         *  PETNAME has suddenly gotten stronger                    [gain 1 str]
         *  PETNAME has suddenly gained a level                     [gain 1 level]
         *  PETNAME is knocked senseless and loses a level!         [lose 1 level]
         *  PETNAME sneezes so hard                                 [lose 1 hp]
         *  PETNAME loses a level and says                          [lose 1 level]
         *  PETNAME loses X STAT and says                           [lose x HP, strength, defence, speed]
         *
         *  == MOOD ==
         *  PETNAME doesn't look very happy anymore.                [become depressed]
         */
        const blurb = $('.randomEvent .copy').text().trim();
        if (blurb) {
            psm_debug('Random Event:',blurb);
            const match = new RegExp(/realise all|(\w+) (gets|has|is|sneezes|loses|doesn't) (\w+) (\w+)/g).exec(blurb);
            if (match) {
                const petname = match[2];
                if (petname && petname in PETS) {
                    psm_debug('matches:',petname,match[3],match[4],match[5]);
                    switch (match[3]) {
                        case 'gets':
                            PETS[petname].current_hp -= 3;
                            break;
                        case 'has':
                            if (match[5] == 'gotten')       PETS[petname].strength += 1;
                            else if (match[5] == 'gained')  PETS[petname].level += 1;
                            break;
                        case 'is':
                            if (match[5] == 'senseless')    PETS[petname].level -= 1;
                            break;
                        case 'loses':
                            if (!Number(match[4]))          PETS[petname].level -= 1;
                            else switch (match[5]) {
                                case 'HP':
                                    PETS[petname].current_hp -= 1;
                                    PETS[petname].max_hp -= 1;
                                    break;
                                case 'speed':
                                    PETS[petname].movement -= 1;
                                    break;
                                case 'strength':
                                    PETS[petname].strength -= 1;
                                    break;
                                case 'defence':
                                    PETS[petname].defence -= 1;
                            }
                            break;
                        case "doesn't":
                            PETS[petname].mood = 'depressed';
                            break;
                        default:
                            psm_debug('No change.');
                    }
                }
                else if (match[1]) {
                    psm_debug('Heal all pets.')
                    for (let each_petname in PETS) if (PETS[each_petname].owner == USER)
                        PETS[each_petname].current_hp = PETS[each_petname].max_hp;
                }

            }
        }
    }
    // function Decay() {
    //     psm_debug("I'll get to it eventually.");
    //     /**
    //      *  bloated ==> famished    144 ?
    //      *  famished => starving    22  ?
    //      *  starving => dying       2
    //      */
    // }
    function spinWheel(callback) {
        psm_debug('Waiting for wheel spin');
        // Waiting to finish spinning the wheel
        $('#wheelCanvas,#wheelButtonSpin').one('click', () => {
            psm_debug('Spinning!');
            let blurb;
            const wait = setInterval(function() {
                blurb = $('div#responseDisplaySuccess > p#itemName').text();
                if (blurb?.length) {
                    clearInterval(wait);
                    if (callback(blurb)) set_items(false,true,true);
                    else ('No change.');
                }
            }, 500);
        });
    }
    function Excitement(blurb) {
        psm_debug('BETA Wheel of Excitement:', blurb);
        /**
         * A Golden Light surrounds your pets... they are completely healed!                All pets full HP
         * ?                                                                                All pets lose half of current HP floor(curr/2)
         * The Lava Ghoul flies down from a nearby cloud and breathes FIRE over your pets!  All pets lose 2/3 of current HP floor(curr/3)
         * PETNAME starts to feel slightly feverish...                                      Active contracts Chickaroo
         */
        if (blurb.includes('completely')) {
            psm_debug('All pets fully healed');
            for (let petname in PETS) if (PETS[petname].owner == USER) PETS[petname].current_hp = PETS[petname].max_hp;
        }
        // else if (blurb.includes('?'))
        //     for (let petname in PETS) if (PETS[petname].owner == USER) PETS[petname].current_hp = Math.floor(Number(PETS[petname].current_hp)/2);
        else if (blurb.includes('FIRE')) {
            psm_debug('All pets lose 2/3 current HP');
            for (let petname in PETS) if (PETS[petname].owner == USER) PETS[petname].current_hp = Math.floor(Number(PETS[petname].current_hp)/3);
        }
        else if (blurb.includes('feverish')) {
            psm_debug(DATA.active,'contracted Chickaroo');
            PETS[DATA.active].expression = '4';
        }
        else return false;
        return true;
    }
    function Extravagance(blurb) {
        psm_debug('BETA Wheel of Extravagance:', blurb);
        /**
         * ?                                                                    Active gains 10 of one of H/S/D/M/I, or +10% if stat is very low
         * I'm not freakin testing this, send me a line with what the reward message is if you get this tho lol
         */
        return false;
    }
    function Knowledge(blurb) {
        psm_debug('BETA Wheel of Knowledge:', blurb);
        /**
         * ?                                                                    Active gains or loses 1 int
         * ?                                                                    Active gains 1 int
         * Your Neopet has been healed!!!                                       Active is healed to full health
         * You win a free spin.  Commendably done!                              Need to reset click handler
         */
        if (blurb.includes('free spin')) {
            spinWheel(Knowledge);
        }
        else if (blurb.includes('healed')) {
            psm_debug(DATA.active,'is healed to full HP.');
            PETS[DATA.active].current_hp = PETS[DATA.active].max_hp;
        }
        else return false;
        return true;
    }
    function Misfortune(blurb) {
        psm_debug('BETA Wheel of Misfortune:', blurb);
        /**
         * Oh no!  Your pet caught Bubbles from the wheel!                      Active contracts Bubbles
         */
        if (blurb.includes('Bubbles')) {
            psm_debug(DATA.active,'contracted Bubbles');
            PETS[DATA.active].expression = '4';
        }
        return false;
    }
    function Mediocrity(blurb) {
        psm_debug('BETA Wheel of Mediocrity:', blurb);
        /**
         * Fireballs rain down from above and singe your Neopets!               All pets lose half of current HP floor(curr/2) 
         * A Pterodactyl swoops down and bites PETNAME!                         Active loses half of current HP floor(curr/2) 
         */
        if (blurb.includes('Fireballs')) {
            psm_debug('All pets lose half of current HP.');
            for (let petname in PETS) if (PETS[petname].owner == USER) PETS[petname].current_hp = Math.floor(Number(PETS[petname].current_hp)/2);
        }
        else if (blurb.includes('Pterodactyl')) {
            psm_debug(DATA.active,'loses half of current HP.');
            PETS[DATA.active].current_hp = Math.floor(Number(PETS[DATA.active].current_hp)/2);
        }
        else return false;
        return true;
    }
    function Monotony(blurb) {
        psm_debug('BETA Wheel of Monotony:', blurb);
        /**
         * Your Neopet loses half their hit points!                            Active loses half of current HP floor(curr/2)
         * You've earned a visit to the Lair of the Beast!                     Sometimes active reduced to 1 HP?
         */
        if (blurb.includes('half')) {
            psm_debug(DATA.active,'loses half of current HP.');
            PETS[DATA.active].current_hp = Math.floor(Number(PETS[DATA.active].current_hp)/2);
        }
        else return false;
        return true;
    }
    function HealingSprings() {
        /**
         * All of your Neopets gain seven hit points.  I hope that helps! :)
         * All your Neopets have their health completely restored
         * PETNAME regains their hit points and is not hungry any more
         * PETNAME is fully healed
         */
        const blurb = $('.faerie-battle + p + p').eq(0).text();
        if (blurb) {
            psm_debug('BETA Healing Springs',blurb);
            const match = blurb.match(new RegExp(/^(All|([^ ]+)) .*( hungry| heal| gain)([^ ]+| (\w+))/)); // ^(All|([^ ]+)) .*(fully|gain)s? (\w+)
            if (match) {
                const number_map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15};
                const n = number_map[match[5]];
                if (match[1]=="All") {
                    for (let petname in PETS) if (PETS[petname].owner == USER) healPet(petname,match[3],n);
                }
                else {
                    healPet(DATA.active,match[3],n); // pet name is now capitalized at HS
                }
            }
            else psm_debug('No change.');
        }
    }
    function healPet(petname,match,n) {
        if (petname in PETS) {
            if (match==" gain") {
                psm_debug(petname,'gain',n);
                PETS[petname].current_hp = Number(PETS[petname].current_hp) + Number(n);
            }
            else {
                psm_debug(petname,'fully healed')
                PETS[petname].current_hp = PETS[petname].max_hp;
                PETS[DATA.active].expression = '1';
            }
            if (match==" hungry") {
                psm_debug(petname,'bloated');
                PETS[petname].hunger = 'bloated';
            }
        }
    }
    function Battle() {
        psm_debug('Battle');
        const end = setInterval(function() {
            if ($('#playground>.end_game').length) {
                clearInterval(end);
                battle_end();
            }
        }, 500);
    }
    function battle_end(){
        const petname = $('#p1name').text();
        if (petname && petname in PETS) {
            PETS[petname].current_hp = Number($('#p1hp').text());
            set_items(false,true,false);
        }
    }
    function Snowager() {
        const blurb = $('#snowager_container').text();
        psm_debug('BETA Snowager', blurb);
        if (blurb.includes('an icy blast')) {
            PETS[DATA.active].current_hp = 1;
        }
        else if (blurb.includes('a MASSIVE icy blast')) {
            for (let petname in PETS) if (PETS[petname].owner == USER) PETS[petname].current_hp = 0;
        }
        else return;
        set_items(false,true,true);
    }
    function Geraptiku() {
        psm_debug('BETA Geraptiku');
        if ($('.tomb-result').css('background-image').includes('trap'))
            PETS[DATA.active].current_hp = Math.floor(Number(PETS[DATA.active].current_hp)/2);
    }
    function Soup() {
        psm_debug('BETA Soup Kitchen')
        $('#bxlist li:not(.bx-clone)').each( function() {
            PETS[$(this).find('strong').eq(0).text()].hunger = $(this).find('strong').eq(1).text();
        });
    }
    function Inventory() {
        psm_debug('BETA Inventory');
        $('body').on('click', 'div.invitem-submit', () => {
            let result;
            const loading = setInterval(function() {
                result = $('#invResult > .popup-body__2020 > p, #invResult > .popup-body__2020 > pr').eq(-1).text();
                psm_debug(result)
                if (result && result !== 'Loading...') {
                    clearInterval(loading);
                    useItem(result);
                }
            }, 500);
        });
    }
    function useItem(blurb) {
        psm_debug('BETA Item');
        /**
         *  PETNAME drinks the potion and gains 12 hit point(s), but is still not fully recovered.
         *  PETNAME drinks the Super Strength Healing Potion and is restored to full hit points!
         *  PETNAME was bloated, and now he is still bloated!
         *  PETNAME was not hungry, and now he is full up!
         *  PETNAME's body starts to feel tingly as they turn into a COLOR SPECIES!
         */
        const match = new RegExp(/^([^ ']+)(?:'s)? ([^ ]+) .+ (?:is still |is |hit |gains |into a (.+) )(.+)(?:!| hit)/g).exec(blurb);
        if (match) {
            psm_debug('matches:',match[1],match[2],match[3],match[4])
            const petname = match[1];
            if (petname in PETS) {
                switch (match[2]) {
                    case 'was':     // food
                        PETS[petname].hunger = match[4];
                        break;
                    case 'drinks':  // health potion
                        if (match[4]) PETS[petname].current_hp += Number(match[4]);
                        else if (match[4] == 'points') PETS[petname].current_hp = PETS[petname].max_hp;
                        break;
                    case 'body':    // morphing potion
                        PETS[petname].color = match[3];
                        PETS[petname].species = match[4];
                }
                set_items(false,true,false);
            }
        }
    }
    function Neolodge() {
        psm_debug('Booking at Neolodge');
        if (!$('center:contains("You can not afford")').length) {
            $('center>img[src^="//pets.neopets.com/"]').each( (k,v) => {
                const petname = $(v).attr('src').split('/')[4];
                if (petname in PETS) {
                    const nights = $(v).parent().prev().prev().find('td[align="right"]').eq(4).text();
                    psm_debug(petname,nights,'nights');
                    if (nights?.length) PETS[petname].neolodge = (new Date).getTime() + nights*86400000;
                }
            });
        }
    }
    function GraveDanger() {
        psm_debug('Grave Danger');
        const petname = Object.keys(PETS).find(petname => PETS[petname].petpet_name === $('span.petpetName').text());
        if (petname) {
            psm_debug('petname',petname)
            let remaining;
            const loading = setInterval(function() {
                remaining = $('#gdRemaining').text();
                if (!remaining) {
                    psm_debug('Complete')
                    clearInterval(loading);

                    // enforce reminder until reward has been collected
                    if ($('.section.brought').length) danger_end(petname,0);

                    // clear when reward collection button is clicked
                    $('#container__2020 .gdForm>button').click(() => {
                        danger_end(petname,-1);
                    });
                } else if (remaining !== '...') {
                    psm_debug('Ongoing',remaining)
                    clearInterval(loading);
                    const match = new RegExp(/(\d+) hours?, (\d+) minutes?, (\d+) seconds?/g).exec(remaining);
                    if (match) {
                        remaining = match[1]*3600000+match[2]*60000+match[3]*1000;
                        danger_end(petname,(new Date).getTime() + remaining)
                    }
                }
            }, 500);
        }
    }
    function danger_end(petname,end){
        PETS[petname].petpet_danger = end;
        set_items(false,true,true);
    }


    // MISC FUNCTIONS
    function psm_debug(...args) {
        if (DATA.debug) {
            try {
                throw new Error();
            } catch (error) {
                const trace = error.stack.split('\n').find(item => /^\s*at (?!psm_debug|buildModule|set_items|\()/.test(item));
                console.debug('[PSM]', ...args, '\n'+trace);
            }
        }
    }
    function set_items(data=true,pets=true,build=true) {
        if (data) {
            // psm_debug('Storing DATA');
            localStorage.setItem("NEOPET_SIDEBAR_USERDATA_"+USER, JSON.stringify(DATA));
        }
        if (pets) {
            // psm_debug('Storing PETS');
            localStorage.setItem("NEOPET_SIDEBAR_PETDATA", JSON.stringify(PETS));
        }
        if (build) buildModule();
    }
    function fill_neolodge() {
        // first pet in dropdown needing lodge, book all, cockroach towers, 28 nights
        $('select[name="hotel_rate"]').val('5');
        $('select[name="nights"] option:last-child').prop('selected', true);
        $('#book_all').prop('checked', true);
        const now = (new Date).getTime();
        $('select[name="pet_name"] option:nth-child(n+2)').each(function() {
            const petname = $(this).text().slice(0, -1);
            if (petname in PETS && PETS[petname].neolodge<now) {
                $(this).prop('selected', true);
                return;
            }
        });
    }
    function array_move(arr, old_index, new_index) {
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    }
    function color_inc(value) {
        const result = value*1+DATA.i
        return result < 0 ? 0 : result > 255 ? 255 : result;
    }
    function clean_pets() {
        const pets = Object.keys(PETS);
        const all = DATA.shown.concat(DATA.hidden);
        let len = all.length;
        for (let petname in PETS) {
            if (!all.includes(petname)) {
                len += 1;
                DATA.shown.push(petname);
            }
        }
        if (len != pets.length) {
            for(let i=0; i<DATA.shown.length; i++)
                if (!pets.includes(DATA.shown[i])) {
                    DATA.shown.splice(i,1);
                    i -= 1;
                }
            for(let i=0; i<DATA.hidden.length; i++)
                if (!pets.includes(DATA.hidden[i])) {
                    DATA.hidden.splice(i,1);
                    i -= 1;
                }
        }
        set_items(true,false,false);
    }
    function clear_pets() {
        localStorage.removeItem("NEOPET_SIDEBAR_PETDATA");
        PETS = {};
        DATA.shown = [];
        DATA.hidden = [];
        DATA.active = '';
    }

    // STAT FUNCTIONS
    function getHP(current, max) {
        if (DATA.hp_mode==0) return max;
        if (DATA.hp_mode==1) return current+' / '+max;
        const p = current/max;
        const color = p<0.2 ? 'red' : p<0.4 ? '#ff7b00' : p<0.6 ? '#ffbb00' : p<0.8 ? 'blue' : 'green';
        return '<font color="'+color+'">'+current+' / '+max+'</font>';
    }
    function getBDStat(n,arr) {
        if (DATA.bd_mode==0 || (arr!=STR && arr!=DEF && arr!=MOV)) return n; // 'num' <default>
        if (n<21) return DATA.bd_mode==1 ? arr[n]+' ('+n+')' : arr[n];       // 'str (num)' OR 'str'
        const word = n<40 ? 'GREAT' : n<60 ? 'EXCELLENT' : n<80 ? 'AWESOME' : n<100 ? 'AMAZING' : n<150 ? 'LEGENDARY' : 'ULTIMATE';
        return DATA.bd_mode<3 ? word+' ('+n+')' : word;  // 'str (num)'  /  'str', 'str (num)' <neo default> OR 'str'
    }
    function setStrength(word, petname) {
        let n;
        if (STR.indexOf(word) < 0) {
            n = word.match(/\d+/g)
            if (n)
                if (U_STR.indexOf(word) < 0) {
                    n = Number(n[0]);
                    const current = PETS[petname].strength;
                    n = (current-n)>0 && (current-n)<4 ? current : n;
                    PETS[petname].isUncertain = true;
                }
            else n = -1;
        }
        else n = STR.indexOf(word);
        PETS[petname].strength = Number(n);
        //psm_debug("strength: ",word,n);
    }
    function setDefence(word, petname) {
        let n;
        if (DEF.indexOf(word) < 0) {
            n = word.match(/\d+/g)
            if (n)
                if (U_DEF.indexOf(word) < 0) {
                    n = Number(n[0]);
                    const current = PETS[petname].defence;
                    n = (current-n)>0 && (current-n)<4 ? current : n;
                    PETS[petname].isUncertain = true;
                }
            else n = -1;
        }
        else n = DEF.indexOf(word);
        PETS[petname].defence = Number(n);
        //psm_debug("defence: ",word,n);
    }
    function setMovement(word, petname) {
        let n = word.match(/\d+/g);
        n = ((MOV.indexOf(word) < 0) ? (n ? Number(n[0]) : -1) : MOV.indexOf(word));

        if (word == "average") {
            const current = PETS[petname].movement;
            n = (current-n)>0 && (current-n)<3 ? current : n;
            PETS[petname].isUncertain = true;
        }
        PETS[petname].movement = n;
        //psm_debug("movement: ",word,n);
    }
    /*function int_toInt(word) {
        let n = word.match(/\d+/g);
        n = n ? n[0] : word;
        psm_debug("intelligence: ",word,n);
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
        const color = getColor();
        const rgbs = color.match(new RegExp(/rgb\((\d+), ?(\d+), ?(\d+)\)/));
        return rgbs ? 'rgb('+color_inc(rgbs[1])+', '+color_inc(rgbs[2])+', '+color_inc(rgbs[3])+')' : THEME;
    }
    function getBgColor(set) {
        if (set) DATA.bgcolor = set;
        return String(DATA.bgcolor) || BG;
    }
    function getTextColor(bg) {
        // automatically use white or black text depending on background luminance
        const rgb = bg.match(new RegExp(/rgba?\((\d+), ?(\d+), ?(\d+),? ?([\d.]+)?/));
        if (!rgb || (rgb[4] && rgb[4]<0.3)) return '#000';
        for (let i=1; i<4; i++) {
            rgb[i] = rgb[i]/255.0;
            rgb[i] = rgb[i] <= 0.03928 ? rgb[i]/12.92 : Math.pow(((rgb[i]+0.055)/1.055), 2.4);
        }
        const L = 0.2126*rgb[1] + 0.7152*rgb[2] + 0.0722*rgb[3];
        return L > 0.179 ? '#000' : '#fff';
    }
    function changeColor(tinycolor) {
        // Color changes are manual to avoid jarring repeated module rebuilding
        let color;
        if (tinycolor) {
            $('.menu_header h1, #info_nav button, .menu_close').css('color','#fff');
            color = getColor(tinycolor.toRgbString());
        }
        else { // if none selected, return to theme color
            DATA.color = '';
            color = getColor();
            $('.menu_header h1').css('color',$('.sidebarHeader a').css('color'));
            $('#info_nav button, .menu_close').css('color',$('.sidebarHeader').css('color'));
            $("#colorpicker").spectrum('set',color); // update the picker too
        }
        if (!DATA.subcolor) changeSubcolor(); // maintain relative color
        $('#colorpicker_text').val(color);
        $('#color_settings div, #increment i').css('color',color);
        $('#sidebar_menus > div, .picker_popup, .hover').css('border-color',color);
        $('.menu_header, #info_nav span, .petnav, .petnav a').css('background-color',color);
        set_items(true,false,false);
    }
    function changeSubcolor(tinycolor) {
        let color;
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
        set_items(true,false,false);
    }
    function changeBgColor(tinycolor) {
        let color;
        if (tinycolor)
            color = getBgColor(tinycolor.toRgbString());
        else { // if none selected, return to theme color
            DATA.bgcolor = '';
            color = getBgColor();
            $("#bgcolorpicker").spectrum('set',color); // update the picker too
        }
        $('#bgcolorpicker_text').val(color);
        $('#sidebar_menus > div, .hover, .picker_popup').css('background-color',color);
        $('#sidebar_menus .section td, .hover td').css('color',getTextColor(color)); // text color
        set_items(true,false,false);
    }

    function settings_functionality() {
        if (!$.isFunction($.fn.spectrum)) {
            psm_debug('...')
            setTimeout(settings_functionality, 50);
            return;
        }

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
        $('#colorpicker_text').blur(function() {
            const $picker = $('#colorpicker');
            $picker.spectrum('set', $(this).val()); // doesn't fire event due to infinite loops
            changeColor($picker.spectrum('get'));   // use the picker's' color validation
        });
        $('#subcolorpicker_text').blur(function() {
            const $picker = $('#subcolorpicker');
            $picker.spectrum('set', $(this).val());
            changeSubcolor($picker.spectrum('get'));
        });
        $('#bgcolorpicker_text').blur(function() {
            const $picker = $('#bgcolorpicker');
            $picker.spectrum('set', $(this).val());
            changeBgColor($picker.spectrum('get'));
        });
        $('#increment .fa-caret-up').click(function()   { DATA.i += 5; changeSubcolor(); });
        $('#increment .fa-caret-down').click(function() { DATA.i -= 5; changeSubcolor(); });


        // PETS DISPLAYED MANAGEMENT
        const removePet = (petname) => {
            $('#removed_pets').append('<option value="'+petname+'">'+petname+'</option>');
            $('#removed_pets_container').show();
        }
        const unremovePet = (petname) => {
            $('#removed_pets > option[value="'+petname+'"]').remove();
            if (!$('#removed_pets > option').length) $('#removed_pets_container').hide();
        }
        $MODULE.on('click', '.remove_button i', function() {
            if ($('.leftHover').length > 1) {
                const petname = $(this).attr('petname');
                DATA.hidden.push(petname);
                DATA.shown.splice( DATA.shown.indexOf(petname), 1);
                removePet(petname);
                set_items(true,false,true);
                $('.remove_button').show();
            }
        });
        $('#addback_button i').click(function() {
            const petname = $('#removed_pets').val();
            DATA.shown.push(petname);
            DATA.hidden.splice( DATA.hidden.indexOf(petname), 1);
            set_items(true,false,true);
            unremovePet(petname);
            $('.remove_button').show();
        });
        $('#delete_button i').click(function() {
            const petname = $('#removed_pets').val();
            DATA.hidden.splice( DATA.hidden.indexOf(petname), 1);
            delete PETS[petname];
            set_items();
            unremovePet(petname);
            $('.remove_button').show();
        });


        // SETTINGS
        $('#toggle_settings_bodies input[type="checkbox"]').change(function(e) {
            DATA[$(this).attr('name')] = $(this).prop('checked');
            const name = $(e.target).attr('name');
            if (!['betaBG','debug'].includes(name)) {
                buildModule();
                $('.remove_button').show();
            } else if (name === 'betaBG') {
                if ($(e.target).prop('checked')) $('body').addClass('betaBG');
                else $('body').removeClass('betaBG');
            }
            set_items(true,false,false);
        });
        $('#hp_mode,#bd_mode').change(function() {
            const id = $(this).attr('id');
            const val = $(this).val();
            DATA[id] = val;
            set_items(true,false,true);
            $('.remove_button').show();
        });

        // RESETS
        $('#clear_button').click(function() {
            clear_pets();
            set_items(true,true,true);
        });


        $('#settings_menu').toggle();
        $('.remove_button').toggle();
        $('#info_menu').hide();
    }

    function main_functionality() {
        // BETA HANDLING
        const styleResize = () => { // reposition module and recalculate container min-height based on window size

            // Module margin-left
            $CONTAINER.css('margin-left', $('#container__2020').width()/-2);

            // Container min-height must be set in stylesheet because element attribute is overridden natively
            const winHeight = window.innerHeight - Math.round($('#footer__2020').outerHeight(false));
            const modHeight = Math.round($CONTAINER.height()) + 175;
            const newHeight = Math.max(winHeight, modHeight);
            if (CONTAINER_CSS) {
                CONTAINER_CSS.innerHTML = `#container__2020 { min-height: ${newHeight}px !important; }`;
            } else {
                CONTAINER_CSS = document.createElement("style");
                CONTAINER_CSS.innerHTML = `#container__2020 { min-height: ${newHeight}px !important; }`;
                document.body.appendChild(CONTAINER_CSS);
            }
        }
        const styleScroll = () => { // reposition module based on container size size and scroll position
            const cHeight = $('#container__2020').height();
            const mHeight = $CONTAINER.height();
            const maxTop = cHeight - mHeight - 26;
            const top = $(window).scrollTop() + 70;
            if (maxTop > top) {
                $CONTAINER.css('position', 'fixed');
                $CONTAINER.css('top', '70px');
            } else {
                $CONTAINER.css('position', 'absolute');
                $CONTAINER.css('top', Math.min(top, maxTop)+'px');
            }
        }
        if (IS_BETA) { // listeners
            $(document).ready(() => {
                styleResize();
                styleScroll();
            });
            $(window).resize(styleResize);
            $(window).scroll(styleScroll);
        }


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
            set_items(true,false,true);
            if (IS_BETA) {
                styleResize();
                styleScroll();
            }
            if ($('#settings_menu').is(":visible")) $('.remove_button').show();
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
            $('#info_nav button.active-section').removeClass('active-section');
            $(this).addClass('active-section');
            $('#info_'+$(this).attr('name')).show();
        });


        // PET NAV
        $MODULE.on({ // here rather than in css because hover can't be changed in 'move'
            mouseenter: function() { $(this).css("background-color",getSubcolor()); },
            mouseleave: function() { $(this).css("background-color",getColor()); }
        }, '.petnav a:not(.disabled)');


        // HOVER SLIDERS
        $MODULE.on({ // hovering over right hover div exposes stats menu
            mouseenter: function(e) {
                // psm_debug('ENTER rightHover | stats >',$(e.relatedTarget).closest('.stats').length,$(e.relatedTarget))
                if (!DATA.interactableSlider || !$(e.relatedTarget).closest('.stats').length) {
                    const $stats = $('#stats_'+$(this).attr('petname')).stop(true);
                    const auto = $stats.css('width', 'auto').width();
                    const ml = (DATA.showPetpet && ($(this).parent().find('.petpet').length)) ? '98px' : '115px';
                    $stats.width(5).animate({width: auto, paddingRight: '50px', marginLeft: ml}, 800);
                }
            },
            mouseleave: function(e) {
                // psm_debug('LEAVE rightHover | stats >',$(e.relatedTarget).closest('.stats').length,$(e.relatedTarget))
                if (!DATA.interactableSlider || !$(e.relatedTarget).closest('.stats').length)
                    $('#stats_'+$(this).attr('petname')).stop(true).animate({width: '5px', paddingRight: '20px', marginLeft: '98px'}, 500);
            }
        }, '.rightHover');
        if (DATA.interactableSlider) { // if interactable, don't hide menu until mouse leaves it
            $MODULE.on({
                mouseleave: function(e) {
                    // psm_debug('LEAVE stats | rightHover >',$(e.relatedTarget).closest('.rightHover').length,$(e.relatedTarget))
                    if (!$(e.relatedTarget).closest('.rightHover').length)
                        $('#stats_'+$(this).attr('petname')).stop(true).animate({width: '5px', paddingRight: '20px', marginLeft: '98px'}, 500);
                }
            }, '.stats');
        }
        $MODULE.on('click', '.move', function() { // arrow buttons
            if (!$(this).hasClass('disabled')) {
                const i = DATA.shown.indexOf($(this).attr('petname'));
                array_move(DATA.shown,i,i+Number($(this).attr('dir')));
                set_items(true,false,true);
                if ($('#settings_menu').is(":visible")) $('.remove_button').show();
            }
        });
    }

    // LOAD RESOURCES
    function load_jQuery() {
        psm_debug("loading jQuery");
        const jq = document.createElement('script');
        jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js";
        document.getElementsByTagName('head')[0].appendChild(jq);
        setTimeout(main, 50);
    }
    function load_spectrum() {
        psm_debug("loading spectrum");
        SPECTRUM = true;
        const jq = document.createElement('script');
        jq.src = "https://bgrins.github.io/spectrum/spectrum.js";
        document.getElementsByTagName('head')[0].appendChild(jq);
        setTimeout(settings_functionality, 50);
    }

})();