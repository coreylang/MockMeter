// tuc.js - Total User Configurable pointslist/registerset support
//   serdes
//   loadAsync
//   work
//   c0 - class zero dnp legacy default bitmask

// serdes section start -----------------------------------------------------
function desCollection(ser) {
    var colHdr;
    var colObj = {};
    var list;

    colHdr = ser[0];  // collection hdr [name, version] 
    colObj.name = colHdr[0];
    colObj.version = colHdr[1];

    colObj.lists = [];

    for (var i = 1;  i < ser.length;  ++i) {
        list = desList(ser[i]);
        colObj.lists.push(list);

    }

    evt_2_lists(colObj); // fan-out "Evt" to target lists and remove Evt
    colObj = cnt_fzn_2_mrgCnt(colObj);   // merge any cnt/fzn pair for gui

    return colObj;
}

function desList(list) {
    var cf_str;
    var i;
    var hdr;
    var namevec;
    var objvec = [];
    var listObj = {};
    
    // listType
    hdr = list[0];
    listObj.type = hdr[0];
    listObj.desc = hdr[1];
    if (3 <= hdr.length)
        listObj.address = hdr[2];

    // serdes vector element member names
    namevec = list[1];
    listObj.serdes = namevec;

    if (2 < list.length) {
        // build cf() - des constructor function using member names in namevec
        cf_str = "function cf(serRow) {";
        for(i = 0;  i < namevec.length;  ++i) {
            cf_str += "this." + namevec[i] + " = serRow[" + i + "];";
        }
        cf_str += "return this;}";
        // document.write(cf_str + "<br>");  // debug - show constructor fun
        eval(cf_str);  // create cf() in current scope
    }


    // create object array
    try {
        for(i = 2;  i < list.length;  ++i) {
            objvec[i - 2] = new cf(list[i]);
        }
    }
    catch (e) {
        alert(e);
    }


    listObj.vec = objvec;

    return (listObj);
}


function serCollection (col) {
    var text_vec = [];
    var new_vec = [];
    var text;

    col = mrgCnt_2_cnt_fzn (col); // seperate any mrgCnt into cnt and fzn
    lists_2_evt(col); // rebuild Evt if lists have evCount and evType

    text_vec.push("var " + col.name.split("_")[0] + " = [");

    text_vec.push("[\"" + col.name + "\", \"" + col.version + "\"],");

    for (var i = 0;  i < col.lists.length;  ++i) {
        text_vec.push("[");
        new_vec = serList (col.lists[i]);
        for (var j = 0;  j < new_vec.length;  ++j) {
            text = new_vec[j];
            text_vec.push(text);
        }
        text = "]";
        if (i < col.lists.length - 1)
            text += ",";
        text_vec.push(text);
    }

    evt_2_lists(col);       // fan-out "Evt" to target lists and remove Evt
    cnt_fzn_2_mrgCnt(col);  // recombine any cnt and fzn for gui

    text_vec.push("];");

    return text_vec.join("\n");
}


function serList (list) {
    var cf_str;
    var i;
    var namevec;
    var o;
    var text;
    var text_vec = [];

    namevec = list.serdes;

    // add list header
    text = "[\"" + list.type + "\"";
    text += ", \"" + list.desc + "\"";
    if (list.address)
        text += ", " + list.address;
    text += "],";
    text_vec.push (text);

    // add member name list
    text = "[\"";
    for (i = 0;  i < namevec.length;  ++i) {
        text += namevec[i];
        if (i < namevec.length - 1)
            text += "\", \"";
    }
    if (list.vec.length == 0)
        text += "\"]";
    else
        text += "\"],";
    text_vec.push (text);

    // add list data
    if (list.vec.length) {
        // build cf() - ser constructor function using member names in namevec
        cf_str = "function cf(desRow) {var q; var v; var o = \"[\";";
        for(i = 0;  i < namevec.length;  ++i) {
            cf_str += "v = desRow." + namevec[i] + ";q = typeof(v) == 'string';";
            cf_str += "if (q) o += '\\\"'; o += v; if (q) o += '\\\"';";
            if (i < namevec.length - 1) {
                cf_str += "o += ',';";
            }
        }
        cf_str += "o += \"]\"; return o}";
        //document.write(cf_str + "<br>");  // debug - show constructor fun
        eval(cf_str);  // create cf() in current scope
    }

    for (i = 0;  i < list.vec.length;  ++i) {
        o = list.vec[i];
        text = cf (o);
        if (i < list.vec.length - 1)
            text += ",";
        text_vec.push (text);
    }

    return text_vec;
}


