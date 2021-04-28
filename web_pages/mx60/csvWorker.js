var firstPass;
var pos;
var nRec;
var totRec;
var to;
var http_request;

onmessage = function(e)
	{
	if(e.data[0] == "abort")
		{
		http_request.abort();
		return;
		}
	var isRecRange = e.data[1];
	var startDate = e.data[2];
	var endDate = e.data[3];

	var parameters = null;
	var url = 'get_csv.cgi';
    
    if(isRecRange)
        parameters = "&start="+startDate.valueOf()+"&end="+endDate.valueOf();
	
	nRec = 0;
	firstPass = true;
	pos = 0;

	if (XMLHttpRequest) { // Mozilla, Safari,...
		http_request = new XMLHttpRequest();
		if (http_request.overrideMimeType) {
		}
	} else if (ActiveXObject) { // IE
		try {
			http_request = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try {
				http_request = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (e) {}
		}
	}

	if (!http_request)
	 alert('Cannot create XMLHttpRequest object');

	http_request.onreadystatechange = function() 
		{
		if (http_request.readyState == 4) 
			{
			if (http_request.status == 200) 
				postMessage(["http_request", http_request.responseText]);
	    	}
		};
	
	http_request.addEventListener("progress", handleProgress, false);
	http_request.addEventListener('load', handleLoadComplete, false);
	
	if(parameters == null)
		{
        http_request.open('GET', url, true);
        http_request.send(null);
		}
	else
		{
		http_request.open('POST', url, true);
		http_request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		http_request.send(parameters);
		}	
	to = setTimeout("handleTimeout()", 20000);
	}

function handleProgress(event) 
{
	var newpos;
	
    if (event.lengthComputable) {
        var percentComplete = event.loaded / event.total;
        postMessage(["progress", percentComplete]);
    } 
    else {
        // Unable to compute progress information since the total size is unknown
        if(firstPass == true)
        {
        	var start;

        	if( (start = event.target.response.indexOf("nRange")) == -1 )
        		{
        		if( (start = event.target.response.indexOf("nRec")) == -1 )
        			return;
        		}
        		
        	var str = event.target.response.slice(start);
        	totRec = Number(str.slice(str.indexOf(":")+2, str.indexOf(",")-1));
        	firstPass = false;
        }
        else
		{
        	var oldpos = pos;
        	while( (newpos = event.target.response.indexOf("Measurements", oldpos)) >= 0)
        	{
        		nRec++;
        		oldpos = newpos+1;
        	}
        	var percentComplete =  Math.round(100 * nRec / totRec);
        	postMessage(["progress", percentComplete]);
        	pos = oldpos;
		}
    }
    clearTimeout(to);
    if(percentComplete < 100)
    	to = setTimeout("handleTimeout()", 20000);
	}
	
function handleLoadComplete(evt) 
{
	clearTimeout(to);
	postMessage(["done"]);
}

function handleTimeout(evt) 
{
	postMessage(["timeout"]);
}
