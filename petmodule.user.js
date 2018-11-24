// ==UserScript==
// @name           Neopets - Pets Sidebar Module
// @namespace      https://github.com/friendly-trenchcoat
// @version        1.0
// @description    Displays more info for active pet, plus dropdown to show info for other pets.
// @author         friendly-trenchcoat
// @include        http://www.neopets.com/*
// @grant          GM_getValue
// @grant          GM_setValue
// @require	       http://code.jquery.com/jquery-latest.min.js
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

var pets = JSON.parse(localStorage.getItem("pets"));
if(!pets) pets = [];
var stats = [];
var settings = [];
var timestamp = new Date().getTime();

function main() {
    // update stats data
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
    localStorage.setItem("pets", JSON.stringify(pets));
}
function addElements(){
    var activePet = $('.sidebarModule:first-child tbody');
    var activePetName = activePet.children().eq(0).find('b').text();

    // remove default stats
    activePet.children().eq(3).remove();
    activePet.children().eq(2).remove();

    stats = JSON.parse(localStorage.getItem(activePetName));

    // replace image
    activePet.children().eq(1).find('img').attr('src',stats[16]);

    // over-module
    var over = activePet.first().clone(true);
    over.css({
        "position": "absolute",
        "top": "182px",
        "z-index": "99"
    });
    activePet.first().append(over);
    // add active pet menu
    activePet.first().append(CreateHTML(activePetName, 212));
    over.hover(function(){
        $('#hover_'+activePetName).stop(true).animate({width: '500px'}, 800);
        }, function(){
        $('#hover_'+activePetName).stop(true).animate({width: '5px'}, 500);
    });

    // add inactive pets
    var petname;
    var c=0;
    for (var i=0; i<pets.length; i++) {
        petname = pets[i];
        if (petname !== activePetName) {
            c += 1;
            stats = JSON.parse(localStorage.getItem(petname));
            activePet.first().append('<tr id="inactive_'+petname+'"><td class="inactivePet" style="position: relative; z-index: 99;"><a href="/quickref.phtml"><img src="'+stats[16]+'" width="150" height="150" border="0" style=""></a></td></tr>'); // add module
            activePet.first().append(CreateHTML(petname, 215+(155*c))); // add menu
            $('#inactive_'+petname).hover(function(){ // hovering over module exposes menu
                $(this).next().stop(true).animate({width: '500px'}, 800);
                }, function(){
                $(this).next().stop(true).animate({width: '5px'}, 500);
            });
        }
    }

    // add CSS
    document.body.appendChild(CreateCSS());
}
function QuickRef() {
    $('.contentModuleTable tbody').each(function(k,v) {
        if(k%2 === 0) {
            var names = $(v).find('th').first().text();
            var regex = new RegExp('(.+) with (.+) the (.+)');
            names = names.match(regex);
            var petname = names[1];
            var newpet = 0;
            if( pets.indexOf(petname) < 0 ) { // if pet isn't in list, add it
                pets.push(petname);
                newpet = 1;
            }
            else {
                stats = JSON.parse(localStorage.getItem(petname));
                if(!stats) stats = [];
            }

            var lines = $(v).find('.pet_stats td');
            stats[0]  = timestamp;
            stats[1]  = $(lines).eq(0).text();  // species
            stats[2]  = $(lines).eq(1).text();  // color
            stats[3]  = $(lines).eq(6).text();  // mood
            stats[4]  = $(lines).eq(7).text();  // hunger
            stats[5]  = $(lines).eq(3).text();  // age
            stats[6]  = $(lines).eq(4).text();  // level
            stats[7]  = $(lines).eq(5).text();  // hp
            stats[8]  = $(lines).eq(8).text();  // strength   // will need to add check for low-level (and for pet lookup too)
            stats[9]  = $(lines).eq(9).text();  // defence
            stats[10] = $(lines).eq(10).text(); // movement
            stats[11] = $(lines).eq(11).text(); // intelligence
            stats[12] = names[2];               // petpet name
            stats[13] = names[3];               // petpet species
            if(newpet) stats[14] = '';          // petpet age (can't be found here)
            stats[15] = $(lines).eq(12).find('img').attr('src');             // petpet image
            stats[16] = $(v).find('.pet_image').attr('style').split("'")[1]; // pet image
            console.log(stats);

            localStorage.setItem(petname, JSON.stringify(stats));
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
            if( pets.indexOf(petname) < 0 ) { // if pet isn't in list, add it
                pets.push(petname);
                newpet = 1;
            }
            else {
                stats = JSON.parse(localStorage.getItem(petname));
                if(!stats) stats = [];
            }

            // get stats
            var dStats = $(v).next().children().first().text();
            var regex = new RegExp('Lvl : (.+)Str : (.+)Def : (.+)Mov : (.+)Hp  : (.+)');
            dStats = dStats.match(regex);

            stats[0]  = timestamp;
            if(newpet) {
                for(var i=1; i<6; i++) stats[i] = '';
                for(i=11; i<17; i++)   stats[i] = ''; // can actually get pet image here, but meh
            }
            stats[6]  = dStats[1]; // level
            stats[7]  = dStats[5]; // hp
            stats[8]  = dStats[2]; //strengthString(dStats[2]); // strength
            stats[9]  = dStats[3]; //defenceString(dStats[3]);  // defence
            stats[10] = dStats[4]; //movementString(dStats[4]); // movement
            console.log(stats);

            // store data
            localStorage.setItem(petname, JSON.stringify(stats));
        }
    });
}
function EndTraining() { // incomplete
    var message = $('p').first().text();
    var regex = new RegExp(' (.+) now has increased (.+)!!!');
    message = message.match(regex);

    var petname = message[1];
    var newpet = 0;
    if( pets.indexOf(petname) < 0 ) { // if pet isn't in list, add it
        pets.push(petname);
        newpet = 1;
    }
    else {
        stats = JSON.parse(localStorage.getItem(petname));
        if(!stats) stats = [];
    }

    // get stats
    stats[0]  = timestamp;
    if(newpet) {
        for(var i=1; i<6; i++) stats[i] = '';
        for(i=11; i<17; i++)   stats[i] = '';
    }
    stats[6]  = dStats[1]; // level
    stats[7]  = dStats[5]; // hp
    stats[8]  = dStats[2]; //strengthString(dStats[2]); // strength
    stats[9]  = dStats[3]; //defenceString(dStats[3]);  // defence
    stats[10] = dStats[4]; //movementString(dStats[4]); // movement
    console.log(stats);

    // store data
    localStorage.setItem(petname, JSON.stringify(stats));
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
    if( pets.indexOf(petname) < 0 ) { // if pet isn't in list, add it
        pets.push(petname);
        newpet = 1;
    }
    else {
        stats = JSON.parse(localStorage.getItem(petname));
        if(!stats) stats = [];
    }

    // get stats
    var activePetStats = $("td[align='left']");
    stats[0]  = timestamp;
    stats[1]  = $(activePetStats).eq(0).text();  // species
    if(newpet) stats[2] = '';                    // color (can't be found here)
    stats[3]  = $(activePetStats).eq(2).text();  // mood
    stats[4]  = $(activePetStats).eq(3).text();  // hunger
    stats[5]  = $(activePetStats).eq(4).text();  // age
    stats[6]  = $(activePetStats).eq(5).text();  // level
    stats[7]  = $(activePetStats).eq(1).text();  // hp
    if(newpet) for(var i=8; i<16; i++) stats[i] = '';
    stats[16] = $('.activePet a img').attr('src').slice(0,-5)+'4.png'; // pet image (use larger version)
    console.log(stats);

    // store data
    localStorage.setItem(petname, JSON.stringify(stats));
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
            background: url(http://i.imgur.com/Qtj8r6k.png); \
            border: 3px solid #c879aa; \
            padding: 20px;  \
            height: 104px; \
            width: 5px; \
            margin-top: -152.5px; \
            margin-left: 95px; \
            overflow: hidden; \
            z-index: 98; \
        } \
        .inner { \
            margin-top: -15px; \
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
function CreateHTML(petname, top) {
    stats = JSON.parse(localStorage.getItem(petname));
    var statsHTML = '\
    <div id="hover_'+petname+'" class="hover" style="position: absolute; "> \
    <div class="inner"> \
     \
    <table cellpadding="1" cellspacing="0" border="0"><tr> \
     \
    <td vertical-align="top"> \
    <table cellpadding="1" cellspacing="0" border="0"> \
    <tr> \
    <td align="right">Species:</td> \
    <td align="left"><b>'+stats[1]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Color:</td> \
    <td align="left"><b>'+stats[2]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Mood:</td> \
    <td align="left"><b>'+stats[3]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Hunger:</td> \
    <td align="left"><b>'+stats[4]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Age:</td> \
    <td align="left"><b>'+stats[5]+'</b></td> \
    </tr> \
    </table> \
    </td> \
     \
    <td> \
    <table cellpadding="1" cellspacing="0" border="0"> \
    <tr> \
    <td align="right">Level:</td> \
    <td align="left"><b>'+stats[6]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Health:</td> \
    <td align="left"><b><b>'+stats[7]+'</b></b></td> \
    </tr> \
    <tr> \
    <td align="right">Strength:</td> \
    <td align="left"><b>'+stats[8]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Defence:</td> \
    <td align="left"><b>'+stats[9]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Movement:</td> \
    <td align="left"><b>'+stats[10]+'</b></td> \
    </tr> \
    <tr> \
    <td align="right">Intelligence:</td> \
    <td align="left"><b>'+stats[11]+'</b></td> \
    </tr> \
    </table> \
    </td> \
     \
    <td align="center"> \
    <b>'+stats[12]+'</b> the '+stats[13]+'<br><br> \
    <img src="'+stats[15]+'" width="80" height="80"><br><br> \
    </td> \
     \
    </tr></table> \
     \
    </div> \
    </div>';
    //    <i>'+stats[14]+'</i><br> \
    return statsHTML;
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