// merge CNT and FZN lists items into a single list of CNT items
function cnt_fzn_2_mrgCnt(col) {
    var cnt;
    var cnt_list;
    var fzn;
    var fzn_idx;
    var fzn_list;
    var i;
    var list;
    var n_vec;

    // find ctr list pair
    for (i = 0;  i < col.lists.length;  ++i) {
        list = col.lists[i];
        if (list.type == "CNT")
            cnt_list = list;
        else if (list.type == "FZN") {
            fzn_idx = i;
            fzn_list = list;
            }
        }


    // empty pair OK
    if (cnt_list == undefined && fzn_list == undefined)
        return col;

    // verify paired lists exist 
    if (cnt_list
      && fzn_list
      && cnt_list.vec.length == fzn_list.vec.length)
        ; // ok so far
    else
        {
        alert ("corrupted input");
        return col;
        }

    cnt_list.fevCount = fzn_list.evCount;
    cnt_list.fevMode = fzn_list.evMode;

    cnt_list.serdes.push(
        "rEnab", "fEnab", "fcalcType", "fclassMask", "fdeadband" );

    n_vec = cnt_list.vec.length;
    for (i = 0;  i < n_vec;  ++i) {
        cnt = cnt_list.vec[i];
        fzn = fzn_list.vec[i];

        // msb of 6bit opts field is disable (ls4 of opts is deadband index)
        cnt.rEnab = (cnt.deadband & 0x20) ? false : true;
        cnt.fEnab = (fzn.deadband & 0x20) ? false : true;
        cnt.fcalcType = fzn.calcType;
        cnt.fclassMask = fzn.classMask;
        cnt.fdeadband = fzn.deadband & 0xf;
        cnt.deadband &= 0xf;
        }

    // remove fzn_list; cnt_list now union of orig cnt_list and fzn_list
    col.lists.splice(fzn_idx, 1);

    return col;   // has merged cnt
    }


// seperate merged CNT items into CNT and FZN lists items
function mrgCnt_2_cnt_fzn (col) {
    var cnt_list;
    var cnt_idx;
    var cnti;
    var fzn;
    var i;
    var list;
    var n_vec;
    var newi;

    // find any merged ctr list
    for (i = 0;  i < col.lists.length;  ++i) {
        list = col.lists[i];
        if (list.type == "CNT") {
            cnt_idx = i;
            cnt_list = list;
            break;
            }
        }

    if (cnt_list == undefined)
        return col; // nothing to see here; move along...


    fzn = {};
    fzn.type = "FZN";
    fzn.desc = "Frozen Counters";
    fzn.serdes = ["dbIdx", "calcType", "classMask", "deadband"];
    fzn.vec = [];

    fzn.evCount = cnt_list.fevCount;
    fzn.evMode = cnt_list.fevMode;

    n_vec = cnt_list.vec.length;

    for (i = 0;  i < n_vec;  ++i) {
        newi = {};
        cnti = cnt_list.vec[i];

        // create fzn item
        newi.dbIdx = cnti.dbIdx;
        newi.calcType = cnti.fcalcType;
        newi.classMask = cnti.fclassMask;
        newi.deadband = cnti.fdeadband;
        if (cnti.fEnab == false)    // flag disabled
            newi.deadband |= 0x20;
        fzn.vec.push(newi);

        // remove fzn info from cnt item
        if (cnti.rEnab == false)
            cnti.deadband |= 0x20;  // flag disabled
        delete cnti.fcalcType;
        delete cnti.fclassMask;
        delete cnti.fdeadband;
        delete cnti.rEnab;
        delete cnti.fEnab;
        }

    // add fzn after cnt
    col.lists[cnt_idx].serdes = fzn.serdes;
    col.lists.splice(cnt_idx + 1, 0, fzn);

    return col;
    }


