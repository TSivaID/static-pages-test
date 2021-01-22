/*
This file is used by AMP and FBIA pages only.
*/
var Postmedia=Postmedia || {};
Postmedia.adConfig=Postmedia.adConfig || {};
Postmedia.Properties=Postmedia.Properties || {};
Postmedia.Analytics=Postmedia.Analytics || {};
Postmedia.Analytics.Driving=Postmedia.Analytics.Driving || {};
Postmedia.Audience=Postmedia.Audience || {};
window.mParticle=window.mParticle || {};
window.mParticle.ready=window.mParticle.ready || new Function();

Postmedia.Audience.EventType={Location:2,Navigation:1,Other:8,Search:3,Social:7,Transaction:4,Unknown:0,UserContent:5,UserPreference:6}; //Values set for cases where event happens before EventType is set.
window.mParticle.ready(function() {
    Postmedia.Audience.EventType=mParticle.EventType;
});

Postmedia.Audience.identityRequest=Postmedia.Audience.identityRequest || { userIdentities: {} };

// Detect Janrain ID. If found, merge anonymous data with user data
if (JSON.parse(localStorage.getItem('janrainCaptureProfileData')) != null) {
    Postmedia.Audience.identityRequest.userIdentities.customerid=JSON.parse(localStorage.getItem('janrainCaptureProfileData')).uuid;
    Postmedia.Audience.identityRequest.userIdentities.email=JSON.parse(localStorage.getItem('janrainCaptureProfileData')).email;
    Postmedia.Audience.identityRequest.onUserAlias = function(oldUser, newUser) {
        var oldUserAttributes = oldUser.getAllUserAttributes();
        var newUserAttributes = newUser.getAllUserAttributes();
        for (var userAttrKey in oldUserAttributes){
            newUser.setUserAttribute(userAttrKey, oldUserAttributes[userAttrKey]);
        }
    }
}

//NLP Parser - needed for Audience functions so at top
Postmedia.Analytics.NLP = Postmedia.Analytics.NLP || {};
if (typeof Postmedia.Analytics.NLP=='object') {
    Postmedia.Analytics.NLP.Parser = function(obj,type,pre,val) { //NLP object, purpose of parsing, prepend str for all new values about to be added.
        type=(typeof type == 'undefined') ? 'default' : type.toLowerCase();
        pre=(typeof pre == 'undefined') ? '' : pre+'>';
        if (typeof val == 'undefined') {
            switch (type) {
                case "mparticle":
                    val=[];
                    break;
                default:
                    val='';
            }
        }
        if (typeof obj != 'object' || obj.length==0) return val;
        for (i in obj) {
            if ( !(type=='mparticle' && typeof obj[i].children=='object') ) { // GA doesn't want parent levels independent of the last level
                switch (type) {
                    case "products": //String version
                        val=val+'NLP;'+pre+obj[i].value+',';
                        break;
                    case "mparticle":
                        val.push( (pre + obj[i].value).toLowerCase() );
                        break;
                    default:
                        val+pre+obj[i].value+'|';
                }
            }
            if (typeof obj[i].children=='object') {val=Postmedia.Analytics.NLP.Parser(obj[i].children,type,pre+obj[i].value,val)};
        }
        if (typeof val === 'string' && (typeof obj[0].level== 'undefined' || obj[0].level==1)) val=val.slice(0, -1);
        return val;
    };
}

// START Events/Page Views
Postmedia.Audience.logPageView = function() {
    try {
        arguments[0] = "Screen View";
        if (typeof arguments[1] != 'object') throw "Attributes must be an object.";
        if (typeof arguments[2] != 'object') throw "Custom Flags must be an object.";
        var args = arguments;
        window.mParticle.ready(function() {
            mParticle.logPageView.apply(this, args);
        });
        return true;
    } catch(e) { console.error("Postmedia.Audience.logPageView -", e); return false; }
};

Postmedia.Audience.login = function() {
    try {
        if (typeof arguments[0] != 'object') throw "First parm must be an Identity object.";
        var args = arguments;
        window.mParticle.ready(function() {
            mParticle.Identity.login.apply(this, args);
        });
        return true;
    } catch(e) { console.error("Postmedia.Audience.login -", e); return false; }
};

Postmedia.Audience.detectNonStringProp = function(obj) {
    if (typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).length === 0) {
        return false;
    }

    for (var key in obj) {
        if (obj[key] && typeof obj[key] !== "string") {
            throw new Error("Non-string property detected");
        }
    }

    return obj;
}

Postmedia.Audience.logEvent = function() {
    try {
        if (typeof arguments[0] != 'string') throw "Event Name must be a string.";
        arguments[1] = arguments[1] || Postmedia.Audience.EventType.Other;
        if (typeof arguments[2] != 'object') throw "Attributes must be an object.";
        arguments[2]["Domain"] = (Postmedia.Analytics.Server) ? Postmedia.Analytics.Server : Postmedia.Analytics.URL.host.toLowerCase();
        for (a in arguments[2]) {
            if (Array.isArray(arguments[2][a])) arguments[2][a]=arguments[2][a].join(',');
        }

        arguments[2] = Postmedia.Audience.detectNonStringProp(arguments[2]);

        var args = arguments;
        window.mParticle.ready(function() {
            mParticle.logEvent.apply(this, args);
        });
        return true;
    } catch(e) { console.error("Postmedia.Audience.logEvent -", e); return false; }
};
Postmedia.Audience.logNLP = function() {
    try {
        if (typeof arguments[0] != 'object') throw "NLP data must be an object.";
        var args = arguments;
        args[0]=Postmedia.Analytics.NLP.Parser(arguments[0].entities,'mparticle').concat(Postmedia.Analytics.NLP.Parser(arguments[0].key_topics,'mparticle','Topic')).concat(Postmedia.Analytics.NLP.Parser(arguments[0].categories,'mparticle','Category'));
        window.mParticle.ready(function() {
            var pArr = [];
            var productName = '';
            var productID = '';
            for ( i in args[0] ) {
                if( '' != args[0][i] && null != args[0][i] && 'undefined' != args[0][i] ) {
                    productName = args[0][i].trim();
                    productName = productName.replace( /(^\-+|\-+$)/mg, '' );
                    productID = args[0][i].trim();
                    productID = productID.replace( /(^\-+|\-+$)/mg, '' );
                    pArr.push( mParticle.eCommerce.createProduct( productName, productID, 0, 1, '', Postmedia.Analytics.CategoryAll, 'NLP', '', '', '' ) );
                    productName = '';
                    productID = '';
                }
            }
            var impression = mParticle.eCommerce.createImpression( 'NLP keyword list', pArr );
            mParticle.eCommerce.logImpression( impression, {}, { "Google.NonInteraction" : true } );
        });
        return true;
    } catch(e) { console.error("Postmedia.Audience.logEvent -", e); return false; }
};
// END Events/Page Views

// START User Attributes
Postmedia.Audience.setUserAttribute = function(k,v) {
    try {
        if (typeof arguments[0] != 'string' || arguments[0] == '') throw "First param must be a string and not empty.";
        arguments[1] = arguments[1] || '';
        if (typeof arguments[1] != 'string') throw "Second param must be a string.";
        if (arguments[1] != '') {
            var args = arguments;
            window.mParticle.ready(function() {
                if (mParticle.Identity.getCurrentUser() != null)
                    mParticle.Identity.getCurrentUser().setUserAttribute.apply(mParticle.Identity.getCurrentUser(), args);
            });
        };
        return true;
    } catch(e) { console.error("Postmedia.Audience.setUserAttribute -", e); return false; }
};
Postmedia.Audience.setUserAttributeList = function(k,v) {
    try {
        if (typeof arguments[0] != 'string' || arguments[0] == '') throw "First param must be a string and not empty.";
        arguments[1] = arguments[1] || [];
        if (!Array.isArray(arguments[1])) throw "Second param must be an array.";
        if (arguments[1].length > 0) {
            var args = arguments;
            window.mParticle.ready(function() {
                if (mParticle.Identity.getCurrentUser() != null)
                    mParticle.Identity.getCurrentUser().setUserAttributeList.apply(mParticle.Identity.getCurrentUser(), args);
            });
        };
        return true;
    } catch(e) { console.error("Postmedia.Audience.setUserAttributeList -", e); return false; }
};
Postmedia.Audience.incrementUserAttribute = function(k) {
    try {
        if (typeof arguments[0] != 'string' || arguments[0] == '') throw "First param must be a string and not empty.";
        arguments[1] = 0;
        var args = arguments;
        window.mParticle.ready(function() {
            if (mParticle.Identity.getCurrentUser() != null) {
                n=parseInt(mParticle.Identity.getCurrentUser().getAllUserAttributes()[String(args[0])]);
                if (isNaN(n)) n=0;
                args=[args[0],String(n+1)];
                mParticle.Identity.getCurrentUser().setUserAttribute.apply(mParticle.Identity.getCurrentUser(), args);
            }
        });
        return true;
    } catch(e) { console.error("Postmedia.Audience.incrementUserAttribute -", e); return false; }
};
// END User Attributes

// Start Configuration
// Division Types. Each site belongs to a division type.
Postmedia.Analytics.DivisionTypes={UNKNOWN:"unknown",BROADSHEET:"broadsheet",TABLOID:"tabloid",CENTRAL:"central",AUTOS:"autos",CLASSIFIEDS:"classifieds",COMMUNITIES:"communities",OBITUARIES:"obituaries",CORPORATE:"corporate"};

