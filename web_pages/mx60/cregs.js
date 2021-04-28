var col;
var ord;
var c0e_set = false;
var listLimits = [0,0];
var calcTypeNames;
var preFilter1;
var preFilter2;

var suffix =  [
    {calcType:76, desc:" High Word"},
    {calcType:77, desc:" Low Word"},
    {calcType:82, desc:" Normalized Ratio"},
    {calcType:83, desc:" Ratio Divisor"},
    {calcType:101, desc:" 1mHz Resolution"}
];

var db_names = ["Phase Current", 
                "Neutral Current", 
                "Voltages", 
                "Power Actual", 
                "Power Reactive", 				
                "Frequency", 
                "Miscellaneous"];

var getsAllClasses_list  = ["Analog Inputs", "Binary Inputs", "Binary Outputs"];
var getsDeadband_list    = ["Analog Inputs"];

function filterCol(inp, src) {

    function model_has_item(dbIdx) {
        if(dbIdx == NEWO_RESERVED || dbIdx >= 2048)
            return true;

        for(var j=0; j<dnpModelMode.length; j++) {
            if(dbIdx == dnpModelMode[j])
                return true;
        }
        return false;
    }

    var action = (src=="cat")?(function() {inp.lists[type].vec.splice(i--,1);})
      : (function() { var o = inp.lists[type].vec[i]; o.calcType = 0; o.classMask = 0; o.dbIdx = NEWO_RESERVED; o.deadband = 0;});

    for(var type=0; type<inp.lists.length; type++) {
        for(var i=0; i<inp.lists[type].vec.length; i++) {
            if(!model_has_item(inp.lists[type].vec[i].dbIdx))
                 action();
        }
    }
    
    return inp;
}
                
function populate_dnp_type_list(show_noedit) {
    var dnp_t = id("dnp_t");
    var point;
    dnp_t.options.length = 0;

    for(var type=0; type<col.lists.length; type++) {
        if(col.lists[type].vec.length > 0)
            dnp_t.options[dnp_t.options.length] = new Option(col.lists[type].desc, type);
    }
}
    
function show_plist() {
    var ses;

    delete dnpOrder;
    ses = id("dses").value;
    // populates dnpOrder
    loadAsync ("dnpOrder_" + ses + ".js", show_plist_1, show_plist_load_fail);
	clrSearch(1);
	clrSearch(2);
    }

function show_plist_1(request) {
    eval (request.responseText);    // JSON sets dnpOrder
    ord = filterCol(desCollection (dnpOrder), "ord");
    col = desCollection (dnpCatalog);
    listLimits[1] = getLength(col);
    col = filterCol(col, "cat");

    id("edit_btn").disabled = false;
    id("bilf_btn").value = "Use BiLF List";
    id("back_btn").value = "Cancel";
	id("back_btn").style.visibility = 'visible';
	id("tucNext").style.visibility = 'hidden';
    id("dnp").style.display = 'none';
    id("regedit").style.display = 'block';
    id("pointslist").style.display = 'block';
    id("regset").style.display = 'none';
    id("c0e").style.display = 'none';
    id("success").style.display = 'none';
    id("printNice").style.display = 'block';
    populate_dnp_type_list(true);
    populate_menus();

    if(id("menu2").options.length == 0) {
        id("order").style.display = 'block';
    }
    else {
        build_summary();
    }
    id("serCollectionSubmit").disabled = false;

}

function show_plist_load_fail() {
    alert("can't load dnp pointslist");
    }

function show_regset() {
    var ses;

    delete mbOrder;
    ses = id("mpli").value;  // range is 1:n
    loadAsync ("mbOrder_" + ses + ".js", show_regset_1, show_regset_load_fail);
    vwedit();
	clrSearch(1);
	clrSearch(2);
    }