// evt_2_lists - fan-out any evt list items to the target list and remove
function evt_2_lists(col) {
    var e;
    var evt;
    var i;
    var j;
    var list;

    evt = null;
    for (i = 0;  i < col.lists.length;  ++i) {
        if (col.lists[i].type == "EVT")
            {
            evt = col.lists.splice(i, 1)[0];
            break;
            }
        }

    if (evt == null)
        return;

    for (i = 0;  i < evt.vec.length;  ++i) {
        e = evt.vec[i];
        for (j = 0;  j < col.lists.length;  ++j) {
            list = col.lists[j];
            if (list.type == e.type) {
                list.evCount = e.evCount;
                list.evMode = e.evMode;
                break;
                }
            }
        }
    }


// lists_2_evt - insert EVT list containing any evCount and evMode items
function lists_2_evt(col) {
    var i;
    var e;
    var evt;
    var list;

    evt = {};
    evt.vec = [];
    for (i = 0;  i < col.lists.length;  ++i) {
        list = col.lists[i];
        if (list.evCount == undefined)
            continue;

        e = {};
        e.type = list.type;
        e.evCount = list.evCount;
        e.evMode = list.evMode;
        delete list.evCount;
        delete list.evMode;
        evt.vec.push(e); 
        }

    if (evt.vec.length != 0) {
        evt.type = "EVT";
        evt.desc = "Event Information";
        evt.serdes = ["type", "evCount", "evMode"];

        col.lists.splice(0, 0, evt);
        }
    }
// serdes section end -----------------------------------------------------



// loadAsync utility section start ------------------------------------------
var MAX_ASYNCLOAD_TO = 3000;    // three seconds ok?

// loadAsync_d object
var loadAsync_d = {
    "busy": false,

    _factories: [
        function() {return new XMLHttpRequest(); },
        function() {return new ActiveXObject("Msxml2.XMLHTTP"); },
        function() {return new ActiveXObject("Microsoft.XMLHTTP"); }
        ],

    _factory: null,


    // newRequest
    newRequest: function() {
        if (this._factory)
            return this._factory();

        for (var i = 0;  i < this._factories.length;  ++i) {
            try {
                var factory = this._factories[i];
                var request = factory();
                if (request != null) {
                    this._factory = factory;
                    return request;
                    }
                }
            catch (e) {
                continue;
                }
            }

        this._factory = function() {
            throw new Error("XMLHttpRequest not supported");
            }
        this._factory(); // throw an error

        return this._factory();
        },


    // ok - loadAsync_ok
    ok: function (request) {
        clearTimeout (this.to);    
        this.busy = false;
        this.done = true;
        this.callBackOk(request);
        },


    // fail - loadAsync_fail
    fail: function (request) {
        if (this.busy) {
            clearTimeout (this.to);
            this.busy = false;
            this.done = true;
            this.callBackFail (request);
            return true;
            }

        return fail;
        },

    // timeout - loadAsync_timeout
    timeout: function () {
        this.busy = false;
        if (this.done)      // paranoid race avoidence
            return;

        this.done = true;
        this.request.abort ();   // cancel pending request
        this.callBackFail (this.request);
        }


    };