// Branding values for Postmedia.Analytics.Brand. JS version must be lowercase as the cwi.stats.branding meta tag version converts to lowercase.
Postmedia.Analytics.BrandingTypes={UNKNOWN:"unknown",POSTMEDIA:"postmedia",CANADA:"canada.com",CALGARY_HERALD:"calgary herald",EDMONTON_JOURNAL:"edmonton journal",MONTREAL_GAZETTE:"montreal gazette",OTTAWA_CITIZEN:"ottawa citizen",REGINA_LEADERPOST:"regina leader-post",SASKATOON_STAR_PHOENIX:"saskatoon star phoenix",VANCOUVER_SUN_AND_THE_PROVINCE:"co-brand - VS/VP",PEACE_RIVER_CO_BRAND:"co-brand - Peace River Sun/Country/Post/Tribune",CENTRAL_WEST_AB_CO_BRAND:"co-brand - Hinton/Edson/Drayton/Mayerthrope/White Court",SOUTH_CENTRAL_AB_CO_BRAND:"co-brand - Vulcan/Nanton/High River",CENTRAL_SOUTH_AB_CO_BRAND:"co-brand - Camrose/Wetaskiwin",CENTRAL_AB_CO_BRAND:"co-brand - Devon/Leduc/Beaumont/County Market",SPRUCE_STONY_CO_BRAND:"co-brand - Spruce/Stony",SHERWOOD_FORT_SASK_CO_BRAND:"co-brand - Sherwood/Fort Sask",BANFF_COCHRANE_CO_BRAND:"co-brand - Banff/Cochrane",VERMILLION_LLOYD_COLDLAKE_CO_BRAND:"co-brand - Vermillion/Lloyd/Coldlake",MELFORT_NIPAWIN_CO_BRAND:"co-brand - Melfort/Nipawin",STERLING_TRENTON_PICTON_CO_BRAND:"co-brand - Trenton/Picton/Stirling",NAPANEE_KINGSTON_GANANOQUE_CO_BRAND:"co-brand - Napanee/Kingston/Gananoque",ELLIOT_LAKE_ESPANOLA_CO_BRAND:"co-brand - Elliot Lake/Espanola",TIMMINS_COCHRANE_KAPUSKASING_CO_BRAND:"co-brand - Timmins/Cochrane/Kapuskasing",SOUTH_BRUCE_PENINSULA_CO_BRAND:"co-brand - Hanover/Lucknow/Port Elgin/Wiarton/Kincardine",BRANTFORD_PARIS_CO_BRAND:"co-brand - Brantford/Paris",CHATHAM_THIS_WEEK_WALLACEBURG_CO_BRAND:"co-brand - Chatham This Week/Wallaceburg",DELHI_TILSONBURG_CO_BRAND:"co-brand - Delhi/Tilsonburg",SEAFORTH_CLINTON_GODERICH_LAKESHORE_CO_BRAND:"co-brand - Seaforth/Clinton/Goderich/Lakeshore",ST_THOMAS_STRATHROY_WEST_LORNE_CO_BRAND:"co-brand - St. Thomas/Strathroy/West Lorne(West Elgin)",INTERLAKE_SELKIRK_STONEWALL_CO_BRAND:"co-brand - Interlake/Selkirk/Stonewall",THE_PROVINCE:"the province",VANCOUVER_SUN:"vancouver sun",VICTORIA_TIMES_COLONIST:"victoria times colonist",WINDSOR_STAR:"windsor star",DRIVING:"driving.ca",NATIONAL_POST:"national post",FINANCIAL_POST:"financial post",REMEMBERING:"remembering.ca",REMEMBERING_CH:"co-brand - Remembering.ca/Calgary Herald",REMEMBERING_EJ:"co-brand - Remembering.ca/Edmonton Journal",REMEMBERING_VS_VP:"co-brand - Remembering.ca/Vancouver Sun/The Province",REMEMBERING_SSP:"co-brand - Remembering.ca/Saskatoon Star Phoenix",REMEMBERING_RLP:"co-brand - Remembering.ca/Regina Leader-Post",REMEMBERING_OC:"co-brand - Remembering.ca/Ottawa Citizen",REMEMBERING_WS:"co-brand - Remembering.ca/Windsor Star",REMEMBERING_MG:"co-brand - Remembering.ca/Montreal Gazette",REMEMBERING_NP:"co-brand - Remembering.ca/National Post",REMEMBERING_CSUN:"co-brand - Remembering.ca/Calgary Sun",REMEMBERING_ESUN:"co-brand - Remembering.ca/Edmonton Sun",REMEMBERING_OSUN:"co-brand - Remembering.ca/Ottawa Sun",REMEMBERING_TSUN:"co-brand - Remembering.ca/Toronto Sun",REMEMBERING_WSUN:"co-brand - Remembering.ca/Winnipeg Sun",CANOE:"canoe",TORONTO_SUN:"toronto sun",OTTAWA_SUN:"ottawa sun",CALGARY_SUN:"calgary sun",EDMONTON_SUN:"edmonton sun",WINNIPEG_SUN:"winnipeg sun",LONDON_FREE_PRESS:"london free press",YOUR_LIFE_MOMENTS:"your life moments",INTERLAKE_SPECTATOR:"interlake spectator",COLD_LAKE_SUN:"cold lake sun",COUNTY_MARKET:"county market",DAILY_HEARLD_TRIBUNE:"daily herald tribune",DEVON_DISPATCH:"devon dispatch",DRAYTON_VALLEY_WESTERN_REVIEW:"drayton valley western review",EDMONTON_EXAMINER:"edmonton examiner",EDSON_LEADER:"edson leader",FAIRVIEW_POST:"fairview post",FORT_MCMURRAY_TODAY:"fort mcmurray today",FORT_SASKATCHEWAN_RECORD:"fort saskatchewan record",HIGH_RIVER_TIMES:"high river times",HINTON_PARKLANDER:"hinton parklander",BEAUMONT_NEWS:"beaumont news",LACOMBE_GLOBE:"lacombe globe",LEDUC_REPRESENTATIVE:"leduc representative",MELFORT_JOURNAL:"melfort journal",AIRDRIE_ECHO:"airdrie echo",BANFF_CRAG_AND_CANYON:"banff crag and canyon",CAMROSE_CANADIAN:"camrose canadian",PEACE_RIVER_RECORD_GAZETTE:"peace river record gazette",WETASKIWIN_TIMES:"wetaskiwin times",WHITE_COURT_STAR:"white court star",HANNA_HERALD:"hanna herald",MAYERTHORPE_FREELANCER:"mayerthorpe freelancer",NANTON_NEWS:"nanton news",PEACE_COUNTY_SUN:"peace country sun",PINCHER_CREEK_ECHO:"pincher creek echo",SHERWOOD_PARK_NEWS:"sherwood park news",VERMILION_STANDARD:"vermilion standard",VULCAN_ADVOCATE:"vulcan advocate",PEMBINA_TODAY:"pembina today",PORTAGE_DAILY_GRAPHIC:"portage daily graphic",BRANTFORD_EXPOSITOR:"brantford expositor",SUDBURY_STAR:"sudbury star",HANOVER_POST:"hanover post",ELGIN_COUNTY_MARKET:"elgin county market",MIDLAND_FREE_PRESS:"midland free press",CHATHAM_TODAYS_FARMER:"chatham today's farmer",KAPUSKASING_TIMES:"kapuskasing times",NAPANEE_GUIDE:"napanee guide",CHATHAM_DAILY_NEWS:"chatham daily news",CHATHAM_THIS_WEEK:"chatham this week",COCHRANE_TIMES:"cochrane times",COCHRANE_TIMES_POST:"cochrane times post",PICTON_COUNTY_WEEKLY_NEWS:"picton county weekly news",DELHI_NEWS_RECORD:"delhi news record",EXETER_TIMES_ADVOCATE:"exeter times-advocate",EXETER_WEEKENDER:"exeter weekender",GANANOQUE_REPORTER:"gananoque reporter",GODERICH_SIGNAL_STAR:"goderich signal star",GREY_BRUCE_THIS_WEEK:"grey bruce this week",INGERSOLL_TIMES:"ingersoll times",KENORA_DAILY_MINER_AND_NEWS:"kenora daily miner and news",KINCARDINE_NEWS:"kincardine news",KINGSTON_THIS_WEEK:"kingston this week",LAKESHORE_ADVANCE:"lakeshore advance",LUCKNOW_SENTINEL:"lucknow sentinel",ESPANOLA_MIDNORTH_MONITOR:"espanola midnorth monitor",MITCHELL_ADVOCATE:"mitchell advocate",NIPAWIN_JOURNAL:"nipawin journal",NORTH_BAY_NUGGET:"north bay nugget",KIRKLAND_LAKE_NORTHERN_NEWS:"kirkland lake northern news",NORWICH_GAZETTE:"norwich gazette",PETROLIA_TOPIC:"petrolia topic",SARNIA_THIS_WEEK:"sarnia this week",SAULT_STAR:"sault star",SAULT_THIS_WEEK:"sault this week",SEAFORTH_HURON_EXPOSITOR:"seaforth huron expositor",SELKIRK_JOURNAL:"selkirk journal",SHORELINE_BEACON:"shoreline beacon",SIMCOE_REFORMER:"simcoe reformer",SPRUCE_GROVE_EXAMINER:"spruce grove examiner",ST_THOMAS_TIMES_JOURNAL:"st thomas times journal",STONEWALL_ARGUS:"stonewall argus",CORNWALL_STANDARD_FREEHOLDER:"cornwall standard freeholder",TRENTON_COMMUNITY_PRESS:"trenton community press",STONY_PLAIN_REPORTER:"stony plain reporter",STRATFORD_BEACON_HERALD:"stratford beacon herald",STRATHMORE_STANDARD:"strathmore standard",STRATHROY_AGE_DISPATCH:"strathroy age dispatch",PEMBROKE_DAILY_OBSERVER:"pembroke daily observer",ELLIOT_LAKE_STANDARD:"elliot lake standard",BELLEVILLE_INTELLIGENCER:"belleville intelligencer",LONDONER:"londener",SARNIA_OBSERVER:"sarnia observer",OWEN_SOUND_SUN_TIMES:"owen sound sun times",PARIS_STAR:"paris star",BROCKVILLE_RECORDER:"brockville recorder",BROCKVILLE_THIS_WEEK:"brockville this week",TILLSONBURG_NEWS:"tillsonburg news",KINGSTON_WHIG_STANDARD:"kingston whig standard",TIMMINS_DAILY_PRESS:"timmins daily press",TIMMINS_TIMES:"timmins times",TRENTONIAN:"trentonian",WALLACEBURG_COURIER_PRESS:"wallaceburg courier press",WEST_ELGIN_CHRONICLE:"west elgin chronicle (west lorne)",WIARTON_ECHO:"wiarton echo",WOODSTOCK_SENTINEL_REVIEW:"woodstock sentinel review",BIZ_MAGAZINE:"Biz Magazine",CLINTON_NEWS_RECORD:"clinton news-record",FLYER_CITY:"flyer city",WORKING:"working.com",WORKING_CH:"co-brand - Working.com/Calgary Herald",WORKING_EJ:"co-brand - Working.com/Edmonton Journal",WORKING_VS:"co-brand - Working.com/Vancouver Sun",WORKING_VP:"co-brand - Working.com/The Province",WORKING_SSP:"co-brand - Working.com/Saskatoon Star Phoenix",WORKING_RLP:"co-brand - Working.com/Regina Leader-Post",WORKING_OC:"co-brand - Working.com/Ottawa Citizen",WORKING_WS:"co-brand - Working.com/Windsor Star",WORKING_MG:"co-brand - Working.com/Montreal Gazette",WORKING_NP:"co-brand - Working.com/National Post",GROWTH_OP:"growth op",GIFT_GUIDE:"gift guide"};

