var http_request = false;
function id (v) {return document.getElementById(v)};
function nc (f) {return (f + "?ms=" + new Date().getTime())};

function alertContents(http_request) {
	if (http_request.readyState == 4) {
		if (http_request.status == 200) {
			parse_vars(http_request.responseText);
        }
    }
}

function makeRequest(url, parameters) {
	if (window.XMLHttpRequest) { // Mozilla, Safari,...
		http_request = new XMLHttpRequest();
		if (http_request.overrideMimeType) {
			http_request.overrideMimeType('text/html');
		}
	} else if (window.ActiveXObject) { // IE
		try {
			http_request = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try {
				http_request = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (e) {}
		}
	}

	if (!http_request) {
	 alert('Cannot create XMLHttpRequest object');
	}

	http_request.onreadystatechange = function() { alertContents(http_request); };

	if(parameters == null){
        http_request.open('GET', url, true);
        http_request.send(null);
	}
	else
	{
		http_request.open('POST', url, true);
		http_request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		http_request.send(parameters);
	}
}

function validate_ip(ip_addr) {
	var first=0, last=0;
	var octet=0, dots=0;
	for(var i=0;i<4;i++) {
		last=ip_addr.indexOf('.',first+1);
		if(last==-1) {
			if(dots < 3) {
				return true;
			}
			if( isNaN(ip_addr.substring(first)) == true )
			   return true;			
			octet = parseInt(ip_addr.substring(first));
		}
		else {
			if( isNaN(ip_addr.substring(first,last)) == true )
			   return true;
			octet = parseInt(ip_addr.substring(first,last));
			dots++;
		}
		if(octet > 255 || octet < 0 || dots > 3 || isNaN(octet)) {
			return true;
		}
		first=last+1;
	}
	return false;
}

function validate_subnet(addr) {
	function make_octet(bit)
	{
		return 255 ^ (Math.pow(2,bit)-1);
	}
	function build_ip(oct_num, oct_val)
	{
		var ip_temp = "";
		for(var i=0;i<4;i++)
		{
			if(oct_num == i)
				ip_temp += oct_val.toString();
			else if(i < oct_num)
				ip_temp += "255";
			else if(i > oct_num)
				ip_temp += "0";
			if(i < 3)
				ip_temp += ".";
		}
		return ip_temp;
	}
		
	for(var j=0;j<=4;j++)
	{
		for(var k=1;k<9;k++)
		{
			if(addr == build_ip(j, make_octet(k)))
				return true;
		}
	}

	return false;
}

function crosscheck_ip()
{
	var ipadr = str_to_int(id("ipaddress").lastChild.value);
	var subnet = str_to_int(id("subnet").lastChild.value);
	var host  = ~subnet;
	
	if((ipadr & host) == 0 || (ipadr & host) == host)
		return false;
	else 
		return true;
}

function test_subnet()
{
	var subnet = str_to_int(id("subnet").lastChild.value);
	var host  = ~subnet;
	
	if( (host & (subnet & (host+1))) != 0 || (subnet & 3) != 0)
		return false;
	else 
		return true;
}

function forbidden_ip(ip_addr)
{
	if( ip_addr == "255.255.255.255" )
		return true;
	return false;
}

function str_to_int(ip_addr)
{
	var first=0, last=0;
	var octet=0, dots=0;
	var addr = 0;

	for(var i=0;i<4;i++) 
	{
		last=ip_addr.indexOf('.',first+1);
		if(last==-1) {
			octet = parseInt(ip_addr.substring(first));
		}
		else {
			octet = parseInt(ip_addr.substring(first,last));
			dots++;
		}
		addr <<= 8;
		addr += octet;
		first=last+1;
	}
	return addr;
}

function decToHexStr(number)
{
	if (number < 0)
	{
		number = 0xFFFFFFFF + number + 1;
	}

	return number.toString(16).toUpperCase();
}

function get_resp()
{
	return confirm('All settings on this page will be restored to factory defaults and applied. Continue?');
}

function checkKey(e)
{
     var key;     
     if(window.event) {
          key = window.event.keyCode; //IE
	}
	else {
          key = e.which; //firefox     
	}
	
	return (key != 13);
}

function zero_ip(h) {
	if(h.value == "0") 
		h.value = "0.0.0.0";
}

function check_pending(data) {
    msg_reset_if_pending(data);
    }

function get_pending() {
	makeRequest(nc("pending.cgi"), null);
}


function msg_reset_if_pending (pending) {
    if (pending <= 0)
        return;

    id("message").className = "reset";
    id("message").innerHTML = 
    '<table cellspacing="0" border="0">'
    +'<tr>'
    +'<td class="reset_msg">Pending changes will not take effect'
    +' until after IED is reset.</td>'
    +'<td class="reset_btn">'
    +'<form action="http:reboot.cgi\" method="POST" name="rstform" id="rstform">'
    +'<input type="submit" name="Reset" value="Reset"/>'
    +'</form>'
    +'</td>'
    +'</tr>'
    +'</table>';
    }