function loadAsync(url, callBackOk, callBackFail) {
    var request;

    /* prevent reenterent use */
    if (loadAsync_d.busy) {
        callBackFail(url + " busy");
        return;
        }

    loadAsync_d.busy = true;
    loadAsync_d.done = false;

    request = loadAsync_d.newRequest();
    request.onreadystatechange = function () {
        if (request.readyState != 4) // request incomplete
            return;

        if (request.status == 200)
            loadAsync_d.ok (loadAsync_d.request);
        else
            loadAsync_d.fail (loadAsync_d.request);
        }
        
    loadAsync_d.request = request;
    loadAsync_d.url = url;
    loadAsync_d.callBackOk = callBackOk;
    loadAsync_d.callBackFail = callBackFail;
    loadAsync_d.to = setTimeout (loadAsync_d.timeout, MAX_ASYNCLOAD_TO);

    request.open ("GET", url);
    request.send ("");

    return;
    }

// loadAsync utility section end ------------------------------------------



// work file contents start -----------------------------------------------
// contains, in order:
//   NEWO_RESERVED
//   staticDBNames
//   modbusDBNames
//   dnpDBNames


var NEWO_RESERVED = 144;

var staticDBNames = [
"RMS Volts Aux",
"RMS Volts A",
"RMS Volts B",
"RMS Volts C",
"RMS Volts N",
"RMS Amps A",
"RMS Amps B",
"RMS Amps C",
"RMS Amps Residual",
"RMS Volts AB",
"RMS Volts BC",
"RMS Volts CA",
"RMS Watts A",
"RMS Watts B",
"RMS Watts C",
"RMS Watts Total",
"RMS VARs A",
"RMS VARs B",
"RMS VARs C",
"RMS VARs Total",
"RMS VAs A",
"RMS VAs B",
"RMS VAs C",
"RMS VAs Tot. Geom",
"Power Factor A",
"Power Factor B",
"Power Factor C",
"Power Factor Tot. Geom",
"Fund. Volts A",
"Fund. Volts B",
"Fund. Volts C",
"Fund. Amps A",
"Fund. Amps B",
"Fund. Amps C",
"Fund. Amps Residual",
"Fund. Volts AB",
"Fund. Volts BC",
"Fund. Volts CA",
"System Frequency",
"Displ. Power Factor A",
"Displ. Power Factor B",
"Displ. Power Factor C",
"Displ. Power Factor Total",
"THD Volts A",
"THD Volts B",
"THD Volts C",
"TDD Amps A",
"TDD Amps B",
"TDD Amps C",
"TDD Amps Residual",
"THD Volts AB",
"THD Volts BC",
"THD Volts CA",
"K-factor Amps A",
"K-factor Amps B",
"K-factor Amps C",
"K-factor Amps Residual",
"kWatt-Hours Net",
"kWatt-Hours Normal",
"kWatt-Hours Reverse",
"kVAR-Hours Lag",
"kVAR-Hours Lead",
"kVA-Hours",
"Demand RMS Amps A",
"Demand RMS Amps B",
"Demand RMS Amps C",
"Demand RMS Amps Residual",
"Demand Fund. Amps A",
"Demand Fund. Amps B",
"Demand Fund. Amps C",
"Demand Fund. Amps Residual",
"Demand RMS Volts A",
"Demand RMS Volts B",
"Demand RMS Volts C",
"Demand RMS Volts AB",
"Demand RMS Volts BC",
"Demand RMS Volts CA",
"Demand RMS Watts A",
"Demand RMS Watts B",
"Demand RMS Watts C",
"Demand RMS Watts Total",
"Demand RMS VARs A",
"Demand RMS VARs B",
"Demand RMS VARs C",
"Demand RMS VARs Total",
"Demand RMS VAs A",
"Demand RMS VAs B",
"Demand RMS VAs C",
"Demand RMS VAs Total",
"Max Demand RMS Amps A",
"Max Demand RMS Amps B",
"Max Demand RMS Amps C",
"Max Demand RMS Amps Residual",
"Max Demand Fund. Amps A",
"Max Demand Fund. Amps B",
"Max Demand Fund. Amps C",
"Max Demand Fund. Amps Residual",
"Max Demand RMS Volts A",
"Max Demand RMS Volts B",
"Max Demand RMS Volts C",
"Max Demand RMS Volts AB",
"Max Demand RMS Volts BC",
"Max Demand RMS Volts CA",
"Max Demand RMS Watts A",
"Max Demand RMS Watts B",
"Max Demand RMS Watts C",
"Max Demand RMS Watts Total",
"Max Demand RMS VARs A",
"Max Demand RMS VARs B",
"Max Demand RMS VARs C",
"Max Demand RMS VARs Total",
"Max Demand RMS VAs A",
"Max Demand RMS VAs B",
"Max Demand RMS VAs C",
"Max Demand RMS VAs Total",
"Min Demand RMS Volts A",
"Min Demand RMS Volts B",
"Min Demand RMS Volts C",
"Min Demand RMS Volts AB",
"Min Demand RMS Volts BC",
"Min Demand RMS Volts CA",
"Min Demand RMS Watts A",
"Min Demand RMS Watts B",
"Min Demand RMS Watts C",
"Min Demand RMS Watts Total",
"Min Demand RMS VARs A",
"Min Demand RMS VARs B",
"Min Demand RMS VARs C",
"Min Demand RMS VARs Total",
"Min Demand RMS VAs A",
"Min Demand RMS VAs B",
"Min Demand RMS VAs C",
"Min Demand RMS VAs Total",
"RMS Status",
"Reset Energy",
"Reset Demand Amps",
"Reset Demand Volts",
"Reset Demand Power",
"Health",
"ID APM",
"Factory Version Hardware",
"Factory Version Software",
"Loading CPU",
"Quality Internal",
"Reserved",
"CT Scale Factor",
"VT Scale Factor",
"Phase Angle Volts A",
"Phase Angle Volts B",
"Phase Angle Volts C",
"Phase Angle Amps A",
"Phase Angle Amps B",
"Phase Angle Amps C",
"Phase Angle Volts AB",
"Phase Angle Volts BC",
"Phase Angle Volts CA",
"485 2 BIs",
"Binary Input 1",
"Binary Input 2",
"Uncompensated RMS Watts Total",
"Uncompensated RMS VARs Total",
"",
"",
"",
"",
"",
"Average Volts 1",
"Average Amps 1",
"Average Phs-Phs Volts 1"
];