// Order matters. CoBrands first. Suns before other papers (so broadsheet papers get city name synonyms). Central last. Sites without domain, but have synonyms, are old brands still in use.
Postmedia.Analytics.Sites=[
{"division":null,"brand":null,"vendor":null,"distributor":"Postmedia News","synonyms":[],"description":"Default - Unknown Site","domain":null,"channel":null,"workspace_id":null,"dir_offset":0},
{"division":null,"brand":null,"vendor":"stats inc","distributor":"Stats Inc","synonyms":[],"description":"Stats","domain":"stats.com","channel":"sports","workspace_id":'c31d37235639a246803edbfc90f1b06f',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.VANCOUVER_SUN_AND_THE_PROVINCE,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"vancouversunandprovince.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.PEACE_RIVER_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"northwestab.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.CENTRAL_WEST_AB_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"centralwestab.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.SOUTH_CENTRAL_AB_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"southcentralab.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.HANNA_HERALD,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"southcentraleastab.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.CENTRAL_SOUTH_AB_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"centralsouthab.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.CENTRAL_AB_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"centralab.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.SPRUCE_STONY_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"sprucestony.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.SHERWOOD_FORT_SASK_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"sherwoodfortsask.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.BANFF_COCHRANE_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"banffcochrane.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.VERMILLION_LLOYD_COLDLAKE_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"vermilionlloydcoldlake.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.MELFORT_NIPAWIN_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"melfortnipawin.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.STERLING_TRENTON_PICTON_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"sterlingtrentonpicton.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.NAPANEE_KINGSTON_GANANOQUE_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"napaneekingstongananoque.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.ELLIOT_LAKE_ESPANOLA_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"elliotlakeespanola.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.TIMMINS_COCHRANE_KAPUSKASING_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"cochranekapuskasingtimmins.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.SOUTH_BRUCE_PENINSULA_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"southbrucepeninsula.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.BRANTFORD_PARIS_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"brantfordparis.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.CHATHAM_THIS_WEEK_WALLACEBURG_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"chathamthisweekwallaceburgcourier.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.DELHI_TILSONBURG_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"delhitillsonburg.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.SEAFORTH_CLINTON_GODERICH_LAKESHORE_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"seaforthclintongoderichgbend.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.ST_THOMAS_STRATHROY_WEST_LORNE_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"stthomasstrathroywestlorne.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.INTERLAKE_SELKIRK_STONEWALL_CO_BRAND,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Classifieds Self-serve","domain":"interlaketoday.adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":null,"brand":null,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["arcpages.","pages.wpd"],"description":"Postmedia Pages","domain":"pages.postmedia.com","channel":"pages","workspace_id":null,"dir_offset":1},
{"division":Postmedia.Analytics.DivisionTypes.CORPORATE,"brand":null,"vendor":"postmedia","distributor":"Postmedia News","synonyms":[],"description":"Postmedia Network Inc.","domain":"postmedia.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.OBITUARIES,"brand":null,"vendor":"adperfect","distributor":"Postmedia News","synonyms":[],"description":"yourlifemoments.ca","domain":"yourlifemoments.ca","channel":null,"workspace_id":'07feac70281b374182af850aa8658350',"dir_offset":0},
{"division":null,"brand":null,"vendor":"pressplus","distributor":"PressPlus","synonyms":[],"description":"Paywall Modals","domain":"ui.ppjol.com","channel":"paidcontent","workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.WORKING,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"Working.com","domain":"working.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":null,"vendor":"adperfect","distributor":"adPerfect","synonyms":[],"description":"AdPerfect Self-Serve","domain":"adperfect.com","channel":"classified_self-serve","workspace_id":'6f4a625d7fdae940a849cbbc63cb79c3',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CORPORATE,"brand":Postmedia.Analytics.BrandingTypes.POSTMEDIA,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["integrated-advertising","postmediaadvertising"],"description":"PostMedia Solutions","domain":"postmediasolutions.com","channel":null,"workspace_id":'7ebfd2fcc6fd144ab830d910a3f6ed1c',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.KINGSTON_WHIG_STANDARD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["kingstonwhigstandard","kingston-whig-standard"],"description":"Kingston Whig-Standard","domain":"thewhig.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.INTERLAKE_SPECTATOR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["interlakespectator","theinterlakespectator"],"description":"Selkirk Interlake Spectator","domain":"interlakespectator.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.COLD_LAKE_SUN,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["cold-lake-sun","coldlakesun"],"description":"Cold Lake Sun","domain":"coldlakesun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.COUNTY_MARKET,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["countymarket"],"description":"County Market","domain":"countymarket.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.DAILY_HEARLD_TRIBUNE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["grand-prairie-daily-herald-tribune","dailyheraldtribune"],"description":"Grand Prairie Daily Herald Tribune","domain":"dailyheraldtribune.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.DEVON_DISPATCH,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["devon-dispatch-news","devondispatch"],"description":"Devon Dispatch News","domain":"devondispatch.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.DRAYTON_VALLEY_WESTERN_REVIEW,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["drayton-valley-western-review","draytonvalleywesternreview"],"description":"Drayton Valley Western Review","domain":"draytonvalleywesternreview.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.EDMONTON_EXAMINER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["edmonton-examiner","edmontonexaminer"],"description":"Edmonton Examiner","domain":"edmontonexaminer.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.EDSON_LEADER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["edson-leader","edsonleader"],"description":"Edson Leader","domain":"edsonleader.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.FAIRVIEW_POST,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["fairview-post","fairviewpost"],"description":"Fairview Post","domain":"fairviewpost.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.FORT_MCMURRAY_TODAY,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["fortmcmurraytoday","fort-mcmurray-today"],"description":"Fort McMurray Today","domain":"fortmcmurraytoday.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.FORT_SASKATCHEWAN_RECORD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["fort-saskatchewan-record","fortsaskatchewanrecord"],"description":"Fort Saskatchewan Record","domain":"fortsaskatchewanrecord.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.HIGH_RIVER_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["high-river-times","highrivertimes"],"description":"High River Times","domain":"highrivertimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.HINTON_PARKLANDER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["hinton-parklander","hintonparklander"],"description":"Hinton Parklander","domain":"hintonparklander.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.BEAUMONT_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["beaumont-news","thebeaumontnews"],"description":"Beaumont News","domain":"thebeaumontnews.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.LACOMBE_GLOBE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["lacombe-globe","lacombeglobe"],"description":"Lacombe Globe","domain":"lacombeglobe.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.LEDUC_REPRESENTATIVE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["leduc-representative","leducrep"],"description":"Leduc Representative","domain":"leducrep.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.MELFORT_JOURNAL,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["melfort-journal","melfortjournal"],"description":"Melfort Journal","domain":"melfortjournal.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.AIRDRIE_ECHO,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["airdrie-echo","airdrieecho"],"description":"The Airdrie Echo","domain":"airdrieecho.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.BANFF_CRAG_AND_CANYON,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["bow-valley-crag-canyon","thecragandcanyon"],"description":"The Banff Crag & Canyon","domain":"thecragandcanyon.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.CAMROSE_CANADIAN,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["camrose-canadian","camrosecanadian"],"description":"The Camrose Canadian","domain":"camrosecanadian.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PEACE_RIVER_RECORD_GAZETTE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["peace-river-record-gazette","prrecordgazette"],"description":"The Record Gazette","domain":"prrecordgazette.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.WETASKIWIN_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["wetaskiwin-times","wetaskiwintimes"],"description":"Wetaskiwin Times","domain":"wetaskiwintimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.WHITE_COURT_STAR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["whitecourt-star","whitecourtstar"],"description":"Whitecourt Star","domain":"whitecourtstar.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.HANNA_HERALD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["hanna-herald","hannaherald"],"description":"Hanna Herald","domain":"hannaherald.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.MAYERTHORPE_FREELANCER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["mayerthorpe-freelancer","mayerthorpefreelancer"],"description":"Mayerthorpe Freelancer","domain":"mayerthorpefreelancer.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.NANTON_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["nanton-news","nantonnews"],"description":"Nanton News","domain":"nantonnews.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PEACE_COUNTY_SUN,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["peace-country-sun","peacecountrysun"],"description":"Peace Country Sun","domain":"peacecountrysun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PINCHER_CREEK_ECHO,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["southab","pincher-creek-echo","pinchercreekecho"],"description":"Pincher Creek Echo","domain":"pinchercreekecho.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SHERWOOD_PARK_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["sherwood-park-news","sherwoodparknews"],"description":"Sherwood Park News","domain":"sherwoodparknews.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.VERMILION_STANDARD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["vermilion-standard","vermilionstandard"],"description":"Vermilion Standard","domain":"vermilionstandard.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.VULCAN_ADVOCATE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["vulcan-advocate","vulcanadvocate"],"description":"Vulcan Advocate","domain":"vulcanadvocate.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PEMBINA_TODAY,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["pembinatoday","pembina-today"],"description":"Pembina Today","domain":"pembinatoday.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PORTAGE_DAILY_GRAPHIC,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["portagedaily","portage-daily-graphic","portagedailygraphic","thegraphicleader"],"description":"The Portage Daily Graphic","domain":"thegraphicleader.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.BRANTFORD_EXPOSITOR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["brantford-expositor","brantfordexpositor"],"description":"Brantford Expositor","domain":"brantfordexpositor.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SUDBURY_STAR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["sudburystar","sudburyelliotlake","sudbury-star","thesudburystar"],"description":"The Sudbury Star","domain":"thesudburystar.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.CHATHAM_TODAYS_FARMER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["todays-farmer","todaysfarmer"],"description":"Todays Farmer","domain":"todaysfarmer.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.KAPUSKASING_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["kapuskasing-times","kapuskasingtimes"],"description":"Kapuskasing Times","domain":"kapuskasingtimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.NAPANEE_GUIDE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["napanee-guide","napaneeguide"],"description":"The Napanee Guide","domain":"napaneeguide.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.CHATHAM_DAILY_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["chathamdailynews","chathamwallaceburg","chatham-daily-news"],"description":"Chatham Daily News","domain":"chathamdailynews.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.CHATHAM_THIS_WEEK,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["chatham-this-week","chathamthisweek"],"description":"Chatham This Week","domain":"chathamthisweek.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.CLINTON_NEWS_RECORD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["clinton-news-record","clintonnewsrecord"],"description":"Clinton News-Record","domain":"clintonnewsrecord.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.COCHRANE_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["cochrane-times","cochranetimes"],"description":"Cochrane Times (West)","domain":"cochranetimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.COCHRANE_TIMES_POST,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["cochrane-times-post","cochranetimespost"],"description":"Cochrane Times-Post (Central)","domain":"cochranetimespost.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PICTON_COUNTY_WEEKLY_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["county-weekly-news","countyweeklynews"],"description":"County Weekly News","domain":"countyweeklynews.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.DELHI_NEWS_RECORD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["delhi-news-record","delhinewsrecord"],"description":"Delhi News Record","domain":"delhinewsrecord.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.GANANOQUE_REPORTER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["gananoque-reporter","gananoquereporter"],"description":"Gananoque Reporter","domain":"gananoquereporter.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.GODERICH_SIGNAL_STAR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["goderich-signal-star","goderichsignalstar"],"description":"Goderich Signal Star","domain":"goderichsignalstar.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.GREY_BRUCE_THIS_WEEK,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["grey-bruce-this-week","greybrucethisweek"],"description":"Grey Bruce This Week","domain":"greybrucethisweek.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.HANOVER_POST,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["hanover-post"],"description":"Hanover Post","domain":"thepost.on.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.INGERSOLL_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["ingersoll-times","ingersolltimes"],"description":"Ingersoll Times","domain":"ingersolltimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.KENORA_DAILY_MINER_AND_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["kenoradaily","kenora-daily-miner-and-news","kenoradailyminerandnews"],"description":"Kenora Daily Miner And News","domain":"kenoradailyminerandnews.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.KINCARDINE_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["kincardine-news","kincardinenews"],"description":"Kincardine News","domain":"kincardinenews.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.KINGSTON_THIS_WEEK,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["kingston-this-week","kingstonthisweek"],"description":"Kingston This Week","domain":"kingstonthisweek.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.LAKESHORE_ADVANCE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["lakeshore-advance","lakeshoreadvance"],"description":"Lakeshore Advance","domain":"lakeshoreadvance.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.LUCKNOW_SENTINEL,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["lucknow-sentinel","lucknowsentinel"],"description":"Lucknow Sentinel","domain":"lucknowsentinel.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.ESPANOLA_MIDNORTH_MONITOR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["espanola-mid-north-monitor","midnorthmonitor"],"description":"Espanola Midnorth Monitor","domain":"midnorthmonitor.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.MITCHELL_ADVOCATE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["mitchelladvocate","mitchell-advocate"],"description":"Mitchell Advocate","domain":"mitchelladvocate.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.NIPAWIN_JOURNAL,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["nipawin-journal","nipawinjournal"],"description":"Nipawin Journal","domain":"nipawinjournal.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.NORTH_BAY_NUGGET,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["nugget","north-bay-nugget","northbaynugget"],"description":"North Bay Nugget","domain":"northbaynugget.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.KIRKLAND_LAKE_NORTHERN_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["kirklandlakenorthernnews","northernontario","kirkland-lake-northern-news","northernnews"],"description":"Kirkland Lake Northern News","domain":"northernnews.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.NORWICH_GAZETTE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["norwich-gazette","norwichgazette"],"description":"Norwich Gazette","domain":"norwichgazette.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PETROLIA_TOPIC,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["petrolia-topic","petroliatopic"],"description":"Petrolia Topic","domain":"petroliatopic.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SARNIA_THIS_WEEK,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["sarnia-this-week","sarniathisweekpetroliatopic","sarniathisweek"],"description":"Sarnia & Lambton County This Week","domain":"sarniathisweek.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SAULT_STAR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["saultstar","sault-star","saultstar"],"description":"Sault Star","domain":"saultstar.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SAULT_THIS_WEEK,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["saultthisweek","sault-this-week","saultthisweek"],"description":"Sault Ste. Marie This Week","domain":"saultthisweek.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SEAFORTH_HURON_EXPOSITOR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["seaforth-huron-expositor","seaforthhuronexpositor"],"description":"Seaforth Huron Expositor","domain":"seaforthhuronexpositor.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SELKIRK_JOURNAL,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["selkirk-journal","selkirkjournal"],"description":"Selkirk Journal","domain":"selkirkjournal.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SHORELINE_BEACON,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["shoreline-beacon","shorelinebeacon"],"description":"Shoreline Beacon","domain":"shorelinebeacon.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SIMCOE_REFORMER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["simcoe","simcoe-reformer","simcoereformer"],"description":"Simcoe Reformer","domain":"simcoereformer.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SPRUCE_GROVE_EXAMINER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["spruce-grove-examiner","sprucegroveexaminer"],"description":"Spruce Grove Examiner","domain":"sprucegroveexaminer.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.ST_THOMAS_TIMES_JOURNAL,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["st-thomas-times-journal","stthomastimesjournal"],"description":"St.Thomas Times Journal","domain":"stthomastimesjournal.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.STONEWALL_ARGUS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["stonewall-argus","stonewallargusteulontimes"],"description":"Stonewall Argus and Teulon Times","domain":"stonewallargusteulontimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.CORNWALL_STANDARD_FREEHOLDER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["cornwallstandard","cornwall-standard-freeholder"],"description":"Standard-Freeholder","domain":"standard-freeholder.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.TRENTON_COMMUNITY_PRESS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["community-press","communitypress"],"description":"Trenton Community Press","domain":"communitypress.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.STONY_PLAIN_REPORTER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["stony-plain-reporter","stonyplainreporter"],"description":"Stony Plain Reporter","domain":"stonyplainreporter.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.STRATFORD_BEACON_HERALD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["stratford","stratford-beacon-herald","stratfordbeaconherald"],"description":"Stratford Beacon Herald","domain":"stratfordbeaconherald.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.STRATHMORE_STANDARD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["strathmore-standard","strathmorestandard"],"description":"Strathmore Standard","domain":"strathmorestandard.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.STRATHROY_AGE_DISPATCH,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["strathroy-age-dispatch","strathroyagedispatch"],"description":"Strathroy Age Dispatch","domain":"strathroyagedispatch.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PEMBROKE_DAILY_OBSERVER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["thedailyobserver","pembroke-daily-observer","pembrokeobserver"],"description":"The Pembroke Daily Observer","domain":"pembrokeobserver.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.ELLIOT_LAKE_STANDARD,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["elliot-lake-standard","elliotlakestandard"],"description":"The Elliot Lake Standard","domain":"elliotlakestandard.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.BELLEVILLE_INTELLIGENCER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["bellevilleintelligencer","trentonbellevilleprinceedward","belleville-intelligencer","intelligencer"],"description":"The Intelligencer","domain":"intelligencer.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.LONDONER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["thelondoner","the-londoner"],"description":"The Londoner","domain":"thelondoner.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.SARNIA_OBSERVER,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["sarniaobserver","sarniapetrolia","sarnia-observer","theobserver"],"description":"The Observer","domain":"theobserver.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.OWEN_SOUND_SUN_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["owensoundsuntimes","owen-sound-sun-times"],"description":"The Owen Sound Sun Times","domain":"owensoundsuntimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.PARIS_STAR,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["paris-star","parisstaronline"],"description":"The Paris Star","domain":"parisstaronline.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.BROCKVILLE_RECORDER,"vendor":"postmedia","synonyms":["brockvillerecorderandtimes","brockvilletimesprescottweek","brockville-recorder-times","recorder"],"description":"The Recorder","domain":"recorder.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.TILLSONBURG_NEWS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["tillsonburg-news","tillsonburgnews"],"description":"The Tillsonburg News","domain":"tillsonburgnews.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.TIMMINS_DAILY_PRESS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["timminsdailypress","timmins-daily-press","timminspress"],"description":"Timmins Daily Press","domain":"timminspress.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.TIMMINS_TIMES,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["timmins-times","timminstimes"],"description":"Timmins Times","domain":"timminstimes.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.TRENTONIAN,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["trenton-trentonian","trentonian"],"description":"Trentonian","domain":"trentonian.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.WALLACEBURG_COURIER_PRESS,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["wallaceburg-courier-press","wallaceburgcourierpress"],"description":"Wallaceburg Courier Press","domain":"wallaceburgcourierpress.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.WEST_ELGIN_CHRONICLE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["west-elgin-chronicle"],"description":"West Elgin Chronicle","domain":"thechronicle-online.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.WIARTON_ECHO,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["wiarton-echo","wiartonecho"],"description":"Wiarton Echo","domain":"wiartonecho.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.COMMUNITIES,"brand":Postmedia.Analytics.BrandingTypes.WOODSTOCK_SENTINEL_REVIEW,"vendor":"postmedia","distributor":"Postmedia News","synonyms":["woodstocksentinelreview","ingersollnorwichwoodstockoxford","woodstock-sentinel-review","ingersollnorwichoxford"],"description":"Woodstock Sentinel Review","domain":"woodstocksentinelreview.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":null,"vendor":"flipp","distributor":"Flipp","synonyms":[],"description":"FlyerCity.ca","domain":"flyercity.ca","channel":null,"workspace_id":null,"dir_offset":0,"hash_pv":true},
{"division":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS,"brand":Postmedia.Analytics.BrandingTypes.VANCOUVER_SUN_THE_PROVINCE_HOURS,"vendor":"shopify","distributor":"Postmedia News","synonyms":["likeitbuyitvancouver"],"description":"Like It Buy It - Vancouver","domain":"likeitbuyitvancouver.com","channel":null,"workspace_id":'7ebfd2fcc6fd144ab830d910a3f6ed1c',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CENTRAL,"brand":Postmedia.Analytics.BrandingTypes.GIFT_GUIDE,"vendor":"postmedia","distributor":"Postmedia News","synonyms":[],"description":"Gift Guide","domain":"thegiftguide.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.VANCOUVER_SUN,"vendor":"postmedia","distributor":"Postmedia News","synonyms":[],"description":"Vancouver Sun Kids Fund","domain":"vansunkidsfund.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.OBITUARIES,"brand":Postmedia.Analytics.BrandingTypes.REMEMBERING,"vendor":"adperfect","distributor":"AdPerfect","synonyms":["remembering"],"description":"Remembering.ca","domain":"remembering.ca","channel":null,"workspace_id":'07feac70281b374182af850aa8658350',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.FINANCIAL_POST,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["financialpost","financial-post"],"description":"Financial Post","domain":"financialpost.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.NATIONAL_POST,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["nationalpost","national-post"],"description":"National Post","domain":"nationalpost.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.TABLOID,"brand":Postmedia.Analytics.BrandingTypes.CALGARY_SUN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["calgarysun","calgary-sun"],"description":"Calgary Sun","domain":"calgarysun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.TABLOID,"brand":Postmedia.Analytics.BrandingTypes.EDMONTON_SUN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["edmontonsun","edmonton-sun"],"description":"Edmonton Sun","domain":"edmontonsun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.TABLOID,"brand":Postmedia.Analytics.BrandingTypes.OTTAWA_SUN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["ottawasun","ottawa-sun"],"description":"Ottawa Sun","domain":"ottawasun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.TABLOID,"brand":Postmedia.Analytics.BrandingTypes.TORONTO_SUN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["torontosun","toronto-sun"],"description":"Toronto Sun","domain":"torontosun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.TABLOID,"brand":Postmedia.Analytics.BrandingTypes.WINNIPEG_SUN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["winnipegsun","winnipeg-sun"],"description":"Winnipeg Sun","domain":"winnipegsun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.CALGARY_HERALD,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["calgary"],"description":"Calgary Herald","domain":"calgaryherald.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.EDMONTON_JOURNAL,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["edmonton"],"description":"Edmonton Journal","domain":"edmontonjournal.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.LONDON_FREE_PRESS,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["london","london-free-press"],"description":"London Free Press","domain":"lfpress.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.MONTREAL_GAZETTE,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["montreal"],"description":"Montreal Gazette","domain":"montrealgazette.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.OTTAWA_CITIZEN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["ottawa"],"description":"Ottawa Citizen","domain":"ottawacitizen.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.REGINA_LEADERPOST,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["regina","leaderpost"],"description":"Leader Post","domain":"leaderpost.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.SASKATOON_STAR_PHOENIX,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["saskatoon","starphoenix"],"description":"The Star Phoenix","domain":"thestarphoenix.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.TABLOID,"brand":Postmedia.Analytics.BrandingTypes.THE_PROVINCE,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["province"],"description":"The Province","domain":"theprovince.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.VANCOUVER_SUN,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["vancouver"],"description":"Vancouver Sun","domain":"vancouversun.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.BROADSHEET,"brand":Postmedia.Analytics.BrandingTypes.WINDSOR_STAR,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["windsor"],"description":"Windsor Star","domain":"windsorstar.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.AUTOS,"brand":Postmedia.Analytics.BrandingTypes.DRIVING,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["driving"],"description":"Driving","domain":"driving.ca","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CENTRAL,"brand":Postmedia.Analytics.BrandingTypes.GROWTH_OP,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["thegrowthop"],"description":"Growth Op","domain":"thegrowthop.com","channel":null,"workspace_id":'7ebfd2fcc6fd144ab830d910a3f6ed1c',"dir_offset":0},
{"division":null,"brand":null,"vendor":"hootsuite","distributor":"Postmedia News","synonyms":[],"description":"Hootsuite Contests","domain":"hscampaigns.com","channel":'contests',"workspace_id":'e21149b06fb1984a9e4c8aabc7821bbe',"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CENTRAL,"brand":Postmedia.Analytics.BrandingTypes.CANOE,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["canoe"],"description":"CANOE","domain":"canoe.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.CENTRAL,"brand":Postmedia.Analytics.BrandingTypes.CANADA,"vendor":"postmedia vip","distributor":"Postmedia News","synonyms":["canada"],"description":"Canada.com","domain":"o.canada.com","channel":null,"workspace_id":null,"dir_offset":0},
{"division":Postmedia.Analytics.DivisionTypes.UNKNOWN,"brand":Postmedia.Analytics.BrandingTypes.UNKNOWN,"vendor":"piano","distributor":"Postmedia News","synonyms":[],"description":"Piano Vendor - including it to keep visits down on click tracking","domain":"tinypass.com","channel":null,"workspace_id":null,"dir_offset":0}];

// Exceptions in the logic. These override anything set from "Sites". Exceptions look at host or href.
Postmedia.Analytics.Exceptions = {};
Postmedia.Analytics.Exceptions.PageName = [{"searchValue":"fbia.","value":"FBIA"}];//Older FBIA pages. New ones have proper domains/paths.
Postmedia.Analytics.Exceptions.Category = [{"searchValue":"classifieds.","value":"classifieds"},{"searchValue":"fbia.","value":"FBIA"},{"searchValue":"newsstand.","value":"virtualpaper"},{"searchValue":"realestate.","value":"realestate"},{"searchValue":"scores.","value":"sports"},{"searchValue":"virtual.","value":"virtualpaper"},{"searchValue":"special.","value":"special"},{"searchValue":"chealth.","value":"health"},{"searchValue":"bodyandhealth.","value":"health"}];
Postmedia.Analytics.Exceptions.DirectoryOffset = [{"searchValue":"classifieds.","value":1}];
Postmedia.Analytics.Exceptions.DirectoryVars = [{"searchValue":"classifieds.","value":"classifieds"},{"searchValue":"realestate.","value":"realestate"},{"searchValue":"scores.","value":"sports"},{"searchValue":"special.","value":"special"}];// Often same as channel exception
Postmedia.Analytics.Exceptions.Vendor = [{"searchValue":"classifieds.","value":"adperfect"},{"searchValue":"flyercity.","value":"flipp"},{"searchValue":"newsstand.","value":"virtual paper"},{"searchValue":"realestate.","value":"adperfect"},{"searchValue":"scores.","value":"stats"},{"searchValue":"local.","value":"ownlocal"},{"searchValue":"shopping.calgarysun.com","value":"print2web"},{"searchValue":"shopping.edmontonsun.com","value":"print2web"},{"searchValue":"shopping.ottawasun.com","value":"print2web"},{"searchValue":"shopping.torontosun.com","value":"print2web"},{"searchValue":"shopping.winnipegsun.com","value":"print2web"},{"searchValue":"shopping.","value":"wehaa"},{"searchValue":"virtual.","value":"virtual paper"},{"searchValue":"chealth.","value":"mediresource"},{"searchValue":"bodyandhealth.","value":"mediresource"}];
Postmedia.Analytics.Exceptions.Distributor = [{"searchValue":"classifieds.","value":"adPerfect"},{"searchValue":"flyercity.","value":"Flipp"},{"searchValue":"realestate.","value":"adPerfect"},{"searchValue":"scores.","value":"Stats Inc"},{"searchValue":"local.","value":"OwnLocal"},{"searchValue":"shopping.calgarysun.com","value":"Print2Web"},{"searchValue":"shopping.edmontonsun.com","value":"Print2Web"},{"searchValue":"shopping.ottawasun.com","value":"Print2Web"},{"searchValue":"shopping.torontosun.com","value":"Print2Web"},{"searchValue":"shopping.winnipegsun.com","value":"Print2Web"},{"searchValue":"shopping.","value":"WeHaa"},{"searchValue":"chealth.","value":"MediResource"},{"searchValue":"bodyandhealth.","value":"MediResource"}];
Postmedia.Analytics.Exceptions.Division = [{"searchValue":"classifieds.","value":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS},{"searchValue":"flyercity.","value":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS},{"searchValue":"realestate.","value":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS},{"searchValue":"shopping.","value":Postmedia.Analytics.DivisionTypes.CLASSIFIEDS}];
Postmedia.Analytics.Exceptions.Brand = [{"searchValue":"working.com/calgary","value":Postmedia.Analytics.BrandingTypes.WORKING_CH},{"searchValue":"working.com/edmonton","value":Postmedia.Analytics.BrandingTypes.WORKING_EJ},{"searchValue":"working.com/montreal","value":Postmedia.Analytics.BrandingTypes.WORKING_MG},{"searchValue":"working.com/ottawa","value":Postmedia.Analytics.BrandingTypes.WORKING_OC},{"searchValue":"working.com/regina","value":Postmedia.Analytics.BrandingTypes.WORKING_RLP},{"searchValue":"working.com/saskatoon","value":Postmedia.Analytics.BrandingTypes.WORKING_SSP},{"searchValue":"working.com/toronto","value":Postmedia.Analytics.BrandingTypes.WORKING_NP},{"searchValue":"working.com/vancouver","value":Postmedia.Analytics.BrandingTypes.WORKING_VS},{"searchValue":"working.com/windsor","value":Postmedia.Analytics.BrandingTypes.WORKING_WS},{"searchValue":"p=fc",value:Postmedia.Analytics.BrandingTypes.FLYER_CITY},{"searchValue":"calgaryherald.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_CH},{"searchValue":"edmontonjournal.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_EJ},{"searchValue":"montrealgazette.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_MG},{"searchValue":"ottawacitizen.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_OC},{"searchValue":"leaderpost.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_RLP},{"searchValue":"thestarphoenix.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_SSP},{"searchValue":"nationalpost.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_NP},{"searchValue":"vancouversunandprovince.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_VS_VP},{"searchValue":"windsorstar.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_WS},{"searchValue":"calgarysun.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_CSUN},{"searchValue":"edmontonsun.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_ESUN},{"searchValue":"ottawasun.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_OSUN},{"searchValue":"torontosun.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_TSUN},{"searchValue":"winnipegsun.remembering.ca","value":Postmedia.Analytics.BrandingTypes.REMEMBERING_WSUN}];
Postmedia.Analytics.Exceptions.MarkUpLang = [{"searchValue":"fbia.","value":"FBIA"}];
Postmedia.Analytics.Exceptions.HashPV = [{"searchValue":"flyercity.","value":true}];

// End Configuration

// START Define Postmedia.Analytics.SiteObj
if (!Postmedia.Analytics.URL) {
    try{
        Postmedia.Analytics.URL = new URL(window.location);
    } catch (e) {
        Postmedia.Analytics.URL = {hash:window.location.hash,host:window.location.host,hostname:window.location.hostname,href:window.location.href,origin:window.location.origin,pathname:window.location.pathname,port:window.location.port,protocol:window.location.protocol,search:window.location.search}
    }
}

var mySiteID = 0;
Postmedia.Analytics.InternalDomains = [];
for (siteId in Postmedia.Analytics.Sites) {
    if (Postmedia.Analytics.Sites[siteId].domain != null && Postmedia.Analytics.Sites[siteId].domain != '') {
        Postmedia.Analytics.InternalDomains.push(Postmedia.Analytics.Sites[siteId].domain);
        if (mySiteID == 0 && Postmedia.Analytics.URL.host.indexOf(Postmedia.Analytics.Sites[siteId].domain) != -1) mySiteID = siteId;
    }
}
Postmedia.Analytics.SiteObj = Postmedia.Analytics.Sites[mySiteID];
// END Define Postmedia.Analytics.SiteObj

// Now that SiteObj created, update URL if looking at hash for variable values. Set Postmedia.Analytics.SiteObj.hash_pv. (FlyerCity)
for (exception in Postmedia.Analytics.Exceptions.HashPV) {
    if (Postmedia.Analytics.URL.href.indexOf(Postmedia.Analytics.Exceptions.HashPV[exception].searchValue) > -1) {Postmedia.Analytics.SiteObj.hash_pv = Postmedia.Analytics.Exceptions.HashPV[exception].value; break;}
}

Postmedia.Analytics.URLInHash = function() { // Can't use Postmedia.Analytics.URL. Must use window.location.
    var tempurl = window.location.protocol+'//'+window.location.hostname+window.location.hash.replace('!','').replace('#','');
    if (window.location.search.replace('?','') != '') {
        var tempchar = '?';
        if (tempurl.indexOf('?') > -1) tempchar = '&';
        tempurl = tempurl+tempchar+window.location.search.replace('?','')
    }
    Postmedia.Analytics.URL = new URL(tempurl);
}
if (Postmedia.Analytics.SiteObj.hash_pv) Postmedia.Analytics.URLInHash();

// Set mParticle Workspace Id
Postmedia.Audience.mParticleID = ( Postmedia.Analytics.SiteObj.workspace_id ) ? Postmedia.Analytics.SiteObj.workspace_id : 'cd4afed6a2719d439af431746c942e3c';

// Meta Tag Content
Postmedia.Properties.MetaContent = {};
var metas = document.getElementsByTagName('meta');
for (var i=0; i<metas.length; i++) {
    if (metas[i].name != '') Postmedia.Properties.MetaContent[metas[i].name.toLowerCase()] = metas[i].content.toLowerCase();
}

/* START Set Helper Functions */

// Querystring
Postmedia.Properties.getQueryString = function(qs){;
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, ' ')); },
        query  = (qs != null && qs != '') ? qs : Postmedia.Analytics.URL.search.substring(1);

    var qsParams = {};
    while (match = search.exec(query))
       qsParams[decode(match[1])] = decode(match[2]);
    return qsParams;
};

Postmedia.Properties.QueryString = Postmedia.Properties.getQueryString();
try {
    Postmedia.Properties.QueryStringTopWindow = Postmedia.Properties.getQueryString(window.top.location.search.substring(1)); // Case where analytics code in iframe, need campaign id in top frame.
} catch(e) {
    Postmedia.Properties.QueryStringTopWindow = Postmedia.Properties.getQueryString();
}

Postmedia.Analytics.Time={};
Postmedia.Analytics.Time.infoParser=function() {
    var dst={2017:'3/12,11/5',2018:'3/11,11/4',2019:'3/10,11/3',2020:'3/8,11/1'}; //US settings
    var zone = -5;
    var od=new Date('1/1/2000');
    if(od.getDay()!=6 || od.getMonth()!=0){
        return'Data Not Available';
    } else {
        var hour,minutes,day,mid,ds,de,tm,da=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],theDate=new Date();
        var dso=dst[theDate.getFullYear()].split(/,/);
        ds=new Date(dso[0]+'/'+theDate.getFullYear());
        de=new Date(dso[1]+'/'+theDate.getFullYear());
        if(theDate>ds&&theDate<de) //northern hemisphere.
            zone=zone+1;
        theDate=theDate.getTime()+(theDate.getTimezoneOffset()*60000);
        theDate=new Date(theDate+(3600000*zone));
        hour=theDate.getHours();
        minutes=theDate.getMinutes();
        minutes=(minutes<10)?'0'+minutes:minutes;
        day=theDate.getDay();
        mid=' AM';
        if(hour>=12) {mid=' PM';hour=hour-12;}
        if(hour==0) {hour=12;}
        day=da[day];
        tm=hour+':'+minutes+mid;
        return(tm+'|'+day);
    }
}

// https://stackoverflow.com/questions/2387136/cross-browser-method-to-determine-vertical-scroll-percentage-in-javascript
Postmedia.Analytics.getPercentPageViewed=function() {
    function _get_window_height() {
        return window.innerHeight ||
               document.documentElement.clientHeight ||
               document.body.clientHeight || 0;
    }
    function _get_window_Yscroll() {
        return window.pageYOffset ||
               document.body.scrollTop ||
               document.documentElement.scrollTop || 0;
    }
    function _get_doc_height() {
        return Math.max(
            document.body.scrollHeight || 0,
            document.documentElement.scrollHeight || 0,
            document.body.offsetHeight || 0,
            document.documentElement.offsetHeight || 0,
            document.body.clientHeight || 0,
            document.documentElement.clientHeight || 0
        );
    }
    return (Math.round((_get_window_Yscroll() + _get_window_height()) / _get_doc_height()) * 100);
}

/* END Set Helper Functions */

/* START Set Analytics Functions */

// Custom Link Tracking
Postmedia.Analytics.CustomLink=function(name,propArr,evarArr,eventArr,mParticleData) {
    //propArr,evarArr,eventArr are depreciated. They were arrays and part of Adobe Analytics.
    // Future proof - will start using 2 parmameters instead of 5.
    mParticleData = mParticleData || {};
    if (typeof arguments[1] == 'object' && !Array.isArray(arguments[1]) &&  mParticleData == {})
        mParticleData = arguments[1];
    Postmedia.Audience.logEvent(name, Postmedia.Audience.EventType.Other, mParticleData);
}

// Modal Screens (eg Paywall)
Postmedia.Analytics.ModelScreen=function(vendor,name,prod,pur) {
    try {
        if(arguments.length < 2) throw "Not Enough Parameters";
        if (typeof vendor === 'string') vendor.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); else throw "'vendor' is required and needs to be a string.";
        if (typeof name === 'string') name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); else throw "'name' is required and needs to be a string.";
        var prodStr="";
        if (typeof prod === 'undefined') prod=[];
        else if (!Array.isArray(prod)) throw "'prod' is an optional param that needs to be an array.";
        else {
            var prodTemp=new Array();
            for (var i=0;i < prod.length; i++){
                if (typeof prod[i].product === 'undefined' || typeof prod[i].quantity === 'undefined' || typeof prod[i].price === 'undefined') throw "Each item in 'prod' array must be a JSON obj: {'product':'','quantity':'','price':''}.";
                prodTemp[i]="Subscriptions;"+prod[i].product+";"+prod[i].quantity+";"+prod[i].price+";;"
            }
            var prodStr=prodTemp.join();
        }
        if (typeof pur === 'undefined') pur=""; else if (typeof pur !== 'string') throw "'pur' is an optional param that needs to be a string.";
        switch(name) {
            case "Meter Authorization":
                Postmedia.Audience.logEvent("View Subscribe Module (PAYWALL)", Postmedia.Audience.EventType.Other,{}, { "Google.NonInteraction" : true });
            case "Signin Meter Login": //2.1 - Self-Sign In
                Postmedia.Audience.logEvent("View Registration/Sign In Module", Postmedia.Audience.EventType.UserPreference,{
                    "Registration/Sign In Module Trigger": "Self-Sign In",
                });
                break;
            case "Signin Comments Login": // Comments Sign In
                Postmedia.Audience.logEvent("View Registration/Sign In Module", Postmedia.Audience.EventType.UserPreference,{
                    "Registration/Sign In Module Trigger": "Comment",
                });
                commentsOverride = '';
                break;
            case "Login Success":
                break;
            case "Email Verification Required":
                Postmedia.Audience.logEvent("View Verification Request Screen", Postmedia.Audience.EventType.UserPreference,{}, { "Google.NonInteraction" : true });
                Postmedia.Audience.logEvent("View Registration Thank You Screen", Postmedia.Audience.EventType.UserPreference,{}, { "Google.NonInteraction" : true });
                break;
            case "Social Registration Meter Account Creation":
                break;
            case "Traditional Registration Meter Account Creation":
                Postmedia.Audience.logEvent("View Registration/Sign In Module", Postmedia.Audience.EventType.UserPreference,{
                    "Registration/Sign In Module Trigger": "Self-Create Account",
                });

                // Add listener for when user clicks on submit
                var traditionalRegistrationSubmitForm = document.getElementById('capture_traditionalRegistration_registrationForm');

                if (traditionalRegistrationSubmitForm) {
                    traditionalRegistrationSubmitForm.addEventListener("submit", function() {
                        Postmedia.Audience.logEvent("New Registration", Postmedia.Audience.EventType.UserPreference,{});
                    });
                }
                break;
            case "Email Notification Meter Purchase Summary":
                break;
            case "Meter Expired":
                break;
            case "Midas Letter Trial": // Piano
                break;
            case "Meter Plan Options": // Piano - Paywall Limit Reached
                Postmedia.Audience.logEvent("View Registration/Sign In Module", Postmedia.Audience.EventType.UserPreference,{
                    "Registration/Sign In Module Trigger": "Paywall Limit Reached",
                }, { "Google.NonInteraction" : true });
                break;
            // NOT SEEN IN REPORTS
            /*case "Meter Purchase Summary": // Piano
                s.linkTrackVars=s.linkTrackVars+',events,products,purchaseID,eVar18';
                s.linkTrackEvents='event28,Purchase';
                s.events='event28,prodView';
                s.eVar18='Digital Access Subscription';
                s.products=prodStr;
                s.purchaseID=pur;
                break;*/
            case "Checkout Complete": // Piano
                break;
        }
    } catch(err) {
        console.error("Postmedia.Analytics.ModelScreen -", err);
    }
}

