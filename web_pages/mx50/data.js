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
		setTimeout(function(){check_status(http_request, ++tries);}, 249);
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