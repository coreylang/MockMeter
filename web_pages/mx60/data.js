var hb_new=0;
var hb_old=0;
var count=0;
var THRESHOLD = 1;
var cb_httpd_request = null;
var cb_tries = 0;

function check_status_249() {
    check_status(cb_httpd_request, ++cb_tries);
}

function check_status(http_request, tries) {
	if (http_request.readyState == 4 && http_request.status == 200) {
		 doSend = true;
	}
	else if(tries > 5) {
		http_request.abort;
		setTimeout("doSend = true;", 1000);
        tries = 0;
	}
	else {
        cb_httpd_request = http_request;
        cb_tries = tries;
		setTimeout(check_status_249, 249);
	}
}

function show_hide_column(tab_id, col_no, do_show) {
    var stl;
    if (do_show) stl = 'block';
    else         stl = 'none';

    var tbl  = id(tab_id);
    var rows = tbl.getElementsByTagName('tr');

    for (var row=0; row<rows.length;row++) {
		if(rows[row].getElementsByTagName('td')[col_no] != null)
			rows[row].getElementsByTagName('td')[col_no].style.display = stl;
	}
}

function show_hide_row(tab_id, row_no, do_show) {
	id(tab_id).getElementsByTagName('tr')[row_no].style.display = (do_show)?'block':'none';
}

function abort() {
	http_request.abort;
}

function set_health(hObj, hlth_word)
{
    var newCell;
	var ERR_TAB = [
				[0, "Analog output calibration error"],
				[2, "Gain calibration error"],
				[4, "Phase calibration error"],
				[12, "Firmware upgrade in progress"],
				[13, "Measurements offline"],
				[15, "Protocol configuration error"] ];

	hObj.innerHTML = hlth_word.substring(0,4)+' '+hlth_word.substring(4,8);
				

    while (ht.rows.length > 2)
        ht.deleteRow(2);

    if(hlth_word == 0)
        {
        hObj.style.backgroundColor = 'rgb(240,240,240)';
        newCell = id('err_box');
        newCell.innerHTML = '';
        newCell.className = '';
        }
    else
        {
		var newRow;
		var msg = "";
		var erno = 0;
        hObj.style.backgroundColor = 'yellow';
		id("err_box").innerHTML = '';

		for(i=0; i<ERR_TAB.length; ++i) {
			if(parseInt(hlth_word,16) & 1<<ERR_TAB[i][0]) {
				msg = ERR_TAB[i][1];
				++erno;
				if(erno == 1)
					newCell = id("err_box");
				else
				{
					newRow = ht.insertRow(ht.rows.length);
					newCell = newRow.insertCell(0);
					newCell = newRow.insertCell(1);
					newCell.style.color = 'white';
					newCell.style.border = '0';
					newCell = newRow.insertCell(2);
				}
				newCell.innerHTML = '<b><a class="err_msg">'+msg+'<\/a><\/b>';
				newCell.className = "error";
				newCell.style.width = '400';
			}
		}
    }	

}

function checkConnection()
{
	if(hb_new == hb_old)
		count++;
	else 
		count = 0;
	hb_old = hb_new;
	if(count > THRESHOLD)
		id("LostCon").style.visibility = 'visible';
	else
		id("LostCon").style.visibility = 'hidden';
}
