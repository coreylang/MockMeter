var pg = {};

pg.hdr = '<div id="Header"><div id="Left">' +
	'<a href="/"><img src="header_logo.png"></a>' +
	'</div><div id="Right"></div></div>' +
    '<div id="Navigation">' +
		'<ul id="mainNav">' +
			'<li><a href="index.html"><span>Home</span></a></li>' +
		/*	'<li><a href="data.html"><span>Data</span></a></li>' +  */
			'<li><a href="settings.html"><span>Settings</span></a></li>' +
			'<li><a href="status.html"><span>Status</span></a></li>' +
			'<li><a href="contact.html"><span>Contact</span></a></li>' +
		'</ul>' +
		'<div style="text-align:right"><input id="builtinctrl" type="checkbox"><label for="builtinctrl">Show built-in settings</label></div>' +
		'<div id="printNice" style="display:none; text-align:right" onclick="print();"><a href="#">printer friendly</a></div>' +
		'<div id="logout" style="display:none; text-align:right" ><a href="/logout.cgi">Log Out</a></div>' +
	'</div>';

pg.ftr = 'Copyright &copy; 2020 Bitronics, LLC. All rights reserved.';

pg.contact = '<h2>Bitronics, LLC</h2>' +
	'<br>' +
	'261 Brodhead Rd<br>' +
	'Bethlehem, PA 18017<br>' +
	'USA<br>' +
	'+1.610.997.5100<br>' +
	'<a href="mailto:bitronics@novatechweb.com">bitronics@novatechweb.com</a><br>' +
	'<br>' +
	'<a href="http://www.novatechweb.com/bitronics" target="_blank">http://www.novatechweb.com/bitronics</a>';

function builtin_filter_enabled() {
	return (sessionStorage.getItem('builtinstate') != 'true')
}

function apply_builtin_filter() {
	for (x of document.querySelectorAll('.builtinitem')) {
		if (builtin_filter_enabled()) {
			x.setAttribute('saved_style', x.style.display)
			x.style.display = 'none'
		} else {
			if (x.hasAttribute('saved_style')) x.style.display = x.getAttribute('saved_style')
		}
	}
}

function populate(actv)
{
	id("Content").innerHTML = pg.hdr.replace(actv, actv+'\" class=\"active');
	id("footer").innerHTML = pg.ftr;

	var builtinctrl = document.querySelector('input[id="builtinctrl"]');
	var builtinstate = sessionStorage.getItem('builtinstate');
	
	builtinctrl.checked = (builtinstate == 'true')
	builtinctrl.addEventListener('change', ()=> {
		sessionStorage.setItem('builtinstate', builtinctrl.checked)
		apply_builtin_filter();
	})
	apply_builtin_filter();
}

function put_info(lbl, data) {
	id(lbl).innerHTML = data;
}