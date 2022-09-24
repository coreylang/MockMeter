"strict mode"   // new in ES5
let startUpload_to = null;
let upload_retrigger = 60000;

function startUpload(){
    if (startUpload_to) {
        clearTimeout(startUpload_to);
        startUpload_to = null;
    }
    id('f1_upload_process').style.display = 'block';
    id('f1_upload_form').style.visibility = 'hidden';
    id("upbox").style.backgroundColor = "#ffffff";
    return true;
    }

function stopUpload(success, fname){
    let msg;
    let str;
    let msgBox;
    
    msgBox = id('upb_msg');

    if (startUpload_to){
        clearTimeout(startUpload_to);
        startUpload_to = null;
        }
    
    if (success == 1){
        switch (fname) {
        case "/serCollection":
            id("upbox").style.backgroundColor = "#e8fee4";
            msg = 'TUC upload success<br>Please save protocol page changes also';
            id("tucNext").style.visibility = 'visible';
            id("back_btn").style.visibility = 'hidden';
            msg_reset_if_pending(1);
            break;
        case "/fw_upload":
            id("upbox").style.backgroundColor = "#e8fee4";
            msg = 'Firmware upload OK.  Reprogramming flash.<br>'
                + 'Page will reload in 60 seconds.';
            setTimeout(function(){window.location.reload("index.html");},60000);
            console.log("redirect timeout set");
            break;
        case "/cfg_upload":
            id("upbox").style.backgroundColor = "#e8fee4";
            msg = 'Configuration upload success';
            msg_reset_if_pending(1);
            break;
        case "/cid_upload":
            id("done").style.visibility = "visible";
            id("write_process").style.visibility = "visible";           
            startUpload_to = setTimeout(function(){stopUpload(4);}, 60000);
            id("write2flash").submit();
            break;
        case "/trendrec_submit":            
            id("progress").value = 100;
            id("done").style.visibility = "visible";
            id("write2flash").style.visibility = "visible";
            startUpload_to = setTimeout(function(){stopUpload(4);}, 90000);
            id("write2flash").submit();
            break;
        default:
            msg = 'File upload success!';
            id("upbox").style.backgroundColor = "#e8fee4";
        msg_reset_if_pending(1);
            }
        }
    else if (success == 2){
        id("upbox").style.backgroundColor = "#fcc";
        msg = 'Error during file upload';
        msg_reset_if_pending(1);
        }
    else if (success == 3) {
        id("upbox").style.backgroundColor = "#fcc";
        msg = 'Invalid file';
        }
    else if (success == 4){     
        id("upbox").style.backgroundColor = "#fcc";
        msg = 'Upload timed out';
        msg_reset_if_pending(1);
        }
    else if (success == 5){
        id("upbox").style.backgroundColor = "#fcc";
        msg = 'File too large';
        msg_reset_if_pending(1);
        }
    else {
        id("upbox").style.backgroundColor = "#fcc";
         msg = 'Error during file upload';
        }
      
    if (fname != "/cid_upload" && fname != "/trendrec_submit") {
        id('f1_upload_process').style.display = 'none';
        msgBox.innerHTML = '<span class="emsg">'+ msg +'</span><br>';
    id('f1_upload_form').style.visibility = 'visible';
        if(id('demo_btn') != undefined)
            id("demo_btn").style.display = "block";
    }

    setupProgress();

    return true;   
    }

function startWrite()
{
    if (startUpload_to) {
        clearTimeout(startUpload_to);
        startUpload_to = null;
    }
    id('write_process').style.visibility = "visible";
    id('upb_msg').innerHTML = '<br>';
    startUpload_to = setTimeout(function(){endWrite(4);}, 60000);
}

function endWrite(success)
{
    if (startUpload_to){
        clearTimeout(startUpload_to);
        startUpload_to = null;
        }

    id('f1_upload_process').style.display = 'none';
    id('f1_upload_form').style.visibility = 'visible';
    id('write_process').style.visibility = "hidden";

    if (success == 1){
        msg = '<b>File stored successfully.</b>';
        id("upbox").style.backgroundColor = "#e8fee4";
        msg_reset_if_pending(1);
        }
    else if (success == 4){
        msg = 'Write timed out';
        id("upbox").style.backgroundColor = '#fcc';
        }
    else {
        msg = 'Write FAILED.';
        id("upbox").style.backgroundColor = '#fcc';
        }

    id('upb_msg').innerHTML = msg;
    }
    