// Navigation interaction - navigation location, link name
Postmedia.Analytics.NavigationLink=function(nav,link_name) {
    try {
        if (arguments.length < 2) throw "Not Enough Parameters";
        if (nav.length < 2) throw "Not Enough Parameters - Navigation is missing";
        if (link_name.length < 2) throw "Not Enough Parameters - Link name is missing";
        if (typeof nav === 'string') nav=nav.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}); else throw "'nav' is required and needs to be a string.";
        if (typeof link_name === 'string') link_name=link_name.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});  else throw "'link_name' is required and needs to be a string.";
        Postmedia.Audience.logEvent("Navigation Click", Postmedia.Audience.EventType.Navigation, {
            "Brand": Postmedia.Analytics.Brand,
            "Navigation Location" : nav,
            "Name" : link_name
        } );
    } catch(err) {
        console.log("Postmedia.Analytics.NavigationLink -", err);
    }
}

// Newsletters
// Set on Thank you page. LEGO handles this server-side.
Postmedia.Analytics.NewsletterSignup=function(nl) {
    nl=typeof nl == 'string' ? [nl] : nl;
    nl=nl instanceof Array ? nl : [];
    Postmedia.Audience.logEvent("Newsletter/Alert Sign Up", mParticle.EventType.UserPreference, {
        "Newsletters": nl.join('|')
    });
}

