var valid_value	= new Array(52);
var set_arr;
var protocol;
var sesnMsg = "This session\'s configuration will be restored to factory defaults and applied. Continue?";
var scl_init=[true,true];

function parse_vars(data) {
	var parsed = data.split( "\n" );
	protocol = parsed[0];
	var serial_port = parsed[1].split("")[0];
	var eth_prot = parsed[1].split("")[1];
	var pending_changes = parsed[1].split("")[2];
	if(parsed[1].split("")[3] =="1") {id("logout").style.display = 'block';}
	var scaling=parsed[3];
	var sesn = (protocol==0)?id("mses"):id("dses");
	var type = (protocol==0)?id("mtyp"):id("dtyp");
	type.options.length = 0;
	if(protocol==0) {		// Modbus
		id("modbus").style.display = 'block';
		id("dnp").style.display = 'none';
//												txtbox	chars	valid	valid
//					 name	type		 value	len		mxlen	min_idx	max_idx		
		set_arr =[	["mtyp", "dropdown",	,	,		,		,		 ],
					["msla", "text"	,		,	6,		5,		0,		1],
					["mpli", "dropdown",	,	,		,		,		 ],
					["mtgr", "text",		,	6,		5,		2,		3],
					["mrft", "text",		,	6,		5,		4,		5],
					["mmIP", "ipaddr",		,	13,		15,		,		 ],
					["mmPt", "text",		,	6,		5,		6,		7],
					["mict", "text",		,	6,		3,		8,		9],
					["mdl1", "text",		,	6,		3,		10,	   11],
					["mdl2", "text",		,	6,		3,		10,	   11],
					["mmhr", "text",		,	6,		3,		12,	   13],
					["mmhw", "text",		,	6,		3,		14,	   15]
				];
		var p=document.getElementsByName("mprt");
		p[protocol].checked = true;
		set_arr[0][2] = parsed[4].split("");
		type.options[0] = new Option("Disabled",255);
		if(eth_prot == 1) {
			for(var i=1; i<8; i++)
				sesn.options[i] = new Option(String(i+1),i);
			type.options[type.options.length] = new Option("TCP", 0);
		}
		if(serial_port == 1) {
			type.options[type.options.length] = new Option("ASCII", 1);
			type.options[type.options.length] = new Option("RTU", 2);
		}
		if(!is_in_list(type, (set_arr[0][2])[parsed[2]])) {
			type.value = 255;
		}
		else {
			type.value = (set_arr[0][2])[parsed[2]];
		}
		sesn.value = Number(parsed[2]);
		for(var i=1;i<set_arr.length;i++) {
			var f = id(set_arr[i][0]);
			set_arr[i][2] = parsed[i+4];
			if(set_arr[i][1] == "dropdown") {
				f.value = set_arr[i][2];
			}
			else if(set_arr[i][1] == "checkbox") {
				f.innerHTML = '<input type="checkbox" '
                            + 'name="' +set_arr[i][0]+'" '
                            + ((set_arr[i][2]>0) ? "checked " : " ")
                            + 'onKeyPress="return checkKey(event)"/>';
			}
			else if(set_arr[i][1] == "text") {
				f.innerHTML = '<input type="text" '
                            + 'name="'+set_arr[i][0]+'" '
                            + 'size="'+set_arr[i][3]+'" '
                            + 'maxlength="'+set_arr[i][4]+'" '
                            + 'value="'+set_arr[i][2]+'" '
                            + 'onKeyPress="return checkKey(event)"/>';
				f.className = "";
			}
			else if(set_arr[i][1] == "ipaddr") {
				f.innerHTML = '<input type="text" '
                            + 'name="'+set_arr[i][0]+'" '
                            + 'size="'+set_arr[i][3]+'" '
                            + 'maxlength="'+set_arr[i][4]+'" '
                            + 'value="'+set_arr[i][2]+'" '
                            + 'onKeyPress="return checkKey(event)" '
                            + 'onblur="zero_ip(this)"/>';
				f.className = "";
			}
		}
		ena_form(type.value, 'mform');
		for(i=0;i<parsed.length;i++) {
			valid_value[i] = parsed[set_arr.length+4+i];
		}
		if(scl_init[protocol]) {
			document.getElementsByName('mscl')[scaling.split(" ")[0]].checked = true;
			en_scl('m', id('mscl').checked);
			set_scl('m', scaling);
			scl_init[protocol]=false;
		}
	}
	else if(protocol==1) {	// DNP
		id("d_adv").style.display = 'none';
		id("dnp").style.display = 'block';
		id("modbus").style.display = 'none';
		//			name	type		value	len		mxlen	min_idx	max_idx
		set_arr =[	["dtyp", "dropdown",	,		,		,		,		],
					["src", "text",			,		6,		5,		0,		1],
					["dst", "text",			,		6,		5,		0,		1],
					["tgr", "text",			,		6,		5,		2,		3],
					["tg1", "text",			,		6,		5,		4,		5],
					["lsP", "text",			,		6,		5,		6,		7],
					["vSA", "checkbox",		,		,		,		,		],
					["eSA", "checkbox",		,		,		,		,		],
					["dOE", "checkbox",		,		,		,		,		],
					["alR", "checkbox",		,		,		,		,		],
					["alT", "checkbox",		,		,		,		,		],
					["sNT", "checkbox",		,		,		,		,		],
					["dpc", "percent",		,		6,		5,		48,		49],
					["dnc", "percent",		,		6,		5,		48,		49],
					["dvt", "percent",		,		6,		5,		48,		49],
					["dpr", "percent",		,		6,		5,		48,		49],
					["dpa", "percent",		,		6,		5,		48,		49],
					["dfr", "percent",		,		6,		5,		48,		49],
					["dms", "percent",		,		6,		5,		48,		49],
					["ndT", "text",			,		6,		5,		8,		9],
					["apC", "text",			,		6,		5,		10,		11],
					["slc", "text",			,		6,		5,		12,		13],
					["uEN", "checkbox",		,		,		,		,		],
					["inN", "checkbox",		,		,		,		,		],
					["c1E", "text",			,		6,		3,		14,		15],
					["c1T", "text",			,		6,		5,		16,		17],
					["c2E", "text",			,		6,		3,		14,		15],
					["c2T", "text",			,		6,		5,		16,		17],
					["c3E", "text",			,		6,		3,		14,		15],
					["c3T", "text",			,		6,		5,		16,		17],
					["mxR", "text",			,		6,		5,		18,		19],
					["rTO", "text",			,		6,		5,		20,		21],
					["olT", "text",			,		6,		5,		20,		21],
					["o01", "dropdown",		,		,		,		,		],
					["o02", "dropdown",		,		,		,		,		],
					["o10", "dropdown",		,		,		,		,		],
					["o20", "dropdown",		,		,		,		,		],
					["o21", "dropdown",		,		,		,		,		],
					["o23", "dropdown",		,		,		,		,		],
					["o30", "dropdown",		,		,		,		,		],
					["o32", "dropdown",		,		,		,		,		],
					["o40", "dropdown",		,		,		,		,		],
					["rFg", "text",			,		8,		4,		22,		23],
					["tFg", "text",			,		8,		4,		24,		25],
					["rFm", "text",			,		8,		3,		26,		27],
					["tFm", "text",			,		8,		3,		26,		27],
					["rFT", "text",			,		8,		5,		28,		29],
					["fCT", "text",			,		8,		5,		30,		31],
					["lCM", "dropdown",		,		,		,		,		],
					["lCT", "text",			,		8,		5,		32,		33],
					["lkR", "text",			,		8,		3,		34,		35],
					["olP", "text",			,		8,		5,		36,		37],
					["mIP", "ipaddr",		,		13,		15,		,		],
					["mPt", "text",			,		13,		5,		38,		39],
					["iCT", "text",			,		13,		5,		40,		41],
					["uIP", "ipaddr",		,		13,		15,		,		],
					["lPt", "text",			,		13,		5,		42,		43],
					["dPt", "text",			,		13,		5,		44,		45],
					["uUP", "text",			,		13,		5,		46,		47],
					["uVd", "checkbox",		,		,		,		,		]
					];
		var p=document.getElementsByName("dprt");
		var type = id("dtyp");
		protocol = parsed[0];
		p[protocol].checked = true;
		set_arr[0][2] = parsed[4].split("");
		type.options[0] = new Option("Disabled", 0);
		if(serial_port == 1) {
			type.options[type.options.length] = new Option("Serial", 1);
		}
		if(eth_prot == 1) {
			sesn.options[1] = new Option("2",1);
			sesn.options[2] = new Option("3",2);
			type.options[type.options.length] = new Option("TCP", 2);
			type.options[type.options.length] = new Option("UDP", 3);
		}
		if(!is_in_list(type, (set_arr[0][2])[parsed[2]])) {
			type.value = 0;
		}
		else {
			type.value = (set_arr[0][2])[parsed[2]];
		}
		
		sesn.value = Number(parsed[2]);
		for(var i=1;i<set_arr.length;i++) {
			var f = id(set_arr[i][0]);
			set_arr[i][2] = parsed[i+4];
			if(set_arr[i][1] == "dropdown") {
				f.value = set_arr[i][2];
			}
			else if(set_arr[i][1] == "checkbox") {
				f.innerHTML = '<input type="checkbox" '
                            + 'name="'+set_arr[i][0]+'" '
                            + ((set_arr[i][2]>0) ? 'checked ' : '')
                            + 'onKeyPress="return checkKey(event)"/>';
			}
			else if(set_arr[i][1] == "text") {
				f.innerHTML = '<input type="text" '
                            + 'name="'+set_arr[i][0]+'" '
                            + 'size="'+set_arr[i][3]+'" '
                            + 'maxlength="'+set_arr[i][4]+'" '
                            + 'value="'+set_arr[i][2]+'" '
                            + 'onKeyPress="return checkKey(event)"/>';
				f.className = "";
			}
			else if(set_arr[i][1] == "ipaddr") {
				f.innerHTML = '<input type="text" '
                            + 'name="'+set_arr[i][0]+'" '
                            + 'size="'+set_arr[i][3]+'" '
                            + 'maxlength="'+set_arr[i][4]+'" '
                            + 'value="'+set_arr[i][2]+'" '
                            + 'onKeyPress="return checkKey(event)" '
                            + 'onblur="zero_ip(this)"/>';
				f.className = "";
			}
		}
		
		if(scl_init[protocol]) {
			document.getElementsByName('dscl')[scaling.split(" ")[0]].checked = true;
			en_scl('d', id('dscl').checked);
			set_scl('d', scaling);			
			scl_init[protocol]=false;
		}
		
		ena_form(type.value, 'dform');
		for(var i=0;i<valid_value.length;i++) {
			valid_value[i] = parsed[set_arr.length+4+i];
		}
		
		id("adv_btn").value = "Advanced";
	}
	
	check_pending(pending_changes);

}