function show_regset_1 (request) {
    eval(request.responseText);     // JSON sets mbOrder
    ord = filterCol(desCollection (mbOrder), "ord");
    col = desCollection (mbCat16);
    listLimits[0] = getLength(col);
    col = filterCol(col, "cat");

    if(id("mpli").value > 2) {
        id("edit_btn").disabled = false;
        id("serCollectionSubmit").disabled = false;
    }
    else {
        id("edit_btn").disabled = true;
        id("serCollectionSubmit").disabled = true;
    }
    id("bilf_btn").value = "Use BiLF16 List";
	id("back_btn").style.visibility = 'visible';
	id("tucNext").style.visibility = 'hidden';
    id("modbus").style.display = 'none';
    id("regedit").style.display = 'block';
    id("pointslist").style.display = 'none';
    id("regset").style.display = 'block';
    id("c0e").style.display = 'none';
    id("success").style.display = 'none';
    id("printNice").style.display = 'block';
    populate_menus();

    if(id("menu2").options.length == 0) {
        id("order").style.display = 'block';
    }
    else {
        build_summary();
    }
}

function show_regset_load_fail() {
    alert("can't load modbus register list");
    }


function hideList() {
    if(document.getElementsByName("mprt")[0].checked == true) {
        id("modbus").style.display = 'block';
    }
    else {
        id("dnp").style.display = 'block';
        show_btns();
    }
    
    id("regedit").style.display = 'none';
    id("regset").style.display = 'none';
    id("pointslist").style.display = 'none';
    id("printNice").style.display = 'none';

    fileupload_status_clear();
	clrSearch(1);
	clrSearch(2);
}

function populate_menus() {
    var isModbus = document.getElementsByName("mprt")[0].checked;
    var type = (isModbus) ? 0 : id("dnp_t").value;
    var list = col.lists[type];
    var order = ord.lists[type];
    var idx;
    var regnum;
    var menu1 = id("menu1");
    var menu2 = id("menu2");

    menu1.options.length = 0;
    menu2.options.length = 0;

    // populate menu1 from catalog
    for (var j = 0;  j < list.vec.length;  j++) {   // for each vector entry...
        menu1.options[menu1.options.length]
          = new Option(get_name(list.vec[j].dbIdx, list.vec[j].calcType),
            list.vec[j].dbIdx);
    }
	preFilter1 = menu1.cloneNode(true);  // Preserve menu1

    // populate menu2
    if(order.vec != null) {
        for(j=0; j < order.vec.length; j++) {
            regnum = (isModbus) ? String(col.lists[0].address + j) : pad(j,3);
            menu2.options[menu2.options.length]
               = new Option(regnum + " "
                 + get_name(order.vec[j].dbIdx, order.vec[j].calcType),
                   order.vec[j].dbIdx);
            idx = get_idx(list, order.vec[j].dbIdx, order.vec[j].calcType);
            if(idx != null) {
                // Gray the item in the "Available" menu
                menu1.options[idx].style.color = '#aaa';
            }
        }
    }
    
    menu2.options[menu2.options.length] = new Option("End of list", 999);
    menu2.options[menu2.options.length-1].style.color = '#aaa';
	preFilter2 = menu2.cloneNode(true);  // Preserve menu2
}


function get_name(idx, calcType) {
    function comparable_of(x,y) {
        return JSON.stringify([x,y]);
    }
    function build_filter() {
        var a = [];
        pfilter.forEach( function(e) {a.push(comparable_of(e[0],e[1]))} );
        return a;
    }
    function get_prefix(){
        if ((mset==5) && (calcType==35)) {
            return build_filter().includes(comparable_of(idx, calcType)) ? 
                "Normalized " : "";
        } else {
            return "";
        }
    }
    function get_suffix() {
        // return suffix[calcType] || "";
        for(var i=0; i<suffix.length; i++) {
            if(calcType == suffix[i].calcType) {
                return suffix[i].desc;
            }
        }
        return "";
    }

    var DBNames = (id("regset").style.display == "block")
      ? modbusDBNames : dnpDBNames;
    var pfilter = (id("regset").style.display == "block")
      ? mbCat16_P3_AI : dnpCatalog_P3_AI;

    name = (idx >= 2048) ? DBNames[idx - 2048] : staticDBNames[idx];
    return get_prefix() + name + get_suffix();
}

function get_idx(list, idx, calctype) {

    for(var i=0; i < list.vec.length; i++) {
        if(list.vec[i].dbIdx == idx && list.vec[i].calcType == calctype) {
            return i;
        }
    }
    return null;
}