// Types of Social Media interaction
Postmedia.Analytics.SocialTypes={FACEBOOK_LIKE:"Facebook Like",GOOGLE_LIKE:"Google+ +1",FACEBOOK_FOLLOW:"Facebook Follow",GOOGLE_FOLLOW:"Google+ Follow",PINEREST_FOLLOW:"Pinterest Follow",INSTAGRAM_FOLLOW:"Instagram Follow",TWITTER_FOLLOW:"Twitter Follow",YOUTUBE_FOLLOW:"Youtube Follow",EMAIL:"Email A Friend",FACEBOOK_SHARE:"Facebook Share",GOOGLE_SHARE:"Google Share",LINKEDIN_SHARE:"LinkedIn Share",PINTEREST_PIN:"Pinterest Pin",REDDIT_SHARE:"Reddit Share",TUMBLR_SHARE:"Tumblr Share",TWITTER_TWEET:"Twitter Tweet",FACEBOOK_LOGIN:"Facebook Login",GOOGLE_LOGIN:"Google+ Login",TWITTER_LOGIN:"Twitter Login",YAHOO_LOGIN:"Yahoo Login",LINKEDIN_LOGIN:"LinkedIn Login",OPENID_LOGIN:"OpenId Login",OTHER:"Other Social"}
Postmedia.Analytics.SocialLink=function(socialtype,location) {
    if (typeof socialtype === "string") {
        Postmedia.Audience.logEvent("Share Article", Postmedia.Audience.EventType.Social, {
            "Global Post ID/Content ID": Postmedia.Analytics.ContentId,
            "Article Name": document.title,
            "Article Category": Postmedia.Analytics.Category,
            "Article Sub-Category/Section": Postmedia.Analytics.Category2Levels,
            "Article Authors": Postmedia.Analytics.Authors,
            "Share Channel": socialtype,
            "Share Location On Page": location,
        });
    }
}
Postmedia.Analytics.SocialLogin=function(socialtype) {
        // Nothing. Adobe Analytics code was here. Keeping in case still in use.
}