var modbusDBNames = [
"Unity",
"Zero",
"Tag Register",
"Meter Type",
"Protocol Version",
"Heart Beat",
"DIO#0 Output Point 1",
"DIO#0 Output Point 2",
"DIO#0 Output Point 3",
"DIO#0 Output Point 4",
"DIO#1 Output Point 1",
"DIO#1 Output Point 2",
"DIO#1 Output Point 3",
"DIO#1 Output Point 4",
"DIO#2 Output Point 1",
"DIO#2 Output Point 2",
"DIO#2 Output Point 3",
"DIO#2 Output Point 4",
"DIO#3 Output Point 1",
"DIO#3 Output Point 2",
"DIO#3 Output Point 3",
"DIO#3 Output Point 4",
"Health",
""
];


var dnpDBNames = [
"Unity",
"Zero",
"Tag Register",
"Meter Type",
"Protocol Version",
"Heart Beat",
"DIO#0 Output Point 1",
"DIO#0 Output Point 2",
"DIO#0 Output Point 3",
"DIO#0 Output Point 4",
"DIO#1 Output Point 1",
"DIO#1 Output Point 2",
"DIO#1 Output Point 3",
"DIO#1 Output Point 4",
"DIO#2 Output Point 1",
"DIO#2 Output Point 2",
"DIO#2 Output Point 3",
"DIO#2 Output Point 4",
"DIO#3 Output Point 1",
"DIO#3 Output Point 2",
"DIO#3 Output Point 3",
"DIO#3 Output Point 4",
"Health",
"Tag Register 1",
"Health Status"
];
// work file contents end -----------------------------------------------


