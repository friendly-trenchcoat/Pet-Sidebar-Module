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
Make hover only work in CERTAIN AREA on right side.
On left side, have smaller popout with these buttons, icon and title:
    - move pet up
    - make active
    - customize
    - see/edit lookup
    - see/edit homepage
    - remove from sidebar
    - move down
At top of module, add three buttons:
    - help: toggle div with instructions and bug report link
    - settings: toggle div with settings
        > pet name aliases
        > what information to include in popout
        > color, maybe transparency
        > whether to put active pet at top or leave order
        > dropdown of removed pets, to add back
    - collapse: toggle inactive pets

Options:
order buttons literally change order of PETS list
if (stickyActive) just disable ability to move there


Default Display:
 >> customize
 species
 health
 mood
 hunger
 age
 level

New Display:
 species
 color
 *mood
 *hunger
 age
 level
 *health
 strength
 defence
 movement
 intelligence
 petpet
 >> relevant links:
  make active  http://www.neopets.com/process_changepet.phtml?new_active_pet=<name>
  customize    http://www.neopets.com/customise/?view=<name>
  view lookup  http://www.neopets.com/petlookup.phtml?pet=<name>
  view petpage http://www.neopets.com/~<name>
  edit lookup  http://www.neopets.com/neopet_desc.phtml?edit_petname=<name>
  edit petpage http://www.neopets.com/editpage.phtml?pet_name=<name>
*Inacive pets will not display mood or hunger, and health will display max only.

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


Other Ideas:
- Apply AnimatedPetImage script to all pets (use default if no other image specified)
- Hover over pet image to show info; animate sliding out to side
- Dropdown button for inactive pets
- Options pannel where you can set:
    > whether to show info by default for active and/or inactive pets, and whether it's to left or below
    > which items to show
    > which pets to show
    > pet order
    > animated: always off / on when supported / always on


Gameplan:
x copy page and play with css/html until active pet looks good with stats hover and links dropdown
x incorporate inactive pets
x convert to script
x construct 'database'
x construct update parameters and functions
- create buttons (options and dropdown)
- craft options menu
- test


Big Items Still To Do:
- links

.includes("(")
.split("(")[1].split(")")[0]
*/

var PETS = JSON.parse(localStorage.getItem("PETS")) || [];
var STATS = [];
var SETTINGS = [];
var TIMESTAMP = new Date().getTime();
var COLOR = $('.sidebarHeader').css('background-color');