// Subscription Links
Postmedia.Analytics.Subscription=function(loc) {
    Postmedia.Audience.logEvent("Subscription Button Click", Postmedia.Audience.EventType.Transaction, {"Button Location":loc });
}

// Widget interaction
Postmedia.Analytics.WidgetLink=function(type,spot,type_name,pos_of_list,post_in_list,list_type,list_name) {
    try {
        if(arguments.length != 7) throw "Not Enough Parameters";
        for (var i=0;i < arguments.length; i++){
            if (typeof arguments[i]!="string") throw "All Parameters Need To Be Strings";
        }
        var outfitTextFormater=function(txt) {
            return txt.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}).replace("+"," ").replace("\"","").replace("-"," ");
        }
        type=outfitTextFormater(type);
        spot=outfitTextFormater(spot);
        type_name=outfitTextFormater(type_name);
        pos_of_list=outfitTextFormater(pos_of_list);
        post_in_list=outfitTextFormater(post_in_list);
        list_type=outfitTextFormater(list_type);
        list_name=outfitTextFormater(list_name);
        TYPE_DETAILS={
            Header: {Label: "Header Element", Event: "event89"},
            Outfit: {Label: "Outfit", Event: "event87"},
            Sidebar: {Label: "Sidebar", Event: "event88"},
            "Sidebar Outfit": {Label: "Sidebar", Event: "event88"}
        }
        TypeData=TYPE_DETAILS["Outfit"];
        for(var k in TYPE_DETAILS){
            if (type == k)
                TypeData=TYPE_DETAILS[k];
        }
        Postmedia.Audience.logEvent("Widget Click", Postmedia.Audience.EventType.Navigation, {
            "Widget Type" : TypeData.Label,
            "Widget Name" : type_name,
            "Category Name" : Postmedia.Analytics.Category,
            "Widget Position" : spot,
            "Feed" : list_name,
            "Referring URL" : Postmedia.Analytics.PageName,
            //"Story Headline" : null, "Story URL" : null, "Thumbnail URL" : null, "Author Text" : null, "Media Watch Icon" : null, "Sponsored Link" : null,
            "Story Position" : post_in_list,
        });
    } catch(err) {
        console.error("Postmedia.Analytics.WidgetLink - ", err);
    }
}

// Postal Code Formatting
Postmedia.Analytics.FormatZip=function(pc) {
    Postmedia.Analytics.PostalCode=pc.toUpperCase().replace(/\s+/g, '');
}

//Province
//Postmedia.Analytics.Province=s.state;

if (Postmedia.Analytics.SiteObj.hash_pv) {
    window.onhashchange = function() { Postmedia.Analytics.URLInHash(); }
}

/* END Set Analytics Functions */

/* START Temp vars */

var scDir=Postmedia.Analytics.URL.pathname.split('/');
scDir.shift();

var scDirTemp=[];
var scFileTemp="index.html";
var scDirOffset=Postmedia.Analytics.SiteObj.dir_offset;
for (exception in Postmedia.Analytics.Exceptions.DirectoryVars) {
    if (Postmedia.Analytics.URL.host.indexOf(Postmedia.Analytics.Exceptions.DirectoryVars[exception].searchValue)>-1) {scDirTemp.push(Postmedia.Analytics.Exceptions.DirectoryVars[exception].value);break;}
}
if (scDirTemp.length==0&&Postmedia.Analytics.SiteObj.channel) scDirTemp.push(Postmedia.Analytics.SiteObj.channel);
for (exception in Postmedia.Analytics.Exceptions.DirectoryOffset) {
    if (Postmedia.Analytics.URL.host.indexOf(Postmedia.Analytics.Exceptions.DirectoryOffset[exception].searchValue)>-1) {scDirOffset=Postmedia.Analytics.Exceptions.DirectoryOffset[exception].value;break;}
}
for (i=scDirOffset;i<scDir.length;i++) { //
    if (scDir[i].indexOf(".")==-1) scDirTemp.push(scDir[i].toLowerCase());
    else scFileTemp=scDir[i].toLowerCase();
}
for (dir in scDirTemp) {
    if (scDirTemp[dir]=="") scDirTemp.splice(dir,1);
}
if (scDirTemp[0]=="category") scDirTemp.splice(0,1);

/* END Temp vars */

/* START Set Postmedia.Analytics Data */
Postmedia.Analytics.ContentId=Postmedia.Analytics.ContentId||"";
Postmedia.Analytics.ContentOriginId=Postmedia.Analytics.ContentOriginId||"";
Postmedia.Analytics.ContentTitle=Postmedia.Analytics.ContentTitle || ''; // no document.title here. Don't want document.title from amp_analytics_v2.html
Postmedia.Analytics.Server=Postmedia.Analytics.Server || Postmedia.Analytics.URL.host.toLowerCase();
Postmedia.Analytics.Referrer = Postmedia.Analytics.Referrer || document.referrer.toLowerCase();
Postmedia.Analytics.Sponsor=(typeof Postmedia.Analytics.Sponsor == "string") ? Postmedia.Analytics.Sponsor.toLowerCase() : "";

//External campaign tracking
Postmedia.Analytics.Campaign=(typeof Postmedia.Properties.QueryStringTopWindow.cid == 'string') ? Postmedia.Properties.QueryStringTopWindow.cid : "";
if(Postmedia.Analytics.Campaign=='') {
    if (Postmedia.Properties.QueryStringTopWindow.utm_campaign)
        Postmedia.Analytics.Campaign=Postmedia.Properties.QueryStringTopWindow.utm_campaign+"|"+Postmedia.Properties.QueryStringTopWindow.utm_medium+"|"+Postmedia.Properties.QueryStringTopWindow.utm_source+"|"+Postmedia.Properties.QueryStringTopWindow.utm_region+"|"+Postmedia.Properties.QueryStringTopWindow.utm_content+"|"+Postmedia.Properties.QueryStringTopWindow.utm_term; //ET_CID is from Listrak // utm_region is made up by us, not GA.
    else if (Postmedia.Properties.QueryStringTopWindow.ET_CID)
        Postmedia.Analytics.Campaign=Postmedia.Properties.QueryStringTopWindow.ET_CID;
}
Postmedia.Analytics.Campaign=Postmedia.Analytics.Campaign.replace(/undefined/g,"");

//Internal campaign tracking
Postmedia.Analytics.InternalPromotion="";
if (Postmedia.Properties.QueryString.ipid || (Postmedia.Properties.QueryString.itm_source && Postmedia.Properties.QueryString.itm_medium && Postmedia.Properties.QueryString.itm_campaign))
    Postmedia.Analytics.InternalPromotion=(Postmedia.Properties.QueryString.ipid) ? Postmedia.Properties.QueryString.ipid : [Postmedia.Properties.QueryString.itm_campaign,Postmedia.Properties.QueryString.itm_medium,Postmedia.Properties.QueryString.itm_source,Postmedia.Properties.QueryString.itm_content,'',Postmedia.Properties.QueryString.itm_term].join('|'); //campaign|type|site|format|placement|creative