function renumber() {
    var menu2 = id("menu2");
    var regnum = (document.getElementsByName("mprt")[0].checked == true)?(col.lists[0].address):0;
    var numdigs = (document.getElementsByName("mprt")[0].checked == true)?5:3;

    for(var i=0; i<menu2.options.length-1; i++){
        menu2.options[i].text = pad(regnum + i, numdigs) + menu2.options[i].text.slice(numdigs);
    }
}

function insertOption(x, text, value, before)
{
    var y=document.createElement('option');
    y.text = text;
    y.value = value;

        try
        {
            x.add(y, before);
        }
        catch(ex)
        {
            x.add(y, before.index);
        }

}

function getLength(thing) {
    var sum = 0;
    for(var i=0; i < thing.lists.length; i++) 
        sum += thing.lists[i].vec.length;
    return sum;
}

function listTooLong(protocol) {
    var limit = listLimits[(protocol)?0:1] * 1.5;

    if(getLength(ord) > limit ) {
        alert("List length limit reached");
        return true;
    }
    return false;
}

function right() {
    var isModbus = document.getElementsByName("mprt")[0].checked;
    var menu1 = id("menu1");
    var menu2 = id("menu2");
    var num = (isModbus) ? "00000" : "000";
    var sel;
    var type = (isModbus) ? 0: id("dnp_t").value;
	var searchStr1 = id("search1").value;
	var searchStr2 = id("search2").value;

    if(ord.lists[type].vec == null) {
        ord.lists[type].vec = [];
    }

	// Clear filtering for correct menu indexing
	if(searchStr1 != "")
		restore_menu(1);
	if(searchStr2 != "")
		restore_menu(2);
	

    for (var i=0; i<menu1.length ; i++){
        if (menu1.options[i].selected == true ) {
            if(listTooLong(isModbus))
                break;

            sel = find_selected(menu2);
            if(sel == -1) {
                sel = menu2.options.length-1;
            }
            insertOption(menu2, num + " " + menu1.options[i].text, i, menu2.options[sel]);
            ord.lists[type].vec.splice(sel,0, col.lists[type].vec[i]);
            menu1.options[i].style.color = '#aaa';
            menu1.options[i].selected = false;
            sel = (i+1 < menu1.options.length)?(i+1):(menu1.options.length-1);
        }
    }
    menu1.options[sel].selected = true;
    renumber();
	
	preFilter2 = menu2.cloneNode(true);  // Preserve menu2
	
	// Reapply filtering
	if(searchStr1 != "")
		filterMenu(null,1);
	if(searchStr2 != "")
		filterMenu(null,2);
}
 
function left() {
    var type = (document.getElementsByName("mprt")[0].checked == true)
      ? 0 : id("dnp_t").value;
    var cat = col.lists[type];
    var menu1 = id("menu1");
    var menu2 = id("menu2");
    var order = ord.lists[type];
    var singular;
    var sel;
	var searchStr1 = id("search1").value;
	var searchStr2 = id("search2").value;
	var idx;
    
	// Clear filtering for correct menu indexing
	if(searchStr1 != "")
		restore_menu(1);
	if(searchStr2 != "")
		restore_menu(2);
    
    for (var i=0; i<menu2.options.length-1 ; i++){
        // Determine whether selected values appear somewhere else in menu2 list
        singular = true;
        if (menu2.options[i].selected == true ) {
            for(var j=0; j<order.vec.length; j++) {
                if( menu2.options[j].selected == false 
                    && order.vec[j].dbIdx == order.vec[i].dbIdx 
                    && order.vec[j].calcType == order.vec[i].calcType) {
                        singular = false;
                }
            }

            // For selected singular items in menu2 list,
            //  set their corresponding items to black
            if(singular) {
                for(j=0; j<cat.vec.length; j++) {
                    if(cat.vec[j].dbIdx == order.vec[i].dbIdx
                      && cat.vec[j].calcType == order.vec[i].calcType) {
                        menu1.options[j].style.color = 'black';
                    }
                }
            }
        }
    }

    // Now remove all selected items from menu2 list
    for ( i=(menu2.length-2); i>=0; i--) {
        if (menu2.options[i].selected == true ) {
            menu2.options[i] = null;
            ord.lists[type].vec.splice(i,1);
            sel = i;
        }
    }
    if(sel < menu2.options.length - 1) {
        menu2.options[sel].selected = true;
    }
    menu1.focus();
    renumber();
	
	preFilter2 = menu2.cloneNode(true);  // Preserve menu2
	
	// Reapply filtering
	if(searchStr1 != "")
		filterMenu(null,1);
	if(searchStr2 != "")
		filterMenu(null,2);
}