function fileupload_status_clear() {
    id("upbox").style.backgroundColor = "#ffffff";
    }
    
function uploadFile(url) {
    let err;
    if(id('myfile').value == "")
        return false;
    id('jbtn').style.visibility = 'hidden';
    id('progress').value = 0;
    startUpload();

    err = verifyFileType();
    if(err != 1) {
        stopUpload(err,url);
        return;
    }

    let fd = new FormData();
    fd.append(id('myfile').name, document.getElementById('myfile').files[0]);
    let xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgress, false);
    xhr.addEventListener("load", uploadComplete, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);
    xhr.open("POST", url);
    xhr.send(fd);
}

function verifyFileType() {
    let fname = id('myfile').value.toLowerCase();
    let ftype = fname.substr(fname.lastIndexOf('.'));
    let atype = id('myfile').accept.split(",");
    let fsize = id('myfile').files[0].size;
    let max_size = Number(id('myfile').max);
    
    if(atype.indexOf(ftype) == -1)
        return 2;       // incorrect file type
    
    if(fsize > max_size)
        return 5;       // file too large

    return 1;           // file looks ok
}

function uploadProgress(evt) {
    if (evt.lengthComputable)
        {
        let percentComplete = Math.round(evt.loaded * 100 / evt.total);
        console.log("upload " + percentComplete + "% complete");
        id('progress').value = percentComplete;
        }
    else
        id('progressNumber').innerHTML = 'unable to compute';

    if (startUpload_to)
        clearTimeout(startUpload_to);
    startUpload_to = setTimeout(function(){stopUpload(4);}, upload_retrigger);
}

function uploadComplete(evt) {
    let p = evt.target.responseText.search("stopUpload");
    let f = evt.target.responseText.indexOf("\"");
    let l = evt.target.responseText.lastIndexOf("\"");
    stopUpload(evt.target.responseText.substr(p+11,1),
               evt.target.responseText.slice(f+1,l));
}

function uploadFailed(evt) {
    stopUpload(4);
}

function uploadCanceled(evt) {
    alert("The upload has been cancelled by the user or the browser dropped the connection.");
    stopUpload(2);
}

function setupProgress() {
    if (id("jbtn")
      && supportAjaxUploadWithProgress())
        id("jbtn").style.visibility = 'visible';
     else if (id("sbtn"))
        id("sbtn").style.visibility = 'visible';
    }


function supportAjaxUploadWithProgress() {
    return supportFileAPI()
      && supportAjaxUploadProgressEvents()
      && supportFormData();

    // Is the File API supported?
    function supportFileAPI() {
        let fi = document.createElement('INPUT');
        fi.type = 'file';
        return 'files' in fi;
    };
    // Are progress events supported?
    function supportAjaxUploadProgressEvents() {
        let xhr = new XMLHttpRequest();
        let supported =
          !! (xhr
              && ('upload' in xhr)
              && ('onprogress' in xhr.upload)
             );

        xhr = null;
        return supported;
    };
    // Is FormData supported?
    function supportFormData() {
        return !!window.FormData;
    }
}


// auth_check - load auth.cgi, then
//    call 'next' user fun to load an auth_checked file
//    since "/auth.cgi" now in auth_table[] (auth.c),
//      this will trigger browser password dialog if required
//          think "king's tester"
let _auth_list = [];
let _auth_idx;
let _auth_next;

function _auth_check_1 ()
    {
    if (window.XMLHttpRequest === undefined)
        return;

    if (_auth_list.length <= _auth_idx)
        {
        //console.log ("running %s", _auth_next);
        _auth_next ();
        }
    else
        {
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function ()
            {
            //console.log ("readyState = %i", this.readyState);
            if (this.readyState == 4 && this.status == 200)
                setTimeout(_auth_check_1, 0);
            }
        xhr.open("GET", _auth_list[_auth_idx], true); // async file fetch
        xhr.send(null);
        //console.log ("fetching %s", _auth_list[_auth_idx]);
        ++_auth_idx;
        }
    }


function auth_check (next_fun)
    {
    _auth_next = next_fun;

    _auth_idx = 0;

    _auth_list = [
        "auth.cgi"
        ];

    _auth_check_1 ();
    }