//Error Handling
Postmedia.Analytics.PageNotFound=Postmedia.Analytics.PageNotFound||false;
if (Postmedia.Analytics.PageNotFound)
    Postmedia.Analytics.PageType="error";

// Page Type and Page Name
if (!Postmedia.Analytics.PageType) {
    if (Postmedia.Properties.QueryStringTopWindow.s) Postmedia.Analytics.PageType="search";
    else Postmedia.Analytics.PageType="story";
}

if (Postmedia.Analytics.SiteObj.hash_pv) Postmedia.Analytics.PageName=scDirTemp.join("/")+"/"+scFileTemp;
else {
    var abort=false;
    for (exception in Postmedia.Analytics.Exceptions.PageName) {
        if (Postmedia.Analytics.URL.href.indexOf(Postmedia.Analytics.Exceptions.PageName[exception].searchValue)>-1) {
            Postmedia.Analytics.PageName=Postmedia.Analytics.Exceptions.PageName[exception].value;abort=true;
            break;
        }
    }
    if (!abort) {
        if ( Postmedia.Analytics.PageType == 'story' )
            Postmedia.Analytics.PageName = scDirTemp.join("/")+"/story.html";
        else
            Postmedia.Analytics.PageName = scDirTemp.join("/")+"/"+scFileTemp;
    }
}
if (Postmedia.Analytics.PageName.trim()=='/') Postmedia.Analytics.PageName="/index.html";

// Categories
if (typeof Postmedia.Analytics.CategoryAll != "string" || Postmedia.Analytics.CategoryAll == "") Postmedia.Analytics.CategoryAll=scDirTemp.join("/");
else if (Postmedia.Analytics.SiteObj.channel) Postmedia.Analytics.CategoryAll=(Postmedia.Analytics.CategoryAll!="") ? Postmedia.Analytics.SiteObj.channel+"/"+Postmedia.Analytics.CategoryAll : Postmedia.Analytics.Category;
if (Postmedia.Analytics.SiteObj.channel) Postmedia.Analytics.Category=Postmedia.Analytics.SiteObj.channel;
else if (scDirTemp.length>=1) Postmedia.Analytics.Category=scDirTemp.slice(0,1).join("/");
else Postmedia.Analytics.Category="index";
for (exception in Postmedia.Analytics.Exceptions.Category) {
    if (Postmedia.Analytics.URL.href.indexOf(Postmedia.Analytics.Exceptions.Category[exception].searchValue)>-1) {
        Postmedia.Analytics.Category=Postmedia.Analytics.Exceptions.Category[exception].value;
        Postmedia.Analytics.CategoryAll=(Postmedia.Analytics.CategoryAll!="") ? Postmedia.Analytics.Category+"/"+Postmedia.Analytics.CategoryAll : Postmedia.Analytics.Category;
        break;
    }
}
Postmedia.Analytics.Category2Levels = (Postmedia.Analytics.CategoryAll.split("/").length>=2) ? Postmedia.Analytics.CategoryAll.split("/").slice(0,2).join("/") : undefined;
Postmedia.Analytics.Category3Levels = (Postmedia.Analytics.CategoryAll.split("/").length>=3) ? Postmedia.Analytics.CategoryAll.split("/").slice(0,3).join("/") : undefined;
Postmedia.Analytics.Category4Levels = (Postmedia.Analytics.CategoryAll.split("/").length>=4) ? Postmedia.Analytics.CategoryAll.split("/").slice(0,4).join("/") : undefined;

//Vendor
if (!Postmedia.Analytics.Vendor) {
    if (Postmedia.Analytics.SiteObj.vendor) Postmedia.Analytics.Vendor=Postmedia.Analytics.SiteObj.vendor;
    else {
        for (siteId in Postmedia.Analytics.Sites) {
            for (syn in Postmedia.Analytics.Sites[siteId].synonyms) {
                if (Postmedia.Analytics.Sites[siteId].vendor!=null && Postmedia.Analytics.URL.href.toLowerCase().indexOf(Postmedia.Analytics.Sites[siteId].synonyms[syn])>-1) {
                    Postmedia.Analytics.Vendor=Postmedia.Analytics.Sites[siteId].vendor;
                    abort=true;
                    break;
                }
            }
            if (abort) break;
        }
    }
    for (exception in Postmedia.Analytics.Exceptions.Vendor) {
        if (Postmedia.Analytics.URL.host.indexOf(Postmedia.Analytics.Exceptions.Vendor[exception].searchValue)>-1) {Postmedia.Analytics.Vendor=Postmedia.Analytics.Exceptions.Vendor[exception].value;break;}
    }
    if (!Postmedia.Analytics.Vendor) Postmedia.Analytics.Vendor = 'unknown'; // If still not set.
}

//Logged In?
Postmedia.Analytics.LoginStatus="Non-Registered";
if (localStorage.janrainCaptureProfileData!=undefined) { //Has logged in at some point
    Postmedia.Analytics.LoginUUID=JSON.parse(localStorage.janrainCaptureProfileData).uuid;
    if (localStorage.janrainCaptureToken!=undefined) Postmedia.Analytics.LoginStatus="Registered"; //Logged in atm
}

//Free vs Meter Content
if(!Postmedia.Analytics.MeteredContentPageType || Postmedia.Analytics.MeteredContentPageType=="") {
    if (Postmedia.Analytics.PageType!='story') Postmedia.Analytics.MeteredContentPageType="Free Content";
    else Postmedia.Analytics.MeteredContentPageType="Metered Content";
}

//Markup Language
Postmedia.Analytics.MarkUpLanguage=Postmedia.Analytics.MarkUpLanguage || "HTML5";
for (exception in Postmedia.Analytics.Exceptions.MarkUpLang) {
    if (Postmedia.Analytics.URL.host.indexOf(Postmedia.Analytics.Exceptions.MarkUpLang[exception].searchValue)>-1) {Postmedia.Analytics.MarkUpLanguage=Postmedia.Analytics.Exceptions.MarkUpLang[exception].value;break;}
}

//Date data
Postmedia.Analytics.Time.Info=Postmedia.Analytics.Time.infoParser();
// Set hour
Postmedia.Analytics.Time.Hour=Postmedia.Analytics.Time.Info.split(':')[0];
if (parseInt(Postmedia.Analytics.Time.Info.split(':')[1].charAt(0))<3) Postmedia.Analytics.Time.Hour=Postmedia.Analytics.Time.Hour+':00';
else Postmedia.Analytics.Time.Hour=Postmedia.Analytics.Time.Hour+':30';
Postmedia.Analytics.Time.Hour=Postmedia.Analytics.Time.Hour+Postmedia.Analytics.Time.Info.split(' ')[1].split('|')[0];
Postmedia.Analytics.Time.Day=Postmedia.Analytics.Time.Info.split('|')[1]; // Set day
Postmedia.Analytics.Time.DayType='Weekday';
if (Postmedia.Analytics.Time.Day=='Saturday'||Postmedia.Analytics.Time.Day=='Sunday') Postmedia.Analytics.Time.DayType='Weekend';

//Division
Postmedia.Analytics.Division=Postmedia.Analytics.DivisionTypes.UNKNOWN;
for (exception in Postmedia.Analytics.Exceptions.Division) {
    if (Postmedia.Analytics.URL.href.indexOf(Postmedia.Analytics.Exceptions.Division[exception].searchValue)>-1) {Postmedia.Analytics.Division=Postmedia.Analytics.Exceptions.Division[exception].value;break;}
}
if (Postmedia.Analytics.Division==Postmedia.Analytics.DivisionTypes.UNKNOWN) {
    if (Postmedia.Analytics.SiteObj.division!=null && Postmedia.Analytics.SiteObj.division!="" && Postmedia.Analytics.SiteObj.division!=Postmedia.Analytics.DivisionTypes.UNKNOWN)
        Postmedia.Analytics.Division=Postmedia.Analytics.SiteObj.division;// Site Default
    else {
        var abort=false;
        for (siteId in Postmedia.Analytics.Sites) {
            for (syn in Postmedia.Analytics.Sites[siteId].synonyms) {
                if (Postmedia.Analytics.Sites[siteId].division!=null && Postmedia.Analytics.URL.href.toLowerCase().indexOf(Postmedia.Analytics.Sites[siteId].synonyms[syn])>-1) {
                    Postmedia.Analytics.Division=Postmedia.Analytics.Sites[siteId].division;// For third parties.
                    abort=true;
                    break;
                }
            }
            if (abort) break;
        }
    }
}

//Brand. See if values exist for Postmedia.Analytics.Brand. If not set to overrides, site defaults or UNKNOWN.
if (typeof Postmedia.Analytics.Brand == "undefined" || Postmedia.Analytics.Brand=="") {
    Postmedia.Analytics.Brand=Postmedia.Analytics.DivisionTypes.UNKNOWN;
    for (exception in Postmedia.Analytics.Exceptions.Brand) {
        if (Postmedia.Analytics.URL.href.indexOf(Postmedia.Analytics.Exceptions.Brand[exception].searchValue)>-1) {Postmedia.Analytics.Brand=Postmedia.Analytics.Exceptions.Brand[exception].value;break;}
    }
}
if (Postmedia.Analytics.Brand==Postmedia.Analytics.BrandingTypes.UNKNOWN) {
    if (Postmedia.Analytics.SiteObj.brand!=null && Postmedia.Analytics.SiteObj.brand!="" && Postmedia.Analytics.SiteObj.brand!=Postmedia.Analytics.BrandingTypes.UNKNOWN)
        Postmedia.Analytics.Brand=Postmedia.Analytics.SiteObj.brand;// Site Default
    else {
        var abort=false;
        for (siteId in Postmedia.Analytics.Sites) {
            for (syn in Postmedia.Analytics.Sites[siteId].synonyms) {
                if (Postmedia.Analytics.Sites[siteId].brand!=null && Postmedia.Analytics.URL.href.toLowerCase().indexOf(Postmedia.Analytics.Sites[siteId].synonyms[syn])>-1) {
                    Postmedia.Analytics.Brand=Postmedia.Analytics.Sites[siteId].brand;// For third parties.
                    abort=true;
                    break;
                }
            }
            if (abort) break;
        }
    }
}

//Meta keywords
var scKeywords="";
if (typeof Postmedia.Properties.MetaContent.news_keywords != 'undefined') scKeywords='news_keywords';
else if (typeof Postmedia.Properties.MetaContent.keywords != 'undefined') scKeywords='keywords';
if (scKeywords!="") Postmedia.Analytics.WPMetaTagKeywords=Postmedia.Properties.MetaContent[scKeywords].split(',').map(Function.prototype.call, String.prototype.trim).join('|');

//Distributor
if( Postmedia.Analytics.Authors && -1 != Postmedia.Analytics.Authors.replace(/\s+/g, '').replace(/-/g, "").toLowerCase().search( 'canadianpress' ) ){
    Postmedia.Analytics.Distributor='Canadian Press';
} else if ( Postmedia.Analytics.Authors && -1 != Postmedia.Analytics.Authors.replace(/\s+/g, '').replace(/-/g, "").toLowerCase().search( 'associatedpress' ) ){
    Postmedia.Analytics.Distributor='Associated Press';
} else if (typeof Postmedia.Analytics.Distributor == "undefined" || Postmedia.Analytics.Distributor=="") {
    if (Postmedia.Analytics.SiteObj.distributor!=null && Postmedia.Analytics.SiteObj.distributor!="")
        Postmedia.Analytics.Distributor=Postmedia.Analytics.SiteObj.distributor;// Site Default
    else {
	    for (siteId in Postmedia.Analytics.Sites) {
	        for (syn in Postmedia.Analytics.Sites[siteId].synonyms) {
	            if (Postmedia.Analytics.Sites[siteId].distributor!=null && Postmedia.Analytics.URL.href.toLowerCase().indexOf(Postmedia.Analytics.Sites[siteId].synonyms[syn])>-1) {
	                Postmedia.Analytics.Distributor=Postmedia.Analytics.Sites[siteId].distributor;
	                abort=true;
	                break;
	            }
	        }
	        if (abort) break;
	    }
	    for (exception in Postmedia.Analytics.Exceptions.Distributor) {
	        if (Postmedia.Analytics.URL.host.indexOf(Postmedia.Analytics.Exceptions.Distributor[exception].searchValue)>-1) {Postmedia.Analytics.Distributor=Postmedia.Analytics.Exceptions.Distributor[exception].value;break;}
	    }
	}
}