function main() {
    // update STATS data
    if (document.URL.indexOf("quickref") != -1) QuickRef();
    else if (document.URL.indexOf("status") != -1 && ( document.URL.indexOf("training") != -1 || document.URL.indexOf("academy") != -1 ) ) Training();
    //else if (document.URL.indexOf("process_training") != -1) EndTraining();
    else if (document.URL.indexOf("quests") != -1) FaerieQuest();
    else if (document.URL.indexOf("coincidence") != -1) Coincidence();
    else if (document.URL.indexOf("lab2") != -1) SecretLab();
    else if (document.URL.indexOf("petpetlab") != -1) PetpetLab();
    else if ($(".sidebar")[0]) Sidebar();

    // actually add stuff now
    if ($(".sidebar")[0]) addElements();

    // store final list of pets
    localStorage.setItem("pets", JSON.stringify(PETS));
}
function addElements(){
    // Add the created elements to the page.
    var petModule = $('.sidebarModule:first-child tbody');
    //var activePetName = petModule.children().eq(0).find('b').text();

    /*/ remove default stats
    petModule.children().eq(3).remove();
    petModule.children().eq(2).remove();


    STATS = JSON.parse(localStorage.getItem(activePetName));

    // replace image
    petModule.children().eq(1).find('img').attr('src',STATS[16]);

    // over-module
    var over = petModule.first().clone(true);
    over.css({
        "position": "absolute",
        "top": "182px",
        "z-index": "99"
    });
    petModule.first().append(over);
    
    // add active pet menu
    petModule.first().append(CreateHTML(activePetName, 212));
    over.hover(function(){
        $('#hover_'+activePetName).stop(true).animate({width: '500px'}, 800);
        }, function(){
        $('#hover_'+activePetName).stop(true).animate({width: '5px'}, 500);
    });
    */

    petModule.html( // replace contents with only top bar
        '<tr> \
            <td valign="middle" class="sidebarHeader medText"><a href="/quickref.phtml"><b>Pets</b></a> </td> \
        </tr>'
    );

    // add inactive pets 
    var petname;
    var c=0;
    for (var i=0; i<PETS.length; i++) {
        petname = PETS[i];
        c += 1;
        STATS = JSON.parse(localStorage.getItem(petname));
        petModule.append('<tr id="inactive_'+petname+'" ></tr> style="position: relative;"'); // for some reason this must be done seperately
        $('#inactive_'+petname).append(
            '<div class="leftHover" petname="'+petname+'" style="position: absolute; z-index: 100; height: 150px; width: 50px; margin-left: 3px;"></div> \
            <div class="rightHover" petname="'+petname+'" style="position: absolute; z-index: 100; height: 150px; width: 50px; margin-left: 103px;"></div> \
            '+createStatsHTML(petname)+' \
            <a href="/quickref.phtml" style="position: relative; z-index: 99;"><img src="'+STATS[16]+'" width="150" height="150" border="0" style=""></a>');
    }

    $('.leftHover').hover(function(){ // hovering over left hover div exposes buttons menu
        console.log('left hover');
        }, function(){
        console.log('left unhover');
    });
    $('.rightHover').hover(function(){ // hovering over right hover div exposes stats menu
        $('#stats_'+$(this).attr('petname')).stop(true).animate({width: '500px'}, 800);
        }, function(){
        $('#stats_'+$(this).attr('petname')).stop(true).animate({width: '5px'}, 500);
    });

    // add CSS
    document.body.appendChild(CreateCSS());
}
function QuickRef() {
    // All data except age and exact stat numbers
    $('.contentModuleTable tbody').each(function(k,v) {
        if(k%2 === 0) { // even indexed elements are the relevant ones
            var names = $(v).find('th').first().text();
            var regex = new RegExp('(.+) with (.+) the (.+) and its .+|(.+) with (.+) the (.+)|(.+)'); // allow for presence/absence of petpet/petpetpet
            var namesMatch = names.match(regex);
            var petpet = [namesMatch[2] || namesMatch[5], namesMatch[3] || namesMatch[6]];
            var petname = namesMatch[1] || namesMatch[4] || namesMatch[7];
            var newpet = 0;
            if( PETS.indexOf(petname) < 0 ) { // if pet isn't in list, add it
                PETS.push(petname);
                newpet = 1;
            }
            else {
                STATS = JSON.parse(localStorage.getItem(petname));
                if(!STATS) STATS = [];
            }

            var lines = $(v).find('.pet_stats td');
            STATS[0]  = TIMESTAMP;
            STATS[1]  = $(lines).eq(0).text();  // species
            STATS[2]  = $(lines).eq(1).text();  // color
            STATS[3]  = $(lines).eq(6).text();  // mood
            STATS[4]  = $(lines).eq(7).text();  // hunger
            STATS[5]  = $(lines).eq(3).text();  // age
            STATS[6]  = $(lines).eq(4).text();  // level
            STATS[7]  = $(lines).eq(5).text();  // hp
            STATS[8]  = $(lines).eq(8).text();  // strength   // will need to add check for low-level (and for pet lookup too)
            STATS[9]  = $(lines).eq(9).text();  // defence
            STATS[10] = $(lines).eq(10).text(); // movement
            STATS[11] = $(lines).eq(11).text(); // intelligence
            STATS[12] = petpet[0];              // petpet name
            STATS[13] = petpet[1];              // petpet species
            if(newpet) STATS[14] = STATS[14] || null;                        // petpet age (can't be found here)... does anyone even care about this?
            STATS[15] = $(lines).eq(12).find('img').attr('src');             // petpet image
            STATS[16] = $(v).find('.pet_image').attr('style').split("'")[1]; // pet image
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
            if( PETS.indexOf(petname) < 0 ) { // if pet isn't in list, add it
                PETS.push(petname);
                newpet = 1;
            }
            else {
                STATS = JSON.parse(localStorage.getItem(petname));
                if(!STATS) STATS = [];
            }

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
            STATS[8]  = dStats[2]; //strengthString(dStats[2]); // strength
            STATS[9]  = dStats[3]; //defenceString(dStats[3]);  // defence
            STATS[10] = dStats[4]; //movementString(dStats[4]); // movement
            console.log(STATS);

            // store data
            localStorage.setItem(petname, JSON.stringify(STATS));
        }
    });
}
function EndTraining() { // incomplete
    var message = $('p').first().text();
    var regex = new RegExp(' (.+) now has increased (.+)!!!');
    message = message.match(regex);

    var petname = message[1];
    var newpet = 0;
    if( PETS.indexOf(petname) < 0 ) { // if pet isn't in list, add it
        PETS.push(petname);
        newpet = 1;
    }
    else {
        STATS = JSON.parse(localStorage.getItem(petname));
        if(!STATS) STATS = [];
    }

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
    console.log("I'll get to it eventually.");
}
function HealingSprings() {
    // .content > All of your Neopets gain ([0-9]+) (.+)\. I hope that helps!
}
function Coincidence() {
    console.log("I'll get to it eventually.");
}
function SecretLab() {
    // name: ?
    // stat: <p>.eq(2).text()
    console.log("I'll get to it eventually.");
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
    if( PETS.indexOf(petname) < 0 ) { // if pet isn't in list, add it
        PETS.push(petname);
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
    if(newpet) STATS[2] = '';                    // color (can't be found here)
    STATS[3]  = $(activePetStats).eq(2).text();  // mood
    STATS[4]  = $(activePetStats).eq(3).text();  // hunger
    STATS[5]  = $(activePetStats).eq(4).text();  // age
    STATS[6]  = $(activePetStats).eq(5).text();  // level
    STATS[7]  = $(activePetStats).eq(1).text();  // hp
    if(newpet) for(var i=8; i<16; i++) STATS[i] = '';
    STATS[16] = $('.activePet a img').attr('src').slice(0,-5)+'4.png'; // pet image (use larger version)
    console.log(STATS);

    // store data
    localStorage.setItem(petname, JSON.stringify(STATS));
}
function Age() {
    console.log("I'll get to it eventually.");
}
function CreateCSS() { // 155 | 212 > 367 > 522 > 677 > 832
    var statsCSS = document.createElement("style");
    statsCSS.type = "text/css";
    statsCSS.innerHTML = ' \
        .hover { \
            border-radius: 25px; \
            background-color: #fffd; \
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
// [0 timestamp, 1 species, 2 color, 3 mood, 4 hunger, 5 age, 6 level, 7 health, 8 strength, 9 defence, 10 movement, 11 intelligence, 12 petpet name, 13 petpet species, 14 petpet age, 15 petpet image]
function createStatsHTML(petname) {
    var petpetTD = '', petpetStyle='';
    if (STATS[15]) {
        petpetTD =
            '<td align="center"> \
                <b>'+STATS[12]+'</b> the '+STATS[13]+'<br><br> \
                <img src="'+STATS[15]+'" width="80" height="80"><br><br> \
            </td>';
        petpetStyle = ' style="margin-top: -15px;"';
    }
    var statsHTML =
        '<div id="stats_'+petname+'" class="hover stats" style="position: absolute; "> \
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
        <td align="left"><b><b>'+STATS[7]+'</b></b></td> \
        </tr> \
        <tr> \
        <td align="right">Strength:</td> \
        <td align="left"><b>'+STATS[8]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Defence:</td> \
        <td align="left"><b>'+STATS[9]+'</b></td> \
        </tr> \
        <tr> \
        <td align="right">Movement:</td> \
        <td align="left"><b>'+STATS[10]+'</b></td> \
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

function _strengthString(word) {
    var low = {'Not Yet Born':'0', 'Pathetic':'1','Very Weak':'2','Weak':'3-4','Frail':'5','Average':'6','Quite Strong':'7-9','Strong':'10-11','Very Strong':'12-13','Great':'14','Immense':'15-16','Titanic':'17-19','Herculean':'20'}
    var n = ((word in low) ? low[word] : word.match(/\d+/g));
    console.log("strength: ",word,n);
    return n
}
function _defenceString(word) {
    var low = {'Not Yet Born':'0','Defenceless':'1','Naked':'2','Vulnerable':'3','Very Poor':'4','Poor':'5','Below Average':'6-7','Average':'8','Armoured':'9','Tough':'10','Heavy':'11-12','Very Heavy':'13-14','Steel Plate':'15','Bullet Proof':'16','Semi Deadly Godly':'17','Demi Godly':'18','Godly':'19','Beyond Godly':'20'};
    var n = ((word in low) ? low[word] : word.match(/\d+/g));
    console.log("defense: ",word,n);
    return n
}
function _movementString(word) {
    var low = ['Not Yet Born','Barely Moves','Snail Pace','Lazy','Very Slow','Slow','Quite Slow','Average','Average','Fast','Speedy','Super Fast','Super Speedy','Breakneck','Cheetah','Lightening','Mach 1','Mach 1','Mach 2','Mach 3','Mach 4'];
    var n = ((word.indexOf(low) < 0) ? word.match(/\d+/g) : word.indexOf(low));
    n = ((n==7) ? '7-8' : n);
    console.log("movement: ",word,n);
    return n
}
function _intelligenceString(word) {
    var low = {'Dim Witted':'0-4','Dull':'5-9','Average':'10-14','Above Average':'15-19','Bright':'20-24','Clever':'25-29','Very Clever':'30-34','Brilliant':'35-39','Genius':'40-44','Super Genius':'45-49','Mega Genius':'50-54','Total Genius':'55-59','Master Genius':'60-94'}
    var n = ((word in low) ? low[word] : word.match(/\d+/g));
}
function strengthString(n) {
    var word;
    var low = ['Not Yet Born','Pathetic','Very Weak','Weak','Weak','Frail','Average','Quite Strong','Quite Strong','Quite Strong','Strong','Strong','Very Strong','Very Strong','Great','Immense','Immense','Titanic','Titanic','Titanic','Herculean'];
    if (n<21) word = low[n];
    else if (n<40) word = 'GREAT';
    else if (n<60) word = 'EXCELLENT';
    else if (n<80) word = 'AWESOME';
    else if (n<100) word = 'AMAZING';
    else if (n<150) word = 'LEGENDARY';
    else word = 'ULTIMATE';
    word = word+' ('+n+')';
    return word;
}
function defenceString(n) {
    var word;
    var low = ['Not Yet Born','Defenceless','Naked','Vulnerable','Very Poor','Poor','Below Average','Below Average','Average','Armoured','Tough','Heavy','Heavy','Very Heavy','Very Heavy','Steel Plate','Bullet Proof','Semi Deadly Godly','Demi Godly','Godly','Beyond Godly'];
    if (n<21) word = low[n];
    else if (n<40) word = 'GREAT';
    else if (n<60) word = 'EXCELLENT';
    else if (n<80) word = 'AWESOME';
    else if (n<100) word = 'AMAZING';
    else if (n<150) word = 'LEGENDARY';
    else word = 'ULTIMATE';
    word = word+' ('+n+')';
    return word;
}
function movementString(n) {
    var word;
    var low = ['Not Yet Born','Barely Moves','Snail Pace','Lazy','Very Slow','Slow','Quite Slow','Average','Average','Fast','Speedy','Super Fast','Super Speedy','Breakneck','Cheetah','Lightening','Mach 1','Mach 1','Mach 2','Mach 3','Mach 4'];
    if (n<21) word = low[n];
    else if (n<40) word = 'GREAT';
    else if (n<60) word = 'EXCELLENT';
    else if (n<80) word = 'AWESOME';
    else if (n<100) word = 'AMAZING';
    else if (n<150) word = 'LEGENDARY';
    else word = 'ULTIMATE';
    word = word+' ('+n+')';
    return word;
}

main();