function move(direction) {
	var m1 = id("menu1");
    var m2 = id("menu2");
    var type = (document.getElementsByName("mprt")[0].checked == true)
      ?0:id("dnp_t").value;
    var m2len = m2.length ;
    if(ord.lists[type].vec == null) {
        ord.lists[type].vec = [];
    }
    var s = ord.lists[type].vec;
    
    if(m2len <= 0) {
        return;
    }

	var searchStr2 = id("search2").value;
	if(searchStr2 != "")
		restore_menu(2);	

    if(direction == "up") {
        if(m2.options[0].selected == true) {
            return;
        }
        for (var i=0; i<m2len-1 ; i++){
            if (m2.options[i].selected == true ) {
                insertOption(m2, m2.options[i].text, m2.options[i].value, m2.options[i-1]);
                m2.options[i-1].selected = true;
                m2.options[i+1] = null;
                s.splice(i-1,0,s[i]);
                s.splice(i+1,1);
            }
        }
        
        // scroll menu to top selected item (only workes in IE)
        for(i=m2.options.length-1; i>=0; i--) {
            if(m2.options[i].selected == true) {
                for(var j=0; j<4; j++) {
                    if(i-j >= 0) {
                        m2.options[i-j].selected = !m2.options[i-j].selected;
                        m2.options[i-j].selected = !m2.options[i-j].selected;
                    }
                }
            }
        }

    }
    else if(direction == "down") {
        if(m2.options[m2len-2].selected == true) {
            return;
        }
        for (var i=m2len-3; i>=0 ; i--){
            if (m2.options[i].selected == true ) {
                insertOption(m2, m2.options[i].text, m2.options[i].value, m2.options[i+2]);
                m2.options[i+2].selected = true;
                m2.options[i] = null;
                s.splice(i+2,0,s[i]);
                s.splice(i,1);
            }
        }
        
        // Scroll menu to last selected item (only workes in IE)
       for(i=m2.options.length-1; i>=0; i--) {
            if(m2.options[i].selected == true) {
                for(var j=0; j<12; j++) {
                    if(i-j >= 0) {
                        m2.options[i-j].selected = !m2.options[i-j].selected;
                        m2.options[i-j].selected = !m2.options[i-j].selected;
                    }
                }
				break;
			}
		}

    }
    
    renumber();
	preFilter2 = m2.cloneNode(true);  // Preserve menu2
	if(searchStr2 != "")
		filterMenu(null,2);
}

function setRunEn(idx) {
    var en = id("rEn"+idx).checked;
    ord.lists[5].vec[idx].rEnab = en;

	id("c0"+idx).disabled = !en;

    if(en)
        id("rowR"+idx).style.color = "black";
    else
        id("rowR"+idx).style.color = "#aaa";
}

function setFznEn(idx) {
    var en = id("fEn"+idx).checked;
    ord.lists[5].vec[idx].fEnab = en;
	for(var i=0; i<4; ++i)
		id("f"+i+idx).disabled = !en;
    if(en)
        id("rowF"+idx).style.color = "black";
    else
        id("rowF"+idx).style.color = "#aaa";
    
}