function is_in_list(list, val) {
	for(var i=0; i<list.options.length; i++) {
		if(list.options[i].value == val)
			return true;
	}
	return false;
}

function sendRequest(prot,sesn)
{
	var poststr = "ses=" + sesn;
	if(prot=="protocol") {
		makeRequest(nc("protocol.cgi"),poststr);
	}
	else if(prot=="modbus") {
		makeRequest(nc("modbus.cgi"),poststr);
	}
	else if(prot=="dnp") {
		makeRequest(nc("dnp.cgi"),poststr);
	}
}

function validate(f) {
	var invalid = false;
	var type = (protocol==0)?id("mtyp"):id("dtyp");
	var disabled = (protocol==0)?255:0;
	if(type.value == disabled) {
		return true;
	}
	else {
		id("adv_btn").value = "Advanced";
		id("d_adv").style.display = 'block';			
		
		for(var i=0; i<f.elements.length; i++) {
			var k = f.elements[i];
			for(var j=0; j<set_arr.length; j++) {
				if(k.name == set_arr[j][0]) {
					var g = id(set_arr[j][0]);
					if(set_arr[j][1] == "text" || set_arr[j][1] == "percent") {
						g.innerHTML = '<input type="text" '
                                    + 'name="'+set_arr[j][0]+'" '
                                    + 'size="'+set_arr[j][3]+'" '
                                    + 'maxlength="'+set_arr[j][4]+'" '
                                    + 'value="'+k.value+'"/>';
						var min_idx = set_arr[j][5];
                        var max_idx = set_arr[j][6];
						if(k.value >= Number(valid_value[min_idx]) && k.value <= Number(valid_value[max_idx])) {
							g.className = "success_msg";
							continue;
						}
                        else if(k.value == 0
                          && (set_arr[j][0] == "lPt"
                             || set_arr[j][0] == "dPt"
                             || set_arr[j][0] == "uUP"
                             ) ) {
							g.className = "success_msg";
							continue;
                        }
						else {
							g.innerHTML += '<b><a class="err_msg">'
                                        + 'Value must be within the range of '
                                        + valid_value[min_idx]
                                        + ' to '+valid_value[max_idx]
                                        + '</a></b>';
							g.className = "error";
							invalid = true;
							continue;
						}
					}
					else if(set_arr[j][1] == "ipaddr") {			
						g.innerHTML = '<input type="text" '
                                    + 'name="'+set_arr[j][0]+ '" '
                                    + 'size="'+set_arr[j][3]+ '" '
                                    + 'maxlength="'+set_arr[j][4]+'" '
                                    + 'value="'+f.elements[i].value+'"/>';
						if(validate_ip(f.elements[i].value)) {
							g.innerHTML += '<b><a class="err_msg">Invalid IP address.</a></b>';
							g.className = "error";
							invalid = true;
							continue;
						}
						else {
							g.className = "success_msg";
							continue;
						}
					}
				}	
			}
		}
		if(invalid) {
			alert("Please correct the red highlighted fields and resubmit.");
			return false;
		}
		else {
			return true;
		}
	}
}