// c0.js file start ------------------------------------------------------
function setClass0(session, bilf_class0) {
    var BUDDHIST_BIT = 0x4000;  // make me one with everything...
    var bilf_class0_defs = [
        [ // bilf_class0_all - all bilfs have these class0 bits enabled
        ["BO",     0,  3],
        ["AI",     0, 20],
        ["AO",     4,  6]
        ],

        [ // bilf_class0_cfg1 - class0_cfg0 +
        ["CNT",    0,  4]
        ],

        [ // bilf_class0_cfg2 - class0_cfg0 +
        ["AI",    21, 28]
        ],

        [ // bilf_class0_cfg4 - class0_cfg0 +
        ["AI",    29, 54]
        ],

        [ // bilf_class0_cfg8 - class0_cfg0 +
        ["AI",    55, 58],
        ["AO",     0,  3],
        ["AO",    10, 14]
        ]

        ];

    // clearAll - disable all session's CLASS0 masks
    function clearAll (sesn) {
        var list;
        for (var i = 0;  i < sesn.lists.length;  ++i) {
            list = sesn.lists [i];
            if (list.vec.length == 0
              || !("classMask" in list.vec[0]))
                continue;

            set1range(sesn, list.type, 0, 0xffff, 0);
            }
        }

    // setEligible - enable all session's legacy CLASS0-eligible types
    function setEligible (sesn) {
        var eligible = ["AI", "AO", "BO", "CNT"];

        for (var i = 0;  i < eligible.length;  ++i)
            set1range (sesn, eligible[i], 0, 0xffff, 1);
        }

    function set1range (sesn, type, min, max, offOn) {
        var list;
        var mask;
        var item;

        for (var i = 0;  i < sesn.lists.length;  ++i) {
            list = sesn.lists[i];
            if (list.type == type) {
                if (min < 0
                  || max < min)
                    continue;

                if (list.vec.length < max)
                    max = list.vec.length - 1;

                for (var j = min;  j <= max;  ++j) {
                    item = list.vec[j];
                    mask = item.classMask;
                    if (item.dbIdx == NEWO_RESERVED)
                        mask |= 0x8;  // always disabled
                    else if (offOn)
                        mask &= ~0x8; // neg logic for class0 only   
                    else
                        mask |= 0x8;

                    item.classMask = mask;
                    }
                }
            }
        }

    function set_ranges (session, typeRanges, offOn) {
        for (var i = 0;  i < typeRanges.length;  ++i) {
            var range = typeRanges[i];
            var type = range[0];
            var min = range[1];
            var max = range[2];

            set1range (session, type, min, max, offOn);
            }
        }

    if (bilf_class0 & BUDDHIST_BIT) {
        setEligible(session);
        return;
        }
            
    clearAll(session);
    set_ranges(session, bilf_class0_defs[0], 1);
    for (var i = 1;  i < bilf_class0_defs.length;  ++i) {
        if (bilf_class0 & (1 << (i-1)))
            set_ranges(session, bilf_class0_defs[i], 1);
        }
    }
// c0.js file end ------------------------------------------------------

function firmware_json_from(user_json) {
    // convert each item in modbusmaps and dnpmaps
    obj = JSON.parse(user_json)
    var convertedmaps = []
    for (var map of obj.modbusmaps)
        convertedmaps.push(serCollection(map))
    obj.modbusmaps = convertedmaps
    convertedmaps = []
    for (var map of obj.dnpmaps)
        convertedmaps.push(serCollection(map))
    obj.dnpmaps = convertedmaps
    return JSON.stringify(obj)
}