function build_summary() {
    var isModbus = document.getElementsByName("mprt")[0].checked;
    var type = (isModbus)?0:id("dnp_t").value;
    var hdr = id("header_tbl");
    var sub = id("subheader");
    var tbl = id("tbl_content");

    var newRow;
    var newCell;
    var cell = 0;
    var list = col.lists[type];
    var olist = ord.lists[type].vec;
    var isCNT = (list.type == "CNT")?true:false;
    var s = "&nbsp;";
    
    function addCell(content, class_name) {
        newCell = newRow.insertCell(cell++);
        newCell.innerHTML = content;
        newCell.className = class_name;
    }
	
	function list_gets_classes(thisList) {
		for(var i=0; i<getsAllClasses_list.length; ++i) {
			if(thisList.desc == getsAllClasses_list[i])
				return true;
		}
		return false;
	}
	
	function list_gets_db(thisList) {
		for(var i=0; i<getsDeadband_list.length; ++i) {
			if(thisList.desc == getsDeadband_list[i])
				return true;
		}
		return false;	
	}

    id("order").style.display = 'none';
    id("finish").style.display = 'block';
	id("ena_filr").style.display = 'none';
    sub.style.display = 'none';
	
	var scaling = document.getElementsByName(((protocol=="0")?"m":"d")+"scl")[0].checked;
	calcTypeNames = ((scaling)?calcTypeNamesOptimal:calcTypeNamesPrimary);

	if(calcTypeNames==calcTypeNamesOptimal) {
		var vscale = Number(document.getElementsByName(((protocol=="0")?"m":"d")+"esc")[0].value) + 1;
		var wscale = Number(document.getElementsByName(((protocol=="0")?"m":"d")+"wsc")[0].value) + 1;
		
		if(vscale < 3) {
			// the orig --> for(var i=0; voltOpt[i] != undefined; ++i)
			// new for pole top
			for(var i=0; i < 3; ++i)
			calcTypeNames[voltOpt[i][0]] = voltOpt[i][vscale];
		}
		// new for pole top	--> calcTypeNames[B16_2S_150_M150], "B16_2S_24_M24");
		// see function build_calcTypeNames_helper() in u_db.c
		else {	// dynamically changes the label of the calctype name
			for(var i=3; i < 6; ++i)
				calcTypeNames[voltOpt[i-3][0]] = voltOpt[i][2];
				
			calcTypeNames[37] = "B16_2S_20_M20";	// needs attention, [37]
		}
		
			
		for(var i=0; wattOpt[i] != undefined; ++i)
			calcTypeNames[wattOpt[i][0]] = wattOpt[i][wscale];
	}
	
    while(hdr.rows.length > 0) {
        hdr.deleteRow(0);
    }
    
    while(tbl.rows.length > 0) {
        tbl.deleteRow(0);
    }

    if(c0e_set == true) {
        setClass0(ord, id("c0e_val").value);
        c0e_set = false;
    }

    if(olist != null)
    {
        // Create header
        newRow = hdr.insertRow(hdr.rows.length);
        addCell((isModbus)?"Register":"DNP Point", "label6");
    
        if(isCNT) {
            addCell("Enabled", "label6");
			id("ena_filr").style.display = 'block';
		}

        addCell("Measurement", "label21");

        for(var j=0; j<list.serdes.length; j++) {
            switch(list.serdes[j])
            {
                case "calcType":
                {
                    addCell("Calc Type", "label4");
                    break;
                }

                case "classMask":
                {
                    addCell("Class", "tb_header");
                    sub.style.display = 'block';
                    break;
                }

                case "deadband":
                {
					if(list_gets_db(list)) {
						addCell("&nbsp", "label7");
						addCell("Deadband", "label2");
					}
                    break;
                }
            }
        }

        // Put content into table
        for(var i=0; i<olist.length; i++) {
        
            newRow = tbl.insertRow(tbl.rows.length);
            cell = 0;
            
            // DNP Point num
            addCell((isModbus)?(col.lists[0].address + i):(pad(i,3)), "label13");
            
            // Counter enable
            if(isCNT)
                addCell(s, "form");

            // Measurement name string
            addCell('<input type="hidden" name="m'+i+'" value="' + olist[i].dbIdx + '"/>' + get_name(olist[i].dbIdx, olist[i].calcType), "label12");

            if(isCNT && olist[i].dbIdx != NEWO_RESERVED) {
                newRow = tbl.insertRow(tbl.rows.length);
                newRow.setAttribute('id', 'rowR'+i);
                cell = 0;
                addCell(s, "form"); // Point number
                addCell('<input type="checkbox" name="rEn'+i+'" id="rEn'+i+'" value="0" '+((olist[i].rEnab)?"checked":"")+' onclick="setRunEn('+i+');" />', "label6");
                addCell(s+s+s+s+'Running', "label12");  // Measurement name             
            }

            // Conditional items:
            for(var j=0; j<list.serdes.length; j++) {

                if (olist[i].dbIdx == NEWO_RESERVED)
                    continue;
            
                switch(list.serdes[j]) 
                {
                    // Calc Type
                    case "calcType":
                    {
                        addCell(calcTypeNames[olist[i].calcType], "label16");
                        break;
                    }

                    // Class Mask
                    case "classMask":
                    {
                        addCell('<input type="checkbox" name="c0'+i+'" id="c0'+i+'" value="0" '+((olist[i].classMask & 8)?"":"checked")+' onclick="setClass('+i+',\'c0\');" />', "label7");
						if(list_gets_classes(list)) {
							addCell('<input type="checkbox" name="c1'+i+'" id="c1'+i+'" value="1" '+((olist[i].classMask & 1)?"checked":"")+' onclick="setClass('+i+',\'c1\');" />', "label7");
							addCell('<input type="checkbox" name="c2'+i+'" id="c2'+i+'" value="2" '+((olist[i].classMask & 2)?"checked":"")+' onclick="setClass('+i+',\'c2\');" />', "label7");
							addCell('<input type="checkbox" name="c3'+i+'" id="c3'+i+'" value="3" '+((olist[i].classMask & 4)?"checked":"")+' onclick="setClass('+i+',\'c3\');" />', "label7");
						}
                        break;
                    }

                    // Deadband
                    case "deadband":
                    {
						if(list_gets_db(list)) {
							addCell("&nbsp", "label7");
							addCell(db_names[olist[i].deadband], "label14");
						}
                        break;
                    }

                }
            }
            
            if(isCNT && olist[i].dbIdx != NEWO_RESERVED) {
                setRunEn(i);
                newRow = tbl.insertRow(tbl.rows.length);
                newRow.setAttribute('id', 'rowF'+i);
                cell = 0;
                addCell(s, "form"); // Point number
                addCell('<input type="checkbox" name="fEn'+i+'" id="fEn'+i+'" value="0" '+((olist[i].fEnab)?"checked":"")+' onclick="setFznEn('+i+');" />', "label6");
                addCell(s+s+s+s+'Frozen', "label12");   // Measurement name
                addCell(calcTypeNames[olist[i].fcalcType], "label16");        // CalcType
                addCell('<input type="checkbox" name="f0'+i+'" id="f0'+i+'" value="0" '+((olist[i].fclassMask & 8)?"":"checked")+' onclick="setClass('+i+',\'f0\');" />', "label7");
				addCell('<input type="checkbox" name="f1'+i+'" id="f1'+i+'" value="1" '+((olist[i].fclassMask & 1)?"checked":"")+' onclick="setClass('+i+',\'f1\');" />', "label7");
				addCell('<input type="checkbox" name="f2'+i+'" id="f2'+i+'" value="2" '+((olist[i].fclassMask & 2)?"checked":"")+' onclick="setClass('+i+',\'f2\');" />', "label7");
				addCell('<input type="checkbox" name="f3'+i+'" id="f3'+i+'" value="3" '+((olist[i].fclassMask & 4)?"checked":"")+' onclick="setClass('+i+',\'f3\');" />', "label7");
				addCell("&nbsp", "label7");
                setFznEn(i);
				newRow = tbl.insertRow(tbl.rows.length);
				cell=0;
				addCell("&nbsp", "label7");
                continue;
            }
        }
    }
}