function ena_form(val, fname)
{
    var f = id(fname);
	var disa = false;
	var sesn = (protocol==0)?id("mses"):id("dses");
	var type = (protocol==0)?id("mtyp"):id("dtyp");
	var this_sesn = sesn.value;
	var start = 0;
	this_sesn++;
	if(protocol==0) {
		if(type.value == 0) {
			id("tcp").style.display = 'block';
			id("serial").style.display = 'none';
		}
		else if(type.value == 1 || type.value == 2) {
			id("tcp").style.display = 'none';
			id("serial").style.display = 'block';
		}
		else {
			id("tcp").style.display = 'none';
			id("serial").style.display = 'none';
		}
		if(type.value > 0 && type.value < 3) {
			if(type.value == 1) {
				id("ict_row").style.display = 'none';
				id("dlm_blk").style.display = 'block';
			}
			else if(type.value == 2) {
				id("ict_row").style.display = 'block';
				id("dlm_blk").style.display = 'none';
			}
			for(var i=0;i<sesn.length;i++) {
				if(sesn.value == i)
					continue;
				else if((set_arr[0][2])[i] == 1 || (set_arr[0][2])[i] == 2) {
					if(!confirm("The maximum number of serial sessions is 1. "
                      + "Session "+(i+1)
                      + " will be disabled when changes are applied.")) {
						val = type.value = (set_arr[0][2])[sesn.value];
						id("tcp").style.display = 'block';
						id("serial").style.display = 'none';
					}
				}
			}
		}
		else {
				id("ict_row").style.display = 'none';
				id("dlm_blk").style.display = 'none';
		}
		if(val == 255) {
			disa = true;
		}
		vwedit();
	}
	else if(protocol==1) {
		if(type.value > 1) {
			id("tcpip").style.display = 'block';
			id("tcpip_adv").style.display = 'block';
		}
		else {
			id("tcpip").style.display = 'none';
			id("tcpip_adv").style.display = 'none';
		}
		if(type.value == 1) {
			for(var i=0;i<sesn.length;i++) {
				if(sesn.value == i)
					continue;
				else if((set_arr[0][2])[i] == 1) {
					if(!confirm("The maximum number of serial sessions is 1."
                      + "Session "+(i+1)
                      + " will be disabled when changes are applied.")) {
						val = type.value = (set_arr[0][2])[sesn.value];
						id("tcpip").style.display = 'block';
						id("tcpip_adv").style.display = 'block';
						id("ict_row").style.display = 'none';
						id("dlm_blk").style.display = 'none';
					}
				}
			}
		}
		if(val == 0) {
			disa = true;
		}
	}
	while(f.elements[start].name != type.name) start++;
	for(var i=start+1; i<f.elements.length; i++) {
		if(f.elements[i].type != "button" && f.elements[i].type != "submit")
		f.elements[i].disabled = disa;
	}
}

