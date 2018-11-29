// ==UserScript==
// @name           Neopets - Pets Sidebar Module
// @namespace      https://github.com/friendly-trenchcoat
// @version        1.0
// @description    Displays more info for active pet, plus dropdown to show info for other pets.
// @author         friendly-trenchcoat
// @include        http://www.neopets.com/*
// @grant          GM_getValue
// @grant          GM_setValue
// @require        http://code.jquery.com/jquery-latest.min.js
// ==/UserScript==
/*jshint multistr: true */

/*
TODOS:
Make stats number only.
On left side, have smaller nav popout
    x main nav
    x sub nav
    x hover transitions
    x disable buttons
At top of module, add three buttons:
    - help/info: toggle div with instructions and bug report link
    - settings: toggle div with settings
    - collapse: toggle inactive pets
        > maybe steal that other collapser arrow thing, or maybe spin animate this one
Arrows:
    x order buttons literally change order of PETS list
    x if (stickyActive) just disable ability to move there
    x Whenever order is changed, run addElements()
Animated image:
    - pull in logic from that other script

Update data at pages:
 Quick Ref (all pets; all info)
 Petpage (that pet; all info)
 Training (all present pets; stats)
 Faerie Quest (active pet; stats)
 Coincidence: "It looks like their <stat> <have/has> gone <up/down> by <amount>" (active pet, stats)
 Lab: (that pet; species, color, gender, stats)
  "and [s]he <gains/loses> <amount> <stat>[ points]<!/ :(>"
  "and [s]he changes gender"
  "and [s]he changes color to <color>!"
  "and [s]he changes into a <color> <species>!"
 Petpet Lab: (that petpet)
 Anywhere: (active pet; stats)
  "<name> loses <amount> <stat> and says" lose 1 or 2 of given stat
  "<name> has suddenly gotten stronger"   gain 1 strength point
 Auto (all pets, age)
*/

/**
 * STATS: [0 timestamp, 1 species, 2 color, 3 mood, 4 hunger, 5 age, 6 level, 7 health, 8 strength, 9 defence, 10 movement, 11 intelligence, 12 petpet name, 13 petpet species, 14 petpet image, 15 pet image, 16 is UC]
 * 
 * SETTINGS: [0 color str, 1 subcolor str, 2 bgcolor str, 3 nav bool, 4 stats bool, 5 animation bool, 6 stickyActive bool, 7 petpet bool, 8 fullHP bool, 9 BDStats int]
 *  BDStats options: 0 num only, 1 'str (num)' on all, 2 neo default, 3 str only
 * 
 * PETS: {'show':[names], 'hide':[names]}
 */

var PETS = JSON.parse(localStorage.getItem("PETS")) || [];
var UNCERTAIN = JSON.parse(localStorage.getItem("UNCERTAIN")) || true;
var STATS = [];
var SETTINGS = [null,null,null,true,true,false,false,true,true,1];
var TIMESTAMP = new Date().getTime();
var COLOR = SETTINGS[0] || $('.sidebarHeader').css('background-color');
var SUBCOLOR = getSubcolor(10);
var BGCOLOR = SETTINGS[2] || '#fffd';
var FLASH = ($('.sidebar').length && document.body.innerHTML.search('swf') !== -1);
console.log('flash enabled: ',FLASH);
// TODO: var anim = '<embed type=\"application/x-shockwave-flash\" src=\"http://images.neopets.com/customise/customNeopetViewer_v35.swf\" width=\"150\" height=\"150\" style=\"undefined\" id=\"CustomNeopetView\" name=\"CustomNeopetView\" bgcolor=\"white\" quality=\"high\" scale=\"showall\" menu=\"false\" allowscriptaccess=\"always\" swliveconnect=\"true\" wmode=\"opaque\" flashvars=\"webServer=http%3A%2F%2Fwww.neopets.com&amp;imageServer=http%3A%2F%2Fimages.neopets.com&amp;gatewayURL=http%3A%2F%2Fwww.neopets.com%2Famfphp%2Fgateway.php&amp;pet_name='+petname+'&amp;lang=en&amp;pet_slot=\">';