function setClass(idx, cls) {
    var list = ord.lists[id("dnp_t").value];
    var mask = (cls.charAt(0) == "c") ? list.vec[idx].classMask : list.vec[idx].fclassMask;

  if(cls.charAt(1) == "0")	// if class 0 was clicked...
        mask ^= 8;				// toggle the class 0 box
  else {					// otheriwse...
      if(mask & (1 << (cls.charAt(1)-1)))       // if Class is already set, then clear it
          mask ^= (1 << (cls.charAt(1)-1));
      else                            			// Class is not set, so set Class 0 (bit 3), clear Classes 1 - 3 (bits 0 - 2), and set selected bit.
          mask = (1 << (cls.charAt(1)-1));
  }

    if(cls.charAt(0) == "c")
        list.vec[idx].classMask = mask;
    else
        list.vec[idx].fclassMask = mask;
    
	id(cls.charAt(0) + "0" + idx).checked = (mask >>> 3)?false:true;

	for(var i=1; i<4; i++)
		id(cls.charAt(0) + i + idx).checked = (mask & (1 << (i-1)))?true:false;

}

function build_it() {

    if(id("order").style.display == 'block') {
        populate_menus();
    }
    else if(id("finish").style.display != 'none') {
        build_summary();
    }   
	clrSearch(1);
	clrSearch(2);
}

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