function hide_adv() {
	if(id("d_adv").style.display == 'block') {
		id("d_adv").style.display = 'none';
		id("adv_btn").value = "Advanced";
	}
	else {
		id("adv_btn").value = "Basic";
		id("d_adv").style.display = 'block';
	}
}

function vwedit() {
	if(id("mform").mpli.value > 2 
	  || document.getElementsByName("mprt")[1].checked == true ) {
		id("mform").ve_btn.value = "Edit Registers";
		id("back_btn").value = "Cancel";
	}
	else {
		id("mform").ve_btn.value = "View Registers";
		id("back_btn").value = "< Back";
	}
}

function rstor() {
	id("rdses").value = id("dses").value;
	id("rmses").value = id("mses").value;
}

function set_scl(prot, val) {
	var v=['i','v','p'];
	var values = val.split(" ");
	for(var i=0; i<v.length; i++) {
		id(prot+v[i]+'sc').value = values[i+1];
	}
}

function en_scl(prot, dsbl) {
	var v=['i','v','p'];
	var optres = id("dscl").checked;
	for(var i=0; i<v.length; i++) {
		id(prot+v[i]+'sc').disabled = dsbl;
	}


	if(prot=="d") {
		for(i=0; i<set_arr.length; ++i) {
			var f = id(set_arr[i][0]);
			if(set_arr[i][1] == "percent") {
				if(optres==true && set_arr[i][2] > valid_value[49])
					set_arr[i][2] = 100;
				var pct = (optres==true)?((set_arr[i][2]/100.0).toFixed(2)):(set_arr[i][2]);
				f.innerHTML = '<input type="text" name="'+set_arr[i][0]+'" size="'+set_arr[i][3]+'" maxlength="'+set_arr[i][4]+'" value="'+pct+'" onKeyPress="return checkKey(event)"/>';
				set_arr[i][5]=(optres==true)?(48):(50);
				set_arr[i][6]=(optres==true)?(49):(51);
				f.className = "";			
			}
		}
	}

}
