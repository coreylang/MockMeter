var startUpload_to = null;

function startUpload(){
    if (startUpload_to)
        clearTimeout(startUpload_to);
    id('f1_upload_process').style.visibility = 'visible';
    id('f1_upload_form').style.visibility = 'hidden';
    id("upbox").style.backgroundColor = "#ffffff";
    startUpload_to = setTimeout(function(){stopUpload(4);}, 120000);
    return true;
    }

function stopUpload(success, fname){
    var msg;
    var str;

	if (startUpload_to){
        clearTimeout(startUpload_to);
        startUpload_to = null;
        }
	
    id("upbox").style.backgroundColor = "#fcc"; // default bkgd

    if (success == 1){
        id("upbox").style.backgroundColor = "#e8fee4";
        if (fname == "/serCollection") {
            msg = 'msg">TUC upload success<br>Please save protocol page changes also';
            id("tucNext").style.visibility = 'visible';
			id("back_btn").style.visibility = 'hidden';
            }
        else if (fname == "/fw_upload")
            msg = 'msg">Firmware upload success';
        else if (fname == "/cfg")
            msg = 'msg">Configuration upload success';
        else
            msg = 'msg">File upload success';
            
        msg_reset_if_pending(1);
        }
    else if (success == 2){
        msg = 'emsg">Error during file upload';
        msg_reset_if_pending(1);
        }
    else if (success == 3) {
        msg = 'emsg">Invalid file';
        }
    else if (success == 4){     
        msg = 'emsg">Upload timed out';
        msg_reset_if_pending(1);
        }
    else
         msg = 'emsg">Error during file upload';
      

    id('f1_upload_process').style.visibility = 'hidden';

    // remove any html preceding the optional "<label>File:<input"
    fileupload_status_set(msg);
    id('f1_upload_form').style.visibility = 'visible';

    return true;   
    }

function fileupload_status_set(msg) {
    var idx;
    var str;

    str = id('f1_upload_form').innerHTML;

    if ((idx = str.search(/<label>File:<input/i)) == -1)
        str = "";
    else
        str = str.substring(idx);

    id('f1_upload_form').innerHTML = '<span class="'+ msg +'</span><br/><br/>'
      + str;
    }
    
function fileupload_status_clear() {
    id("upbox").style.backgroundColor = "#ffffff";
    fileupload_status_set("");
    }

function loadMBIndices(request)
	{
	eval (request.responseText);    // JSON sets mbOrder
    // ord = filterOrd(desCollection (mbOrder), filterCat(desCollection(mbCat16)));
    ord = desCollection(mbOrder);
	populate_table();
	}
	
function loadMBFail() {alert("can't load Modbus register set");}


function loadDNPIndices(request)
	{
	eval (request.responseText);    // JSON sets mbOrder
    // ord = filterOrd(desCollection (dnpOrder),  filterCat(desCollection(dnpCatalog)));
    ord = desCollection(dnpOrder);
	populate_table();
	}
	
	
function loadDNPFail() {alert("can't load DNP register set");}


function getDbList(protocol, sesn_idx, ptype) 
	{

	if(protocol == "0") // Modbus
		{
		delete mbOrder;
		// populates mbOrder
		loadAsync ("mbOrder_" + ptype + ".js", loadMBIndices, loadMBFail);
		}
	else if(protocol == "1") // DNP
		{
		delete dnpOrder;
		// populates dnpOrder
		loadAsync ("dnpOrder_" + sesn_idx + ".js", loadDNPIndices, loadDNPFail);
		}
	
	}