//Ad Site
try {Postmedia.Analytics.AdSite=(Postmedia.Properties.isMobile) ? Postmedia.adConfig.msite : Postmedia.adConfig.site.split("/")[0];} catch(e) {};

//Percentage Of Page Viewed
if (Postmedia.Analytics.MarkUpLanguage!="FBIA") {try{Postmedia.Analytics.PercentageOfPageViewed=Postmedia.Analytics.getPercentPageViewed();} catch(e) {}}

// WP Category Type
if( Postmedia.Analytics.Vendor && -1 != Postmedia.Analytics.Vendor.search( 'postmedia vip' ) ){
    Postmedia.Analytics.WPCategoryType=Postmedia.Analytics.Category;
}

// Debug Data (Adobe Vistitor ID Present | WP vs LEGO vs S3 | file name)
Postmedia.Analytics.DebugData=Postmedia.Analytics.DebugData || 'S3 | core';

/* END Set Postmedia.Analytics Data */

/**
 *  START AMP, FBIA mParticle implementation
 */
 Postmedia.Audience.identityCallback = function () {
     Postmedia.Audience.setUserAttribute('Postmedia Division', Postmedia.Analytics.Division);
     Postmedia.Audience.setUserAttribute('Postmedia Brand', Postmedia.Analytics.Brand);
     Postmedia.Audience.setUserAttribute('Distributor', Postmedia.Analytics.Distributor);
     Postmedia.Audience.setUserAttribute('Vendor', Postmedia.Analytics.Vendor);
     Postmedia.Audience.setUserAttribute( "$State", Postmedia.Analytics.Province );
     Postmedia.Audience.setUserAttribute( "$Zip", Postmedia.Analytics.PostalCode );
     Postmedia.Audience.setUserAttribute('Server', Postmedia.Analytics.Server);

     if ( mParticle.Identity.getCurrentUser() ) {
         Postmedia.Audience.mParticleID = mParticle.Identity.getCurrentUser().getMPID();
     }
     if ( Postmedia.Audience.mParticleID ) {
         Postmedia.Audience.setUserAttribute( 'MPID', Postmedia.Audience.mParticleID );
     }

     if (localStorage.janrainLastAuthMethod!=undefined) {
         Postmedia.Audience.setUserAttribute('Registration Method', localStorage.janrainLastAuthMethod);
     }
     Postmedia.Audience.setUserAttribute('Registration Status', Postmedia.Analytics.LoginStatus);

     Postmedia.Audience.incrementUserAttribute("Visit Count");
     if (Postmedia.Analytics.PageType=='story')
         Postmedia.Audience.incrementUserAttribute("Articles Read Count");

     Postmedia.Audience.logPageView("Screen View",{
             "Page Name": Postmedia.Analytics.PageName,
             "Domain": Postmedia.Analytics.Server,
             "Division": Postmedia.Analytics.Division,
             "Brand": Postmedia.Analytics.Brand,
             "Category": Postmedia.Analytics.Category,
             "All Sub Sections": Postmedia.Analytics.CategoryAll,
             "Sub Section": Postmedia.Analytics.Category2Levels,
             "Sub Section 2": Postmedia.Analytics.Category3Levels,
             "Sub Section 3": Postmedia.Analytics.Category4Levels,
             "404": Postmedia.Analytics.PageNotFound.toString(),
             "Vendor": Postmedia.Analytics.Vendor,
             "Login Status": Postmedia.Analytics.LoginStatus,
             "Metered Content Type": Postmedia.Analytics.MeteredContentPageType,
             "Distributor": Postmedia.Analytics.Distributor,
             "Content ID": (Postmedia.Analytics.PageType=='story') ? Postmedia.Analytics.ContentId+","+Postmedia.Analytics.ContentOriginId : undefined,
             "Markup Language": Postmedia.Analytics.MarkUpLanguage,
             "WordPress Sub Categories": Postmedia.Analytics.WPSubCategories,
             "Sponsor": Postmedia.Analytics.Sponsor,
             "Content Title": Postmedia.Analytics.ContentTitle,
             "Publication Date": Postmedia.Analytics.PublicationDate,
             "Publish Time of Day": Postmedia.Analytics.PublicationTimeOfDay,
             "Page Type": Postmedia.Analytics.PageType,
             "Time Hour Of Day": Postmedia.Analytics.Time.Hour,
             "Time Day Of Week": Postmedia.Analytics.Time.Day,
             "Time WeekDay Or Weekend": Postmedia.Analytics.Time.DayType,
             "Ad Site": Postmedia.Analytics.AdSite,
             "WordPress Meta Tag Keywords": Postmedia.Analytics.WPMetaTagKeywords,
             "Modification Date": Postmedia.Analytics.ModifiedDate,
             "Modification Time of Day": Postmedia.Analytics.ModifiedTimeOfDay,
             "Percentage Of Page Viewed": (Postmedia.Analytics.PercentageOfPageViewed) ? Postmedia.Analytics.PercentageOfPageViewed.toString() : '',
             "WordPress Global Slug": Postmedia.Analytics.WPGlobalSlug,
             "Authors": Postmedia.Analytics.Authors,
             "WordPress Category Type": Postmedia.Analytics.WPCategoryType,
             "Driving Special Sections": Postmedia.Analytics.Driving.SpecialSection,
             "Driving Car Make": Postmedia.Analytics.Driving.CarMake,
             "Driving Compare Tool Filters": Postmedia.Analytics.Driving.CompareToolFilters,
             "Driving Compare Tool Count": Postmedia.Analytics.Driving.CompareToolCount,
             "Driving Body Style Filters": Postmedia.Analytics.Driving.BodyStyleFilters,
             "Driving Make And Model": Postmedia.Analytics.Driving.MakeModel,
             "Analytics Debug Info": Postmedia.Analytics.DebugData,
             "AMP Identifier": (Postmedia.Analytics.Server) ? Postmedia.Analytics.Server.split('.')[0] : ''
         },{});

     // Page Events
     if (Postmedia.Analytics.PageType=='index') {
         Postmedia.Audience.logEvent("View Category", Postmedia.Audience.EventType.Navigation,
             {"Category" : Postmedia.Analytics.Category,
             "Sub Section" : Postmedia.Analytics.Category2Levels,
             "Sub Section 2" : Postmedia.Analytics.Category3Levels,
             "Sub Section 3" : Postmedia.Analytics.Category4Levels,
             "AMP Identifier": (Postmedia.Analytics.Server) ? Postmedia.Analytics.Server.split('.')[0] : ''
             //"Number of Pages" : null,
             }, { "Google.NonInteraction" : true } );
     } else if (Postmedia.Analytics.PageType=='story') {
         Postmedia.Audience.logEvent("View Article", Postmedia.Audience.EventType.Navigation, {
             "Article Name": Postmedia.Analytics.ContentTitle.split("|")[0] ,
             "Article Category": Postmedia.Analytics.Category,
             "Article Sub Section": Postmedia.Analytics.Category2Levels,
             "Sub Section 2": Postmedia.Analytics.Category3Levels,
             "Distributor": Postmedia.Analytics.Distributor,
             "Publish Date": Postmedia.Analytics.PublicationDate,
             "Publish Time of Day": Postmedia.Analytics.PublicationTimeOfDay,
             "Story Type": Postmedia.Analytics.PageType,
             "Writer Byline": Postmedia.Analytics.Authors,
             "Current Page": Postmedia.Analytics.PageName,
             "Driving Car Make": Postmedia.Analytics.Driving.CarMake,
             "Article Format": Postmedia.Analytics.MarkUpLanguage,
             "Modification Date": Postmedia.Analytics.ModifiedDate,
             "Modification Time of Day": Postmedia.Analytics.ModifiedTimeOfDay,
             "Global Post ID": Postmedia.Analytics.ContentId+","+Postmedia.Analytics.ContentOriginId,
             "NLP Tags": (typeof Postmedia.Analytics.NLP=='object') ? [Postmedia.Analytics.NLP.Parser(Postmedia.Analytics.NLP.entities,'products'),Postmedia.Analytics.NLP.Parser(Postmedia.Analytics.NLP.key_topics,'products','Topic')].filter(function (val) {return val;}).join(',') : null,
             "Paywall Whitelist": Postmedia.Analytics.MeteredContentPageType,
             "AMP Identifier": (Postmedia.Analytics.Server) ? Postmedia.Analytics.Server.split('.')[0] : ''
         }, { "Google.NonInteraction" : true, "Google.Page": Postmedia.Analytics.URL.href } );
     } else {
         Postmedia.Audience.logEvent("View Category", Postmedia.Audience.EventType.Navigation,
             {"Category" : Postmedia.Analytics.Category,
             "Sub Section" : Postmedia.Analytics.Category2Levels,
             "Sub Section 2" : Postmedia.Analytics.Category3Levels,
             "Sub Section 3" : Postmedia.Analytics.Category4Levels,
             "AMP Identifier": (Postmedia.Analytics.Server) ? Postmedia.Analytics.Server.split('.')[0] : ''
             }, { "Google.NonInteraction" : true } );
     }

     //Campaigns
     if (Postmedia.Analytics.Campaign && Postmedia.Analytics.Campaign!="")
         Postmedia.Audience.logEvent("External Campaign", Postmedia.Audience.EventType.Navigation, {"Campaign ID":Postmedia.Analytics.Campaign}, { "Google.NonInteraction" : true } );
     if(Postmedia.Analytics.InternalPromotion && Postmedia.Analytics.InternalPromotion!="")
         Postmedia.Audience.logEvent("Internal Promotion Click", Postmedia.Audience.EventType.Navigation, {"Button Location":Postmedia.Analytics.InternalPromotion.split("|")[4], "Promotion Name":Postmedia.Analytics.InternalPromotion.split("|")[0]}, { "Google.NonInteraction" : true } );
     //Janrain Verify Account Email Screen
     if (Postmedia.Properties.QueryStringTopWindow.screenToRender=='verifyEmail') {
         Postmedia.Audience.logEvent("View Registration Welcome Screen", Postmedia.Audience.EventType.UserPreference, {}, { "Google.NonInteraction" : true });
     }

     // NLP
     if (typeof Postmedia.Analytics.NLP=='object')
         Postmedia.Audience.logNLP( Postmedia.Analytics.NLP );

 }

 window.mParticle = {
     config: {
         isSandbox: false,
         isDebug: false,
         isDevelopmentMode: false,
         identifyRequest: Postmedia.Audience.identityRequest,
         identityCallback: Postmedia.Audience.identityCallback,
         useNativeSdk: false,
         useCookieStorage: true,
         appVersion: "1.0.0",
         sessionTimeout: 60,
         customFlags: {}
     }
 };

 (function (apiKey) {
     window.mParticle = window.mParticle || {};
     window.mParticle.config = window.mParticle.config || {};
     window.mParticle.config.rq = [];
     window.mParticle.ready = function (f) {
         window.mParticle.config.rq.push(f);
     };
     var mp = document.createElement("script");
     mp.type = "text/javascript";
     mp.async = true;
     mp.src = ("https:" == document.location.protocol ? "https://jssdkcdns" : "http://jssdkcdn") + ".mparticle.com/js/v2/" + apiKey + "/mparticle.js";
     var s = document.getElementsByTagName("script")[0];
     s.parentNode.insertBefore(mp, s);
 })( Postmedia.Audience.mParticleID );
 