function edit_regs() {
    var sel = id("dnp_t").value;
    populate_dnp_type_list(false);
    id("dnp_t").value = sel;
    populate_menus();
    id("order").style.display = 'block';
    id("finish").style.display = 'none';
    id("printNice").style.display = 'none';
    fileupload_status_clear();
}

function serialize() {
    var s = id("serCollection");
    s.value = serCollection(ord);
}

function setMask() {
    var ses;
    var isModbus = document.getElementsByName("mprt")[0].checked;

	function c0Invalid(val) {
		if((0 <= val && val <= 15) || val == 16384)
			return false;
		return true;
	}

    if(ord.lists[0].vec.length > 0) {
        if(!confirm("This will overwrite your selected "
          + (isModbus ? "list" : "lists for ALL DNP Types")
          + ". Continue?"))
            return;
    }

    if(isModbus) {
        ses = id("mpli").value;
        ord = filterCol(desCollection (mbBilf16), "ord");
        ord.name = "mbOrder_" + ses;
    }
    else {
		if(c0Invalid(id("c0e_val").value)) {
			alert("Class 0 Enable mask must be (0..15) or 16384");
			return;
		}
        ses = id("dses").value;
        ord = filterCol(desCollection (dnpBilf), "ord");
        ord.name = "dnpOrder_" + ses;
    }

    populate_menus();
    id("mnu_btns").style.display = 'none';
    id("c0e").style.display = 'none';
    c0e_set = true;
    id("success").style.display = 'block';
    setTimeout(function(){show_btns();}, 3000);
}

function useBilf() {
    if(document.getElementsByName("mprt")[0].checked == true) {
        setMask();
    }
    else {
        var dform = id("dform");
        var j=0;

        id("mnu_btns").style.display = 'none';
        id("c0e").style.display = 'block';
        id("menu2").selectedIndex = -1;
    }
	filterMenu(null,1);
	clrSearch(2);
}

function show_btns() {
    id("success").style.display = 'none';
    id("mnu_btns").style.display = 'block';
    id("c0e").style.display = 'none';
}

function clr() {
    var type = (document.getElementsByName("mprt")[0].checked == true)?0:id("dnp_t").value;
    
    if(ord.lists[type].vec.length > 0) {
        if(!confirm("This will clear your selected list. Continue?")) {
            return;
        }
    }

    ord.lists[type].vec.length = 0;
    populate_menus();
	filterMenu(null,1);
	clrSearch(2);
}

function addResvd() {
    var menu2 = id("menu2");
    var isModbus = document.getElementsByName("mprt")[0].checked;
    var type = (isModbus)?0:id("dnp_t").value;

    if(listTooLong(isModbus))
        return;

    var resvd = {};
    var list = ord.lists[type];
    for (var i = list.serdes.length;  i--;  )
        resvd[list.serdes[i]] = 0;
    resvd.dbIdx = NEWO_RESERVED;
    
    if(list.vec == null) {
        list.vec = [];
    }

    var selected = find_selected(menu2);
    if(selected == -1) {
        selected = menu2.options.length-1;
    }
    list.vec.splice(selected,0, resvd);
    
    var num = (isModbus)?"00000":"000";
    insertOption(menu2, num + " Reserved", NEWO_RESERVED, menu2.options[selected]);
	menu2.selectedIndex = -1;
	if(selected >= 0 && selected < menu2.length-2)
		menu2.options[selected+1].selected = true;
    renumber();
}