// MAIN
function main() {
    // update STATS data
    if (document.URL.indexOf("quickref") != -1) QuickRef();
    else if (document.URL.indexOf("status") != -1 && ( document.URL.indexOf("training") != -1 || document.URL.indexOf("academy") != -1 ) ) Training();
    //else if (document.URL.indexOf("process_training") != -1) EndTraining();
    else if (document.URL.indexOf("quests") != -1) FaerieQuest();
    else if (document.URL.indexOf("springs") != -1) HealingSprings();
    else if (document.URL.indexOf("coincidence") != -1) Coincidence();
    else if (document.URL.indexOf("process_lab2") != -1) SecretLab();
    else if (document.URL.indexOf("petpetlab") != -1) PetpetLab();
    else if ($(".sidebar")[0]) Sidebar();

    // actually add stuff now
    if ($(".sidebar")[0]) addElements();

    // store final list of pets
    localStorage.setItem("PETS", JSON.stringify(PETS));
}

// BUILDER FUNCTIONS
function addElements(){
    // clear module
    var petModule = $('.sidebarModule:first-child tbody');
    var activePetName = petModule.children().eq(0).find('b').text();
    petModule.html( // replace contents with only top bar
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
    if (SETTINGS[6]) array_move(PETS.show,PETS.show.indexOf(activePetName),0); // stickyActive: put active pet at the top. TODO: put this in settings block
    var petname;
    for (var i=0; i<PETS.show.length; i++) {
        petname = PETS.show[i];
        STATS = JSON.parse(localStorage.getItem(petname));
        var inactive = activePetName==petname ? '' : 'in';

        // for some reason children must be added seperately
        petModule.append('<tr id="'+inactive+'active_'+petname+'" ></tr> style="position: relative;"');
        $('#'+inactive+'active_'+petname).append(
            '<div class="leftHover" petname="'+petname+'"></div> \
            <div class="leftSubHover" petname="'+petname+'"></div> \
            <div class="rightHover" petname="'+petname+'"></div> \
            '+createNavHTML(petname)+' \
            '+createStatsHTML(petname)+' \
            <a href="/quickref.phtml" style="position: relative; z-index: 99;"><img src="'+STATS[15]+'" width="150" height="150" border="0"></a>');
        $('#nav_'+petname).find('.lookup').append(
            '<a class="sub" href="http://www.neopets.com/neopet_desc.phtml?edit_petname='+petname+'"><span><i class="fas fa-pencil-alt fa-xs"></i></span></a>');
        $('#nav_'+petname).find('.petpage').append(
            '<a class="sub" href="http://www.neopets.com/editpage.phtml?pet_name='+petname+'"><span><i class="fas fa-pencil-alt fa-xs"></i></span></a>');
        
        // disable buttons
        if (i==0)                    $('#nav_'+petname).find('.move').eq(0).addClass('disabled');    // move up
        if (i==(PETS.show.length-1)) $('#nav_'+petname).find('.move').eq(1).addClass('disabled');    // move down
        if (STATS[16])               $('#nav_'+petname).find('a').eq(2).addClass('disabled');        // customize
    }
    $('#nav_'+activePetName).find('a').eq(1).addClass('disabled');                                  // make active
    if (SETTINGS[6]) $('#nav_'+activePetName).find('.move').addClass('disabled');                   // stickyActive: move
    

    // functionality
    $('.rightHover').hover(function(){ // hovering over right hover div exposes stats menu
            var pixels = (($(this).parent().find('.petpet').length) ? ['500px','95px'] : ['325px','115px']); // smaller when no petpet
            $('#stats_'+$(this).attr('petname')).stop(true).animate({width: pixels[0], marginLeft: pixels[1]}, 800);
        }, function(){
            $('#stats_'+$(this).attr('petname')).stop(true).animate({width: '5px', marginLeft: '95px'}, 500);
    });
    $('.move').click(function(){ // arrow buttons
        if (!$(this).hasClass('disabled')) {
            var i = PETS.show.indexOf($(this).attr('petname'));
            array_move(PETS.show,i,i+Number($(this).attr('dir')));
            addElements();
            localStorage.setItem("PETS", JSON.stringify(PETS));
        }
    }); 

    // menus
    buildMenus();

    // add CSS
    document.body.appendChild(CreateCSS());
}
// [0 timestamp, 1 species, 2 color, 3 mood, 4 hunger, 5 age, 6 level, 7 health, 8 strength, 9 defence, 10 movement, 11 intelligence, 12 petpet name, 13 petpet species, 14 petpet image, 15 pet image, 16 is UC]
function createStatsHTML(petname) {
    if (!SETTINGS[4]) return '';    // if stats=false return empty
    var petpetTD = '', petpetStyle='';
    if (SETTINGS[7] && STATS[14]) { // if showPetpet=true and there is a petpet
        petpetTD =
            '<td align="center" class="petpet"> \
                <b>'+STATS[12]+'</b> the '+STATS[13]+'<br><br> \
                <img src="'+STATS[14]+'" width="80" height="80"><br><br> \
            </td>';
        petpetStyle = ' style="margin-top: -15px;"';
    }
    var hp = (SETTINGS[8]) ? STATS[7] : STATS[7].match(new RegExp(/.+\/ (\d+)/))[1];
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
        <td align="left"><b>'+STATS[1]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Color:</td> \
        <td align="left"><b>'+STATS[2]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Mood:</td> \
        <td align="left"><b>'+STATS[3]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Hunger:</td> \
        <td align="left"><b>'+STATS[4]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Age:</td> \
        <td align="left"><b>'+STATS[5]+'</b></td> \
        </tr> \
        </table> \
        </td> \
        \
        <td> \
        <table cellpadding="1" cellspacing="0" border="0"> \
        <tr> \
        <td align="right">Level:</td> \
        <td align="left"><b>'+STATS[6]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Health:</td> \
        <td align="left"><b><b>'+hp+'</b></b></td> \
        </tr> \
        <tr> \
        <td align="right">Strength:</td> \
        <td align="left"><b>'+getBDStat(8)+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Defence:</td> \
        <td align="left"><b>'+getBDStat(9)+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Movement:</td> \
        <td align="left"><b>'+getBDStat(10)+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Intelligence:</td> \
        <td align="left"><b>'+STATS[11]+'</b></td> \
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
    //    <i>'+STATS[14]+'</i><br> \
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
    if (!SETTINGS[3]) return ''; // if nav=false return empty
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
        '<div class="close_menu"><i class="fas fa-times"></i></div> \
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
    $('#settings_menu').append(
        '<div class="close_menu"><i class="fas fa-times"></i></div> \
        <div class="innerMenu"> \
            <h1>Settings</h1><hr> \
            <p>words here</p> \
        </div>');

    // functionality
    $('#info_button i').click(function(){
        $('#info_menu').toggle();
        $('#settings_menu').hide();
    });
    $('#settings_button i').click(function(){
        $('#settings_menu').toggle();
        $('#info_menu').hide();
    });
    $('.close_menu').click(function(){
        $(this).parent().hide();
    });
    $(document).keyup(function(e) {
        if (e.key === "Escape") { // escape key maps to keycode `27`
            $('#info_menu').hide();
            $('#settings_menu').hide();
       }
   });
}
function getInfo() {
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
function CreateCSS() {
    var statsCSS = document.createElement("style");
    statsCSS.type = "text/css";
    statsCSS.innerHTML = 
        '#info_nav { \
            padding-left: 1.5px; \
        } \
        #info_nav span { \
            background-color: '+COLOR+'; \
            padding: 4px 80px; \
            color: #fff \
        } \
        #info_pages { \
            position: relative; \
        } \
        .page { \
            position: absolute; \
            display: none; \
        } \
        .innerMenu { \
            padding: 0px 30px; \
        } \
        .innerMenu h1 { \
            margin-bottom: -5px; \
            color: '+SUBCOLOR+'; \
            font-family: Verdana, Arial, Helvetica, sans-serif; \
        } \
        .innerMenu hr { \
            background-color: '+COLOR+'; \
            border: none; \
            height: 1px; \
        } \
        .close_menu { \
            float: right; \
            cursor: pointer; \
            font-size: 25px; \
            color: '+COLOR+'; \
            margin: 12px 13px; \
        } \
        .close_menu:hover { \
            color: '+SUBCOLOR+'; \
        } \
        #sidebar_menus > div { \
            position: absolute; \
            display: none; \
            height: 400px; \
            width: 700px; \
            margin: 52px; \
            background-color: #fffe; \
            border: 4px solid '+COLOR+'; \
            border-radius: 20px; \
            z-index: 100; \
        } \
        #petsHeader span { \
            float: right; \
            font-size: 12px; \
        } \
        #petsHeader span i { \
            cursor: pointer; \
            padding: 0px 4px; \
        } \
        .petnav:hover, .leftHover:hover ~ .petnav, .leftSubHover:hover ~ .petnav { \
            margin-left: -30px; \
        } \
        .petnav a:hover { \
            cursor: pointer; \
            margin-left: -5px; \
            background-color: '+SUBCOLOR+'; \
        } \
        .petnav a:hover .sub { \
            margin-left: -25px; \
        } \
        .leftHover { \
            position: absolute; \
            z-index: 100; \
            height: 150px; \
            width: 50px; \
            margin-left: 3px; \
        } \
        .leftSubHover { \
            position: absolute; \
            z-index: 80; \
            height: 150px; \
            width: 25px; \
            margin-left: -22px; \
        } \
        .rightHover { \
            position: absolute; \
            z-index: 100; \
            height: 150px; \
            width: 50px; \
            margin-left: 103px; \
        } \
        .petnav { \
            position: absolute; \
            width: 42px; \
            z-index: 97; \
            background-color: '+COLOR+'; \
            border-radius: 12px 0px 0px 12px; \
            -webkit-transition-property: margin-left; \
            -webkit-transition-duration: .5s; \
            transition-property: margin-left; \
            transition-duration: .5s; \
        } \
        .petnav a { \
            position: relative; \
            display: block; \
            height: 25px; \
            font-size: 18px; \
            color: #fff; \
            background-color: '+COLOR+'; \
            border-radius: 12px 0px 0px 12px; \
            z-index: 98; \
        } \
        .disabled { \
            color: #fffa !important; \
        } \
        .disabled:hover { \
            margin-left: 0px !important; \
            background-color: '+COLOR+' !important; \
        } \
        .petnav span { \
            float: left; \
            width: 32px; \
            background-color: inherit; \
            border-radius: 12px 0px 0px 12px; \
        } \
        .petnav i { \
            padding: 3px; \
        } \
        .sub { \
            position: absolute !important; \
            width: 30px; \
            z-index: -1 !important; \
            background-color: '+SUBCOLOR+'; \
            -webkit-transition-property: margin-left; \
            -webkit-transition-duration: .2s; \
            transition-property: margin-left; \
            transition-duration: .2s; \
        } \
        .sub i { \
            padding: 5.5px; \
        } \
        \
        .hover { \
            position: absolute; \
            border-radius: 25px; \
            background-color: '+BGCOLOR+'; \
            border: 3px solid '+COLOR+'; \
            padding: 20px;  \
            height: 104px; \
            width: 5px; \
            margin-left: 95px; \
            overflow: hidden; \
            z-index: 98; \
        } \
        .inner { \
            height: 100%; \
            width: 90%; \
            float: right; \
            display: inline; \
        } \
        .inner table { \
            font: 7pt Verdana; \
            vertical-align: top; \
        } \
        .inner img { \
            border: 2px #ccc dashed; \
        }  \
        .inner i { \
            font: 6.5pt Verdana; \
        } ';
    return statsCSS;
}

// GATHERER FUNCTIONS
function QuickRef() {
    // All data except exact stat numbers
    $('.contentModuleTable tbody').each(function(k,v) {
        if(k%2 === 0) { // even indexed elements are the relevant ones
            var names = $(v).find('th').first().text();
            var regex = new RegExp('(.+) with (.+) the (.+) and its .+|(.+) with (.+) the (.+)|(.+)'); // allow for presence/absence of petpet/petpetpet
            var namesMatch = names.match(regex);
            var petpet = [namesMatch[2] || namesMatch[5], namesMatch[3] || namesMatch[6]];
            var petname = namesMatch[1] || namesMatch[4] || namesMatch[7];
            var newpet = 0;
            if( PETS.show.indexOf(petname) < 0 && PETS.hide.indexOf(petname) < 0 ) { // if pet isn't in either list, add it to shown pets
                PETS.show.push(petname);
                newpet = 1;
            }
            else
                STATS = JSON.parse(localStorage.getItem(petname)) || [];

            var lines = $(v).find('.pet_stats td');
            STATS[0]  = TIMESTAMP;
            STATS[1]  = $(lines).eq(0).text();  // species
            STATS[2]  = $(lines).eq(1).text();  // color
            STATS[3]  = $(lines).eq(6).text();  // mood
            STATS[4]  = $(lines).eq(7).text();  // hunger
            STATS[5]  = $(lines).eq(3).text();  // age
            STATS[6]  = $(lines).eq(4).text();  // level
            STATS[7]  = $(lines).eq(5).text();  // hp
            STATS[8]  = str_toInt($(lines).eq(8).text());   // strength
            STATS[9]  = def_toInt($(lines).eq(9).text());   // defence
            STATS[10] = mov_toInt($(lines).eq(10).text());  // movement
            STATS[11] = $(lines).eq(11).text(); // intelligence
            STATS[12] = petpet[0];              // petpet name
            STATS[13] = petpet[1];              // petpet species
            STATS[14] = $(lines).eq(12).find('img').attr('src');             // petpet image
            STATS[15] = $(v).find('.pet_image').attr('style').split("'")[1]; // pet image
            STATS[16] = $(v).find('.pet_notices:contains(converted)').length ? true : false; // is UC
            console.log(STATS);

            localStorage.setItem(petname, JSON.stringify(STATS));
        }
    });
}
function Training() {
    //Sidebar();
    $("table[width='500'] tbody tr").each(function(k,v) {
        if(k%2 === 0) {
            // get name and retreive data (if any)
            var petname = $(v).children().first().text().split(" ")[0];
            var newpet = 0;
            if( PETS.show.indexOf(petname) < 0 && PETS.hide.indexOf(petname) < 0 ) { // if pet isn't in either list, add it to shown pets
                PETS.show.push(petname);
                newpet = 1;
            }
            else
                STATS = JSON.parse(localStorage.getItem(petname)) || [];

            // get stats
            var dStats = $(v).next().children().first().text();
            var regex = new RegExp('Lvl : (.+)Str : (.+)Def : (.+)Mov : (.+)Hp  : (.+)');
            dStats = dStats.match(regex);

            STATS[0]  = TIMESTAMP;
            if(newpet) {
                for(var i=1; i<6; i++) STATS[i] = '';
                for(i=11; i<17; i++)   STATS[i] = ''; // can actually get pet image here, but meh
            }
            STATS[6]  = dStats[1]; // level
            STATS[7]  = dStats[5]; // hp
            STATS[8]  = dStats[2]; // strength
            STATS[9]  = dStats[3]; // defence
            STATS[10] = dStats[4]; // movement
            console.log(STATS);

            // store data
            localStorage.setItem(petname, JSON.stringify(STATS));
        }
    });
    UNCERTAIN = false;
}
function EndTraining() { // incomplete
    var message = $('p').first().text();
    var regex = new RegExp(' (.+) now has increased (.+)!!!');
    message = message.match(regex);

    var petname = message[1];
    var newpet = 0;
    if( PETS.show.indexOf(petname) < 0 && PETS.hide.indexOf(petname) < 0 ) { // if pet isn't in either list, add it to shown pets
        PETS.show.push(petname);
        newpet = 1;
    }
    else
        STATS = JSON.parse(localStorage.getItem(petname)) || [];

    // get stats
    STATS[0]  = TIMESTAMP;
    if(newpet) {
        for(var i=1; i<6; i++) STATS[i] = '';
        for(i=11; i<17; i++)   STATS[i] = '';
    }
    STATS[6]  = dStats[1]; // level
    STATS[7]  = dStats[5]; // hp
    STATS[8]  = dStats[2]; //strengthString(dStats[2]); // strength
    STATS[9]  = dStats[3]; //defenceString(dStats[3]);  // defence
    STATS[10] = dStats[4]; //movementString(dStats[4]); // movement
    console.log(STATS);

    // store data
    localStorage.setItem(petname, JSON.stringify(STATS));
}
function FaerieQuest() {
    var petname = $('.pet-name').text().slice(0, -2);
    if (petname.length) { // make sure on right page
        var faerie = $('.description_top').text().match(new RegExp(/for [^A-Z]*([A-Z][^ ]+) /))[1];
        console.log(petname, faerie);
        
        if( PETS.show.indexOf(petname) >= 0 || PETS.hide.indexOf(petname) >= 0 ) {  // ignore pets not stored
            STATS = JSON.parse(localStorage.getItem(petname));
            if(STATS) { // ignore pets with no data
                console.log('before:\nlv',STATS[6],'\nHP: ',STATS[7],'\nstr:',STATS[8],'\ndef:',STATS[9],'\nmov:',STATS[10])
                questSwitch(faerie);
                console.log('\nafter:\nlv',STATS[6],'\nHP: ',STATS[7],'\nstr:',STATS[8],'\ndef:',STATS[9],'\nmov:',STATS[10])
                localStorage.setItem(petname, JSON.stringify(STATS));
            }
        }
    }
}
function questSwitch(faerie) {
    switch (faerie) {
        case 'Air':
            incStat(10,3);
            break;
        case 'Dark':
            incStat(7,3);
            break;
        case 'Earth':
            // 3 (mov OR def OR str)
            break;
        case 'Fire':
            incStat(8,3);
            break;
        case 'Light':
            incStat(6,1);
            break;
        case 'Water':
            incStat(9,3);
            break;
        case 'Battle':
            incStat(7,1);
            incStat(8,3);
            incStat(9,3);
            break;
        case 'Queen':
            incStat(6,2);
            incStat(7,5);
            incStat(8,5);
            break;
        case 'Space':
            incStat(6,5);
            break;
        case 'Soup':
            // 2*2 (HP OR def OR str OR mov OR lv)
            var blurb = $('.pet-name').parent().text().match(new RegExp(/gained 2 (\w+) .*and 2 (\w+)/));
            var map = {'levels': 6, 'strength': 8, 'defense': 9, 'movement': 10};
            incStat(map[blurb[1]],2);
            incStat(map[blurb[2]],2);
            break;
        case 'Gray':
            // leaches off of elemental or fountain faerie. she's a poser.
            var newFaeire = $('.pet-name').parent().text().match(new RegExp(/another faerie. (\w+) .aerie, come/));
            if (newFaeire != "Earth") questSwitch(newFaeire);
            break;
    }
}
function HealingSprings() {
    /**
     * All of your Neopets gain seven hit points.  I hope that helps! :)
     * All your Neopets have their health completely restored
     * _redfoot_ regains their hit points and is not hungry any more
     * _redfoot_ is fully healed
     * 
     * 1 3 5
     */
    console.log('Healing Springs')
    var map = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15};
    var blurb = $('center > p').eq(2).text();
    console.log(blurb)
    var match = blurb.match(new RegExp(/^(All|([^ ]+)) .*( hungry| heal| gain)([^ ]+| (\w+))/)); // ^(All|([^ ]+)) .*(fully|gain)s? (\w+)
    if (match) {
        console.log(match)
        if (match[1]=="All") {
            console.log('All');
            // all pets
        }
        else {
            var petname = match[1];
            console.log('pet',petname);
        }
        if (match[3]==" gain") {
            var n = map[match[5]];
            console.log('gain',n)
            // inc front of STATS[7] for every pet... ugh what a pain
        }
        else {
            console.log('fully healed')
        }
        if (match[3]==" hungry") {
            console.log('bloated')
        }
    }
    else
        console.log('No change.')
}
function Coincidence() {
    console.log("I'll get to it eventually.");
}
// [0 timestamp, 1 species, 2 color, 3 mood, 4 hunger, 5 age, 6 level, 7 health, 8 strength, 9 defence, 10 movement, 11 intelligence, 12 petpet name, 13 petpet species, 14 petpet image, 15 pet image, 16 is UC]

function SecretLab() {
    console.log('Lab Ray');
    var petname = $('p').eq(0).find('b').text();
    console.log(petname);
    STATS = JSON.parse(localStorage.getItem(petname));
    if (STATS) { // ignore pets with no data
        console.log('before',STATS);
        var map = {'maximum':7, 'strength':8, 'defence':9, 'movement':10}; // and level?
        var blurb = $('p').eq(2).html();
        var match = blurb.match(new RegExp(/and s?he ([^ ]+) ([^ ]+) ([^ ]+) ([^!]+)/g));
        if (match) {
            switch (match[1]) {
                case "changes":
                    if (match[2]=="color") { // color change
                        // [4] is color
                        STATS[2] = match[4];
                    } else { // species change
                        // match [4] to /(.+) (.+)/g where [1] is color and [2] is species
                        var morph = match[4].match(new RegExp(/(.+) (.+)/g));
                        STATS[2] = morph[1];
                        STATS[1] = morph[2];
                    }
                    break;
                case "gains": // stat change
                    // [2] is quantity, [3] is stat
                    incStat(map[match[3]], match[2]);
                    break;
                case "loses": // stat change
                    // [2] is quantity, [3] is stat
                    incStat(map[match[3]], match[2]*(-1));
                    break;
                case "goes": // level 1
                    STATS[6] = 1;
                    break;
                // else nothing happens or gender change
            }
            console.log('after',STATS);
        }
    }
}
function PetpetLab() {
    // name: .content text > regex 'and (.+) are'
    // img:  .coontent div.eq(1) img src
    // name: ?
    console.log("I'll get to it eventually.");
}
function Sidebar() {
    // get name and retreive data (if any)
    var petname = $("a[href='/quickref.phtml']").first().text();
    var newpet = 0;
    if( PETS.show.indexOf(petname) < 0 && PETS.hide.indexOf(petname) < 0 ) { // if pet isn't in either list, add it to shown pets
        PETS.show.push(petname);
        newpet = 1;
    }
    else {
        STATS = JSON.parse(localStorage.getItem(petname));
        if(!STATS) STATS = [];
    }

    // get stats
    var activePetStats = $("td[align='left']");
    STATS[0]  = TIMESTAMP;
    STATS[1]  = $(activePetStats).eq(0).text();  // species
    if(newpet) STATS[2] = null;                  // color (can't be found here)
    STATS[3]  = $(activePetStats).eq(2).text();  // mood
    STATS[4]  = $(activePetStats).eq(3).text();  // hunger
    STATS[5]  = $(activePetStats).eq(4).text();  // age
    STATS[6]  = $(activePetStats).eq(5).text();  // level
    STATS[7]  = $(activePetStats).eq(1).text();  // hp
    if(newpet) for(var i=8; i<17; i++) STATS[i] = null;
    STATS[15] = $('.activePet a img').attr('src').slice(0,-5)+'4.png'; // pet image (use larger version)
    console.log(STATS);

    // store data
    localStorage.setItem(petname, JSON.stringify(STATS));
}
function Age() {
    console.log("I'll get to it eventually.");
}
function incStat(i,n) {
    STATS[i] = Number(STATS[i])+Number(n);
}

// MISC FUNCTIONS
function getSubcolor(n) {
    var rgbs = String(COLOR).match(new RegExp(/rgb\((\d+), ?(\d+), ?(\d+)\)/));
    return rgbs ? 'rgb('+(Number(rgbs[1])+n)+', '+(Number(rgbs[2])+n)+', '+(Number(rgbs[3])+n)+')' : COLOR;
}
function array_move(arr, old_index, new_index) {
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
};

var DEF = ['not yet born','defenceless','naked','vulnerable','very poor','poor','below average','below average','average','armoured','tough','heavy','heavy','very heavy','very heavy','steel plate','bullet proof','semi deadly godly','demi godly','godly','beyond godly'];
var U_DEF = ['below average','heavy','very heavy'];
var STR = ['not yet born','pathetic','very weak','weak','weak','frail','average','quite strong','quite strong','quite strong','strong','strong','very strong','very strong','great','immense','immense','titanic','titanic','titanic','herculean'];
var U_STR = ['weak','quite strong','strong','very strong','immense','titanic'];
var MOV = ['not yet born','barely moves','snail pace','lazy','very slow','slow','quite slow','average','average','fast','speedy','super fast','super speedy','breakneck','cheetah','lightening','mach 1','mach 1','mach 2','mach 3','mach 4'];
var U_MOV = ['average','fast','speedy','super fast','super speedy','breakneck','cheetah','lightening','mach 1','mach 1','mach 2','mach 3','mach 4'];
function str_toInt(word) {
    var n; // = ((STR.indexOf(word) < 0) ? word.match(/\d+/g)[0] : STR.indexOf(word));
    if (STR.indexOf(word) < 0) {
        n = word.match(/\d+/g)[0];
        if (U_STR.indexOf(word) < 0) {
            n = (STATS[8]-n)>0 && (STATS[8]-n)<4 ? STATS[8] : n;
            UNCERTAIN = true;
        }
    }
    else
        n = STR.indexOf(word);
    console.log("strength: ",word,n);
    return n
}
function def_toInt(word) {
    var n; // = ((DEF.indexOf(word) < 0) ? word.match(/\d+/g)[0] : DEF.indexOf(word));
    if (DEF.indexOf(word) < 0) {
        n = word.match(/\d+/g)[0];
        if (U_STR.indexOf(word) < 0) {
            n = (STATS[9]-n)>0 && (STATS[9]-n)<4 ? STATS[9] : n;
            UNCERTAIN = true;
        }
    }
    else
        n = DEF.indexOf(word);
    console.log("defense: ",word,n);
    return n
}
function mov_toInt(word) {
    var n = ((MOV.indexOf(word) < 0) ? word.match(/\d+/g)[0] : MOV.indexOf(word));
    if (word == "average") {
        n = (STATS[10]-n)>0 && (STATS[10]-n)<3 ? STATS[10] : n;
        UNCERTAIN = true;
    }
    console.log("movement: ",word,n);
    return n
}
/*function int_toInt(word) {
    var n = word.match(/\d+/g);
    n = n ? n[0] : word;
    console.log("intelligence: ",word,n);
    return n;
}*/
function getBDStat(n) {
    if (SETTINGS[9]==0 || n<8 || 10<n) return STATS[n]; // 'num' <default>
    var arr = (n==8) ? STR : (n==9) ? DEF : MOV;
    n = STATS[n];
    var word;
    if (n<21) {
        word = arr[n];
        if (SETTINGS[9]==1) word = word+' ('+n+')';     // 'str (num)'
    }
    else {
        if (n<40) word = 'GREAT';
        else if (n<60) word = 'EXCELLENT';
        else if (n<80) word = 'AWESOME';
        else if (n<100) word = 'AMAZING';
        else if (n<150) word = 'LEGENDARY';
        else word = 'ULTIMATE';
        if (SETTINGS[9]<3) word = word+' ('+n+')';      // 'str (num)'  OR  'str', 'str (num)' <neo default>
    }
    return word;
}

// MISC
$("head").append (
    '<link '
  + 'href="https://use.fontawesome.com/releases/v5.5.0/css/all.css" '
  + 'rel="stylesheet" type="text/css">'
);

main();