function go_next() {
    var sel = id("dnp_t").value;
    populate_dnp_type_list(true);
    id("dnp_t").value = sel;
	id("tucNext").style.visibility = 'hidden';
	id("back_btn").style.visibility = 'visible';
    id("printNice").style.display = 'block';
    build_summary();
	clrSearch(1);
	clrSearch(2);
}

function find_selected(menu) {
    if(menu==null)
        return -1;
        
    for(var i=0;i<menu.options.length; i++) {
        if(menu.options[i].selected == true) {
            return i;
        }
    }

    return -1;
}

function slctAll() {
	var menu1 = id("menu1");

	for(var i=0; i<menu1.length; ++i)
		menu1.options[i].selected = true;
}

function setScroll() {
    if(id("tblDiv").style.overflow == "auto") {
        id("tblDiv").style.overflow = "visible";
        id("tblDiv").style.height = "auto";
        id("printNice").innerHTML="<a href='#'>autoscrolling</a>";
    }
    else {
        id("tblDiv").style.overflow = "auto";
        id("tblDiv").style.height = "300px";
        id("printNice").innerHTML="<a href='#'>printer friendly</a>";
    }
}

function filterMenu(e, m)
{
	if(m == null || m < 1 || m > 2)
		return;
	
	var menu = id("menu" + m);
	var searchStr = id("search" + m).value;
    var key;
	
	if(e != null)
	{
		if(window.event) {
			key = window.event.keyCode; //IE
		}
		else {
			key = e.which; //firefox
		}
		
		if(key == 8 || key == 16)
			restore_menu(m);
	}
		
	
	for ( var i=(menu.length-1); i>=0; i--)
		{
		if(menu.options[i].text.search(new RegExp(searchStr, "i")) == -1)
			menu.options[i] = null;
		}
	
	if(m == 2)
		{
		id("up").disabled = (searchStr == "")?false:true;
		id("down").disabled = (searchStr == "")?false:true;
		}
}

function clrSearch(m)
{
	if(m == null || m < 1 || m > 2)
		return;
	
	id("search" + m).value = "";
	restore_menu(m);
	
	if(m == 2)
		{
		id("up").disabled = false;
		id("down").disabled = false;
		}

}

function saveSelections(menu)
{
    if(menu==null)
        return -1;
	
	var selArr = [];
        
    for(var i=0;i<menu.options.length; i++) {
        if(menu.options[i].selected == true) {
            selArr.splice(selArr.length,0,menu.options[i].text);
        }
    }

    return selArr;
}

function restore_menu(m)
{
	if(m == null || m < 1 || m > 2 || ord==null)
		return;
	
	var menu = id("menu" + m);
	var isModbus = document.getElementsByName("mprt")[0].checked;
    var type = (isModbus) ? 0 : id("dnp_t").value;
    var order = ord.lists[type];
	var cat = col.lists[type];
	var idx;
	var pre = (m == 1)?preFilter1:preFilter2;
	
	// Preserve selections
	var sel = saveSelections(menu);
	
	// clear old menu contents
	menu.options.length = 0;
	
    // populate menu from pre-filtered list
    for (var j = 0; j < pre.options.length; j++) {   // for each vector entry...
        menu.options[menu.options.length]
          = new Option(pre.options[j].text, pre.options[j].value);
    }
	
	if(m == 1)
	{
		if(order.vec != null) {
			for(j=0; j < order.vec.length; j++) {
				idx = get_idx(cat, order.vec[j].dbIdx, order.vec[j].calcType);
				if(idx != null) {
					// Gray the item in the "Available" menu
					menu.options[idx].style.color = '#aaa';
				}
			}
		}
	}
	// restore selections
	restoreSelections(menu, sel);
}

function restoreSelections(menu, selArr)
{
    if(menu==null || selArr == null)
        return -1;

	for(var i=0;i<selArr.length; i++) 
		{
		for(var j=0; j<menu.options.length; j++)
			{
			if(menu.options[j].text == selArr[i])
				menu.options[j].selected = true;
			}
		}
	
	return 0;
}
